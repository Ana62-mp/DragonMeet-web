/** Local Supabase stand-in for development and demos without a Supabase project, Docker or internet.
 *
 * It runs the REAL migration and seed on an in-memory Postgres (scripts/local-db.ts) and answers the small part of
 * the Supabase HTTP API the app uses: Auth (password sign-in, refresh, user, logout) and PostgREST (select with
 * eq/neq/in/is filters and order, insert, upsert, update, delete, rpc). Every query runs as the signed-in student's
 * role, so Row Level Security behaves as in production. Data lives in memory: restarting resets it to the seed.
 *
 * Run: npm run dev:local   (starts this on :54321 and the Vite app pointed at it)
 * Every test account signs in with the password LOCAL_PASSWORD below. LOCAL ONLY: never deploy this.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { createLocalDb } from './local-db.ts';
import { people } from './seed-data.ts';

const PORT = Number(process.env.LOCAL_BACKEND_PORT ?? 54321);
export const LOCAL_PASSWORD = 'dragon123';
const TOKEN_TTL_S = 3600;

const local = await createLocalDb();
const { db } = local;

// PGlite has one connection: run requests one at a time so roles and settings never mix.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
};

// ---------- Auth ----------
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

function session(user: { id: string; email: string }) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_S;
  const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.local`;
  return { access_token, token_type: 'bearer', expires_in: TOKEN_TTL_S, expires_at: exp, refresh_token: `local.${user.id}`, user: userJson(user) };
}

const userJson = (u: { id: string; email: string }) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: new Date(0).toISOString(),
  app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date(0).toISOString(),
});

/** The user id inside a Bearer token, or null for the anon key / anything else. */
function userIdOf(req: IncomingMessage): string | null {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /i, '');
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof claims.sub === 'string' && claims.exp * 1000 > Date.now() ? claims.sub : null;
  } catch { return null; }
}

async function findUser(where: 'email' | 'id', value: string) {
  const { rows } = await db.query<{ id: string; email: string }>(`select id::text, email from auth.users where ${where} = $1`, [value]);
  return rows[0] ?? null;
}

async function auth(path: string, url: URL, req: IncomingMessage, body: Record<string, string>) {
  if (path === '/token' && url.searchParams.get('grant_type') === 'password') {
    const user = await findUser('email', String(body.email ?? '').trim().toLowerCase());
    if (!user || body.password !== LOCAL_PASSWORD) return [400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' }];
    return [200, session(user)];
  }
  if (path === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const user = await findUser('id', String(body.refresh_token ?? '').replace(/^local\./, ''));
    return user ? [200, session(user)] : [400, { error: 'invalid_grant', msg: 'Invalid Refresh Token' }];
  }
  if (path === '/user') {
    const id = userIdOf(req);
    const user = id && await findUser('id', id);
    return user ? [200, userJson(user)] : [401, { msg: 'invalid JWT', code: 'bad_jwt' }];
  }
  if (path === '/logout') return [204, null];
  return [404, { msg: `auth endpoint not emulated: ${path}` }];
}

// ---------- PostgREST ----------
const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (name: string) => {
  if (!IDENT.test(name)) throw Object.assign(new Error(`invalid identifier: ${name}`), { status: 400 });
  return `"${name}"`;
};
const columns = (select: string | null) => (!select || select === '*' ? '*' : select.split(',').map(c => ident(c.trim())).join(', '));
const RESERVED = new Set(['select', 'order', 'on_conflict', 'columns', 'limit', 'offset']);

function where(url: URL, params: unknown[]) {
  const parts: string[] = [];
  for (const [key, raw] of url.searchParams) {
    if (RESERVED.has(key)) continue;
    const [, op, value] = /^(eq|neq|in|is|gt|gte|lt|lte)\.(.*)$/s.exec(raw) ?? [];
    if (!op) throw Object.assign(new Error(`filter not emulated: ${key}=${raw}`), { status: 400 });
    const col = ident(key);
    if (op === 'in') {
      const items = value.replace(/^\(|\)$/g, '').split(',').filter(Boolean).map(v => v.replace(/^"|"$/g, ''));
      if (!items.length) { parts.push('false'); continue; }
      parts.push(`${col}::text in (${items.map(v => { params.push(v); return `$${params.length}`; }).join(', ')})`);
    } else if (op === 'is') {
      parts.push(`${col} is ${value === 'null' ? 'null' : value === 'true' ? 'true' : 'false'}`);
    } else {
      params.push(value);
      parts.push(`${col}::text ${{ eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op]} $${params.length}`);
    }
  }
  return parts.length ? ` where ${parts.join(' and ')}` : '';
}

const orderBy = (url: URL) => {
  const order = url.searchParams.get('order');
  if (!order) return '';
  return ' order by ' + order.split(',').map(o => {
    const [col, dir = 'asc', nulls] = o.split('.');
    return `${ident(col)} ${dir === 'desc' ? 'desc' : 'asc'}${nulls === 'nullsfirst' ? ' nulls first' : nulls === 'nullslast' ? ' nulls last' : ''}`;
  }).join(', ');
};

/** Wraps a row-returning statement so Postgres itself serializes the rows (dates and times as PostgREST does). */
const asJson = (statement: string) => `with r as (${statement}) select coalesce(json_agg(r), '[]'::json) as rows from r`;

async function rows(statement: string, params: unknown[]) {
  const { rows } = await db.query<{ rows: unknown[] }>(asJson(statement), params);
  return rows[0].rows;
}

const toParam = (v: unknown) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);

async function rest(method: string, path: string, url: URL, req: IncomingMessage, body: unknown) {
  const prefer = String(req.headers.prefer ?? '');
  const wantsOne = String(req.headers.accept ?? '').includes('vnd.pgrst.object');
  const returning = prefer.includes('return=representation');
  const params: unknown[] = [];

  const rpc = /^\/rpc\/([a-z_0-9]+)$/.exec(path);
  if (rpc) {
    const fn = rpc[1];
    const { rows: meta } = await db.query<{ retset: boolean; rettype: string }>(
      `select proretset as retset, prorettype::regtype::text as rettype from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [fn]);
    if (!meta.length) return [404, { code: 'PGRST202', message: `Could not find the function public.${fn}` }];
    const args = Object.entries((body ?? {}) as Record<string, unknown>).map(([k, v]) => { params.push(toParam(v)); return `${ident(k)} => $${params.length}`; }).join(', ');
    const call = `public.${ident(fn)}(${args})`;
    if (meta[0].retset || meta[0].rettype === 'record') return [200, await rows(`select * from ${call}`, params)];
    if (meta[0].rettype === 'void') { await db.query(`select ${call}`, params); return [204, null]; }
    const { rows: out } = await db.query<{ v: unknown }>(`select to_json(${call}) as v`, params);
    return [200, out[0].v];
  }

  const table = /^\/([a-z_0-9]+)$/.exec(path)?.[1];
  if (!table) return [404, { message: `not emulated: ${path}` }];
  const target = `public.${ident(table)}`;
  const select = columns(url.searchParams.get('select'));
  let result: unknown[];

  if (method === 'GET') {
    result = await rows(`select ${select} from ${target}${where(url, params)}${orderBy(url)}`, params);
  } else if (method === 'POST') {
    const list = (Array.isArray(body) ? body : [body]) as Record<string, unknown>[];
    const keys = [...new Set(list.flatMap(r => Object.keys(r)))];
    const values = list.map(r => `(${keys.map(k => (k in r ? (params.push(toParam(r[k])), `$${params.length}`) : 'default')).join(', ')})`).join(', ');
    const conflict = url.searchParams.get('on_conflict');
    const upsert = conflict && prefer.includes('resolution=merge-duplicates')
      ? ` on conflict (${conflict.split(',').map(ident).join(', ')}) do update set ${keys.filter(k => !conflict.split(',').includes(k)).map(k => `${ident(k)} = excluded.${ident(k)}`).join(', ')}`
      : conflict && prefer.includes('resolution=ignore-duplicates') ? ` on conflict (${conflict.split(',').map(ident).join(', ')}) do nothing` : '';
    result = await rows(`insert into ${target} (${keys.map(ident).join(', ')}) values ${values}${upsert} returning ${select}`, params);
  } else if (method === 'PATCH') {
    const set = Object.entries(body as Record<string, unknown>).map(([k, v]) => { params.push(toParam(v)); return `${ident(k)} = $${params.length}`; }).join(', ');
    result = await rows(`update ${target} set ${set}${where(url, params)} returning ${select}`, params);
  } else if (method === 'DELETE') {
    result = await rows(`delete from ${target}${where(url, params)} returning ${select}`, params);
  } else {
    return [405, { message: `method not emulated: ${method}` }];
  }

  if (wantsOne) {
    return result.length === 1 ? [200, result[0]]
      : [406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${result.length} rows` }];
  }
  if (method !== 'GET' && !returning) return [method === 'POST' ? 201 : 204, null];
  return [method === 'POST' ? 201 : 200, result];
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

function send(req: IncomingMessage, res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': req.headers.origin ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': String(req.headers['access-control-request-headers'] ?? '*'),
    'Access-Control-Expose-Headers': 'content-range, x-supabase-api-version',
    ...(payload === null ? {} : { 'Content-Type': 'application/json' }),
  });
  res.end(payload === null ? undefined : JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(req, res, 204, null);
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  try {
    const body = await readBody(req);
    const [status, payload] = await serial(async () => {
      if (url.pathname.startsWith('/auth/v1')) return auth(url.pathname.slice(8), url, req, body ?? {});
      if (url.pathname.startsWith('/rest/v1')) return local.as(userIdOf(req), () => rest(req.method ?? 'GET', url.pathname.slice(8), url, req, body));
      if (url.pathname === '/__reset' && req.method === 'POST') { await local.reseed(); return [204, null]; }
      return [404, { message: 'not found' }];
    }) as [number, unknown];
    if (status >= 400) console.warn(`${req.method} ${url.pathname}${url.search} -> ${status}`, JSON.stringify(payload));
    send(req, res, status, payload);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number; detail?: string; hint?: string };
    const status = e.status ?? (/permission denied|row-level security/i.test(e.message ?? '') ? 403 : 400);
    console.warn(`${req.method} ${url.pathname}${url.search} -> ${status} ${e.message}`);
    send(req, res, status, { code: e.code ?? 'P0001', message: e.message ?? 'error', details: e.detail ?? null, hint: e.hint ?? null });
  }
});

server.listen(PORT, () => {
  console.log(`\nDragonMeet backend local en http://localhost:${PORT} (Postgres en memoria con RLS real)`);
  console.log(`Contraseña de TODAS las cuentas de prueba: ${LOCAL_PASSWORD}`);
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
