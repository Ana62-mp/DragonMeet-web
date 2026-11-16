/** An in-memory Postgres (PGlite) that runs the REAL migration and seed with a minimal Supabase stub
 * (auth.users, auth.uid(), anon/authenticated roles). Row Level Security is enforced exactly as in Supabase.
 * Used by the SQL tests and by the local backend (npm run dev:local). Never imported by the frontend.
 */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { people } from './seed-data.ts';

const sql = (file: string) => readFileSync(new URL(`../supabase/${file}`, import.meta.url), 'utf8');

export type LocalDb = Awaited<ReturnType<typeof createLocalDb>>;

export async function createLocalDb() {
  const db = new PGlite({ extensions: { unaccent } });
  const ids: Record<string, string> = {};
  await db.exec(`
    create schema auth; create schema extensions;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb);
    create role anon nologin; create role authenticated nologin;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, extensions, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create extension unaccent with schema extensions;
    grant execute on all functions in schema extensions to authenticated;`);
  await db.exec(sql('migrations/001_schema.sql'));
  const users = people.map(p => ({
    email: p.email,
    meta: { full_name: p.fullName, first_name: p.firstName, banner_code: p.banner, career: p.career, semester: p.semester, avatar_color: p.color },
  }));
  const { rows: created } = await db.query<{ id: string; email: string }>(
    `insert into auth.users (email, raw_user_meta_data)
     select u->>'email', u->'meta' from json_array_elements($1::json) with ordinality as t(u, n) order by n
     returning id::text, email`, [JSON.stringify(users)]);
  for (const p of people) ids[p.key] = created.find(r => r.email === p.email)!.id;
  await db.exec(sql('seed.sql'));

  /** Runs `fn` as the given auth user (or anon when null), the way PostgREST does with a JWT. */
  async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
    await db.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
    try { return await fn(); } finally { await db.exec('reset role'); }
  }

  return { db, ids, as, migrate: () => db.exec(sql('migrations/001_schema.sql')), reseed: () => db.exec(sql('seed.sql')) };
}
