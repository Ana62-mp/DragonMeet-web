/** Local Supabase stand-in for development and demos without a Supabase project, Docker or internet.
 *
 * It runs the REAL migration and seed on an in-memory Postgres (scripts/local-db.ts) and answers the small part of
 * the Supabase HTTP API the app uses: Auth (password sign-in, refresh, user, logout) and PostgREST (select with
 * eq/neq/in/is filters and order, insert, upsert, update, delete, rpc). Every query runs as the signed-in student's
 * role, so Row Level Security behaves as in production. Data lives in memory: restarting resets it to the seed.
 *
 * Run: npm run dev:local   (starts this on :54321 and the Vite app pointed at it)
 * LOCAL ONLY: never deploy this. It listens on this machine and answers only browser pages served from localhost.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { createLocalDb } from './local-db.ts';
import { people } from './seed-data.ts';

const PORT = Number(process.env.LOCAL_BACKEND_PORT ?? 54321);
/** The fake test accounts share one PUBLIC demo sign-in, documented in the README (override with LOCAL_DEMO_LOGIN). */
const DEMO_LOGIN = process.env.LOCAL_DEMO_LOGIN ?? ['dragon', '123'].join('');
const TOKEN_TTL_S = 3600;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

type Reply = [number, unknown];
type Row = Record<string, unknown>;

const local = await createLocalDb();
const { db } = local;

// PGlite has one connection: run requests one at a time so roles and settings never mix.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
};

/** Text from a request, safe to print on one log line. */
const forLog = (text: string) => text.replace(/[\r\n\t]+/g, ' ').slice(0, 300);
const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

// ---------- Auth ----------
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

const userJson = (u: { id: string; email: string }) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: new Date(0).toISOString(),
  app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date(0).toISOString(),
});

function session(user: { id: string; email: string }) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_S;
  const claims = { sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp };
  const accessToken = [b64({ alg: 'HS256', typ: 'JWT' }), b64(claims), 'local'].join('.');
  return { access_token: accessToken, token_type: 'bearer', expires_in: TOKEN_TTL_S, expires_at: exp, refresh_token: `local.${user.id}`, user: userJson(user) };
}

/** The user id inside a Bearer token, or null for the anon key / anything else. */
function userIdOf(req: IncomingMessage): string | null {
  const payload = (req.headers.authorization ?? '').replace(/^Bearer /i, '').split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof claims.sub === 'string' && claims.exp * 1000 > Date.now() ? claims.sub : null;
  } catch { return null; }
}

async function findUser(column: 'email' | 'id', value: string) {
  const sql = column === 'email'
    ? 'select id::text, email from auth.users where email = $1'
    : 'select id::text, email from auth.users where id::text = $1';
  const { rows } = await db.query<{ id: string; email: string }>(sql, [value]);
  return rows[0] ?? null;
}

const BAD_LOGIN: Reply = [400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' }];

async function auth(path: string, url: URL, req: IncomingMessage, body: Row): Promise<Reply> {
  const grant = url.searchParams.get('grant_type');
  if (path === '/token' && grant === 'password') {
    const user = await findUser('email', String(body.email ?? '').trim().toLowerCase());
    return user && body.password === DEMO_LOGIN ? [200, session(user)] : BAD_LOGIN;
  }
  if (path === '/token' && grant === 'refresh_token') {
    const user = await findUser('id', String(body.refresh_token ?? '').replace(/^local\./, ''));
    return user ? [200, session(user)] : [400, { error: 'invalid_grant', msg: 'Invalid Refresh Token' }];
  }
  if (path === '/user') {
    const id = userIdOf(req);
    const user = id ? await findUser('id', id) : null;
    return user ? [200, userJson(user)] : [401, { msg: 'invalid JWT', code: 'bad_jwt' }];
  }
  if (path === '/logout') return [204, null];
  return [404, { msg: 'auth endpoint not emulated' }];
}

// ---------- PostgREST ----------
const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (name: string) => {
  if (!IDENT.test(name)) throw httpError(400, 'invalid identifier');
  return `"${name}"`;
};
const columns = (select: string | null) => (!select || select === '*' ? '*' : select.split(',').map(c => ident(c.trim())).join(', '));
const RESERVED = new Set(['select', 'order', 'on_conflict', 'columns', 'limit', 'offset']);
const COMPARE: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
const IS_VALUE: Record<string, string> = { null: 'null', true: 'true', false: 'false' };

/** Collects positional parameters ($1, $2 ...) for one statement. */
class Params {
  readonly values: unknown[] = [];
  add(value: unknown) {
    this.values.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : value);
    return `$${this.values.length}`;
  }
}

function condition(key: string, raw: string, params: Params) {
  const [, op, value] = /^(eq|neq|in|is|gt|gte|lt|lte)\.(.*)$/s.exec(raw) ?? [];
  if (!op) throw httpError(400, 'filter not emulated');
  const col = ident(key);
  if (op === 'is') return `${col} is ${IS_VALUE[value] ?? 'false'}`;
  if (op !== 'in') return `${col}::text ${COMPARE[op]} ${params.add(value)}`;
  const items = value.replace(/^\(|\)$/g, '').split(',').filter(Boolean).map(v => v.replace(/^"|"$/g, ''));
  return items.length ? `${col}::text in (${items.map(v => params.add(v)).join(', ')})` : 'false';
}

function where(url: URL, params: Params) {
  const parts = [...url.searchParams].filter(([key]) => !RESERVED.has(key)).map(([key, raw]) => condition(key, raw, params));
  return parts.length ? ` where ${parts.join(' and ')}` : '';
}

const NULLS: Record<string, string> = { nullsfirst: ' nulls first', nullslast: ' nulls last' };
function orderBy(url: URL) {
  const order = url.searchParams.get('order');
  if (!order) return '';
  const terms = order.split(',').map(term => {
    const [col, dir, nulls] = term.split('.');
    const direction = dir === 'desc' ? 'desc' : 'asc';
    return `${ident(col)} ${direction}${NULLS[nulls] ?? ''}`;
  });
  return ` order by ${terms.join(', ')}`;
}

/** Runs a row-returning statement and lets Postgres serialize the rows (dates and times as PostgREST does). */
async function jsonRows(statement: string, params: Params) {
  const { rows } = await db.query<{ rows: unknown[] }>(`with r as (${statement}) select coalesce(json_agg(r), '[]'::json) as rows from r`, params.values);
  return rows[0].rows;
}

async function callRpc(fn: string, body: unknown): Promise<Reply> {
  const { rows: meta } = await db.query<{ retset: boolean; rettype: string }>(
    `select proretset as retset, prorettype::regtype::text as rettype from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [fn]);
  if (!meta.length) return [404, { code: 'PGRST202', message: 'Could not find the function' }];
  const params = new Params();
  const args = Object.entries((body ?? {}) as Row).map(([k, v]) => `${ident(k)} => ${params.add(v)}`).join(', ');
  const call = `public.${ident(fn)}(${args})`;
  if (meta[0].retset || meta[0].rettype === 'record') return [200, await jsonRows(`select * from ${call}`, params)];
  if (meta[0].rettype === 'void') {
    await db.query(`select ${call}`, params.values);
    return [204, null];
  }
  const { rows } = await db.query<{ v: unknown }>(`select to_json(${call}) as v`, params.values);
  return [200, rows[0].v];
}

function onConflict(url: URL, prefer: string, keys: string[]) {
  const conflict = url.searchParams.get('on_conflict');
  if (!conflict) return '';
  const target = conflict.split(',');
  const targetSql = target.map(ident).join(', ');
  if (prefer.includes('resolution=ignore-duplicates')) return ` on conflict (${targetSql}) do nothing`;
  if (!prefer.includes('resolution=merge-duplicates')) return '';
  const updates = keys.filter(k => !target.includes(k)).map(k => `${ident(k)} = excluded.${ident(k)}`);
  return ` on conflict (${targetSql}) do update set ${updates.join(', ')}`;
}

function insertSql(target: string, url: URL, prefer: string, body: unknown, params: Params) {
  const list = (Array.isArray(body) ? body : [body]) as Row[];
  const keys = [...new Set(list.flatMap(r => Object.keys(r)))];
  const tuple = (r: Row) => keys.map(k => (k in r ? params.add(r[k]) : 'default')).join(', ');
  const values = list.map(r => `(${tuple(r)})`).join(', ');
  return `insert into ${target} (${keys.map(ident).join(', ')}) values ${values}${onConflict(url, prefer, keys)}`;
}

function tableSql(method: string, target: string, url: URL, prefer: string, body: unknown, params: Params) {
  const select = columns(url.searchParams.get('select'));
  switch (method) {
    case 'GET': return `select ${select} from ${target}${where(url, params)}${orderBy(url)}`;
    case 'POST': return `${insertSql(target, url, prefer, body, params)} returning ${select}`;
    case 'PATCH': {
      const set = Object.entries(body as Row).map(([k, v]) => `${ident(k)} = ${params.add(v)}`).join(', ');
      return `update ${target} set ${set}${where(url, params)} returning ${select}`;
    }
    case 'DELETE': return `delete from ${target}${where(url, params)} returning ${select}`;
    default: throw httpError(405, 'method not emulated');
  }
}

/** Shapes rows the way supabase-js expects: one object for .single(), nothing when no representation was asked. */
function shape(method: string, req: IncomingMessage, prefer: string, result: unknown[]): Reply {
  if (String(req.headers.accept ?? '').includes('vnd.pgrst.object')) {
    if (result.length === 1) return [200, result[0]];
    return [406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${result.length} rows` }];
  }
  const created = method === 'POST';
  if (method !== 'GET' && !prefer.includes('return=representation')) return [created ? 201 : 204, null];
  return [created ? 201 : 200, result];
}

async function rest(method: string, path: string, url: URL, req: IncomingMessage, body: unknown): Promise<Reply> {
  const rpc = /^\/rpc\/([a-z_0-9]+)$/.exec(path);
  if (rpc) return callRpc(rpc[1], body);
  const table = /^\/([a-z_0-9]+)$/.exec(path)?.[1];
  if (!table) return [404, { message: 'not emulated' }];
  const prefer = String(req.headers.prefer ?? '');
  const params = new Params();
  const statement = tableSql(method, `public.${ident(table)}`, url, prefer, body, params);
  return shape(method, req, prefer, await jsonRows(statement, params));
}

// ---------- HTTP ----------
async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString();
  if (!text) return null;
  if (String(req.headers['content-type'] ?? '').includes('x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
  return JSON.parse(text);
}

const ALLOWED_HEADERS = 'authorization, apikey, content-type, prefer, accept, accept-profile, content-profile, x-client-info, x-supabase-api-version';

function send(req: IncomingMessage, res: ServerResponse, status: number, payload: unknown) {
  const origin = String(req.headers.origin ?? '');
  res.writeHead(status, {
    // Only pages served from this machine may call the local backend.
    ...(LOCAL_ORIGIN.test(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Expose-Headers': 'content-range, x-supabase-api-version',
    ...(payload === null ? {} : { 'Content-Type': 'application/json' }),
  });
  res.end(payload === null ? undefined : JSON.stringify(payload));
}

async function route(req: IncomingMessage, url: URL, body: unknown): Promise<Reply> {
  if (url.pathname.startsWith('/auth/v1')) return auth(url.pathname.slice(8), url, req, (body ?? {}) as Row);
  if (url.pathname.startsWith('/rest/v1')) return local.as(userIdOf(req), () => rest(req.method ?? 'GET', url.pathname.slice(8), url, req, body));
  if (url.pathname === '/__reset' && req.method === 'POST') {
    await local.reseed();
    return [204, null];
  }
  return [404, { message: 'not found' }];
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(req, res, 204, null);
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const label = forLog(`${req.method} ${url.pathname}`);
  try {
    const body = await readBody(req);
    const [status, payload] = await serial(() => route(req, url, body));
    if (status >= 400) console.warn(`${label} -> ${status}`);
    send(req, res, status, payload);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number; detail?: string; hint?: string };
    const denied = /permission denied|row-level security/i.test(e.message ?? '');
    const status = e.status ?? (denied ? 403 : 400);
    console.warn(`${label} -> ${status} ${forLog(e.message ?? '')}`);
    send(req, res, status, { code: e.code ?? 'P0001', message: e.message ?? 'error', details: e.detail ?? null, hint: e.hint ?? null });
  }
});

server.listen(PORT, 'localhost', () => {
  console.log(`\nDragonMeet backend local en http://localhost:${PORT} (Postgres en memoria con RLS real)`);
  console.log(`Clave de demo de TODAS las cuentas de prueba: ${DEMO_LOGIN}`);
  for (const p of people.slice(0, 3)) console.log(`  · ${p.fullName}: ${p.email}`);
  console.log('Los datos se reinician al cerrar.\n');
  if (process.argv.includes('--with-vite')) {
    const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], {
      stdio: 'inherit',
      env: { ...process.env, VITE_SUPABASE_URL: `http://localhost:${PORT}`, VITE_SUPABASE_ANON_KEY: 'local-anon-key' },
    });
    vite.on('exit', code => process.exit(code ?? 0));
  }
});
