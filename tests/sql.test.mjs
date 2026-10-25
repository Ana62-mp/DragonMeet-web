import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { people } from '../scripts/seed-data.ts';

/** Runs the real migration and seed on an in-memory Postgres with a minimal Supabase stub
 * (auth.users, auth.uid(), anon/authenticated roles) and checks the privacy rules at the database level.
 */
const db = new PGlite({ extensions: { unaccent } });
const ids = {};
const sql = file => readFileSync(new URL(`../supabase/${file}`, import.meta.url), 'utf8');

async function as(key, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${ids[key]}', false)`);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const rows = async (query, params) => (await db.query(query, params)).rows;
const denied = async promise => { await assert.rejects(promise, /permission denied|row-level security|violates|superpone|Solicitud|check/i); };

before(async () => {
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
  for (const p of people) {
    const meta = JSON.stringify({ full_name: p.fullName, first_name: p.firstName, banner_code: p.banner, career: p.career, semester: p.semester, avatar_color: p.color });
    const [{ id }] = await rows('insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id', [p.email, meta]);
    ids[p.key] = id;
  }
  await db.exec(sql('seed.sql'));
});

test('migration is re-runnable and the trigger created one profile per auth user', async () => {
  await db.exec(sql('migrations/001_schema.sql'));
  assert.equal((await rows('select count(*)::int n from public.profiles'))[0].n, people.length);
});

test('anon has no access to any table', async () => {
  await db.exec('set role anon');
  try {
    for (const table of ['profiles', 'schedule_blocks', 'friendships', 'friend_permissions', 'campus_zones'])
      await denied(db.query(`select * from public.${table}`));
    await denied(db.query('select * from public.search_users($1)', ['ana']));
  } finally { await db.exec('reset role'); }
});

test('a student reads only their own profile and classes; never email/banner of others', async () => {
  await as('ana', async () => {
    assert.deepEqual((await rows('select id from public.profiles')).map(r => r.id), [ids.ana]);
    assert.equal((await rows('select distinct user_id from public.schedule_blocks')).length, 1);
    assert.equal((await rows('select * from public.schedule_blocks where user_id = $1', [ids.vale])).length, 0);
  });
});

test('clients cannot rewrite identity columns or other students rows', async () => {
  await as('ana', async () => {
    await denied(db.query(`update public.profiles set email = 'x@y.z' where id = '${ids.ana}'`));
    await denied(db.query(`update public.profiles set banner_code = '00000000' where id = '${ids.ana}'`));
    assert.equal((await db.query(`update public.profiles set first_name = 'Hack' where id = '${ids.vale}'`)).affectedRows, 0);
    await denied(db.query(`insert into public.schedule_blocks (user_id, course_code, course_name, day_of_week, start_time, end_time, building)
      values ('${ids.vale}', 'X', 'Y', 1, '12:00', '13:00', 'Newton')`));
  });
});

test('friends see classes only with accepted friendship and permissions from BOTH sides', async () => {
  const visible = async who => as(who, () => rows('select distinct owner_id from public.get_visible_schedules()'));
  const owners = (await visible('ana')).map(r => r.owner_id);
  assert.ok(owners.includes(ids.vale) && owners.includes(ids.paulo) && owners.includes(ids.camila) && owners.includes(ids.daniela));
  assert.equal(owners.includes(ids.isabella), false, 'Ana did not grant Isabella; mutual rule');
  assert.equal(owners.includes(ids.sebastian), false, 'pending request grants nothing');
  assert.equal((await visible('diego').catch(() => [])).length, 0);
});

test('BUSY_ONLY masks name and building on the server; code and room are never returned', async () => {
  await as('ana', async () => {
    const camila = await rows('select * from public.get_visible_schedules() where owner_id = $1', [ids.camila]);
    assert.ok(camila.length > 0);
    for (const r of camila) assert.deepEqual([r.busy_only, r.course_name, r.building], [true, null, null]);
    const vale = await rows('select * from public.get_visible_schedules() where owner_id = $1', [ids.vale]);
    assert.ok(vale.every(r => r.busy_only === false && r.course_name && r.building));
    assert.equal('course_code' in vale[0] || 'room' in vale[0], false);
  });
});

test('revoking a permission hides the schedule immediately', async () => {
  await as('vale', () => db.query(`update public.friend_permissions set share_schedule = false where owner_id = '${ids.vale}' and friend_id = '${ids.ana}'`));
  await as('ana', async () => assert.equal((await rows('select 1 from public.get_visible_schedules() where owner_id = $1', [ids.vale])).length, 0));
  await as('vale', () => db.query(`update public.friend_permissions set share_schedule = true where owner_id = '${ids.vale}' and friend_id = '${ids.ana}'`));
  await as('ana', async () => assert.ok((await rows('select 1 from public.get_visible_schedules() where owner_id = $1', [ids.vale])).length > 0));
});

test('zones: visible only with location consent both ways and while on campus', async () => {
  await as('ana', async () => {
    const zones = Object.fromEntries((await rows('select * from public.get_visible_friend_zones()')).map(r => [r.friend_id, r.zone_id]));
    assert.equal(zones[ids.vale], 'biblioteca');
    assert.equal(zones[ids.paulo], 'da-vinci');
    assert.equal(zones[ids.camila], 'galileo');
    assert.equal(zones[ids.daniela], undefined, 'location not shared');
  });
  await as('vale', () => db.query(`update public.profiles set on_campus = false where id = '${ids.vale}'`));
  await as('ana', async () => assert.equal((await rows('select 1 from public.get_visible_friend_zones() where friend_id = $1', [ids.vale])).length, 0));
  await as('vale', async () => {
    const [me] = await rows('select current_zone, current_zone_updated_at from public.profiles');
    assert.deepEqual([me.current_zone, me.current_zone_updated_at], [null, null], 'turning off clears the zone');
    await db.query(`update public.profiles set on_campus = true, current_zone = 'hayek' where id = '${ids.vale}'`);
    assert.equal((await rows('select current_zone from public.profiles'))[0].current_zone, 'hayek');
    await db.query(`update public.profiles set on_campus = false, current_zone = 'hayek' where id = '${ids.vale}'`);
    assert.equal((await rows('select current_zone from public.profiles'))[0].current_zone, null, 'off wins over a stale zone');
  });
});

test('search: accent/case-insensitive by name, banner code and email; no private fields', async () => {
  await as('ana', async () => {
    assert.equal((await rows(`select * from public.search_users('PEREZ')`))[0].full_name, 'Paulo Pérez');
    assert.equal((await rows(`select * from public.search_users('00990020')`)).length, 0);
    assert.equal((await rows(`select * from public.search_users('0099000')`)).length > 0, true);
    assert.equal((await rows(`select * from public.search_users('jvparedes@')`)).length, 1);
    assert.equal((await rows(`select * from public.search_users('a')`)).length, 0, 'minimum 2 characters');
    assert.equal((await rows(`select * from public.search_users('moposita')`)).length, 0, 'never returns the caller');
    const [row] = await rows(`select * from public.search_users('camila')`);
    assert.deepEqual(Object.keys(row).sort(), ['avatar_color', 'banner_code', 'career', 'first_name', 'full_name', 'id', 'semester']);
  });
});

test('friend requests: send, re-send after reject, only the addressee accepts, remove revokes everything', async () => {
  const send = (who, to) => as(who, async () => (await rows('select public.send_friend_request($1) r', [ids[to]]))[0].r);
  const setStatus = (who, status) => as(who, async () => (await db.query(`update public.friendships set status = '${status}' where requester_id = '${ids.nicolas}'`)).affectedRows);
  assert.equal(await send('nicolas', 'ana'), 'pending');
  assert.equal(await send('nicolas', 'ana'), 'pending', 'idempotent');
  assert.equal(await setStatus('nicolas', 'accepted'), 0, 'the requester cannot accept their own request');
  assert.equal(await setStatus('ana', 'rejected'), 1);
  assert.equal(await send('nicolas', 'ana'), 'pending', 're-sending after a rejection starts over');
  assert.equal(await setStatus('ana', 'accepted'), 1);
  await as('ana', async () => {
    await db.query('insert into public.friend_permissions (owner_id, friend_id, share_schedule) values ($1, $2, true)', [ids.ana, ids.nicolas]);
    await denied(db.query('insert into public.friend_permissions (owner_id, friend_id) values ($1, $2)', [ids.ana, ids.sebastian]));
    await db.query('select public.remove_friendship($1)', [ids.nicolas]);
    assert.equal((await rows('select 1 from public.friend_permissions where friend_id = $1', [ids.nicolas])).length, 0);
    assert.equal((await rows('select 1 from public.friendships where requester_id = $1', [ids.nicolas])).length, 0);
  });
});

test('classes: valid range, academic buildings only, no overlaps', async () => {
  await as('ana', async () => {
    const insert = (day, start, end, building = 'Newton') => db.query(
      `insert into public.schedule_blocks (user_id, course_code, course_name, day_of_week, start_time, end_time, building) values ('${ids.ana}', 'T', 'T', ${day}, '${start}', '${end}', '${building}')`);
    await insert(2, '12:10', '13:00');
    await denied(insert(2, '12:30', '14:00'));
    await insert(2, '13:00', '14:00');
    await denied(insert(2, '19:00', '20:30'));
    await denied(insert(2, '06:00', '07:30'));
    await denied(insert(1, '15:00', '16:00', 'Cuadrángulos'));
    await denied(insert(6, '10:00', '11:00'));
  });
});

test('invitations: only the creator invites, only friends; participants answer for themselves', async () => {
  await as('ana', async () => {
    const [{ id }] = await rows(`insert into public.meet_invites (creator_id, title, event_date, start_time, end_time, zone_id) values ('${ids.ana}', 'Almuerzo', '2026-11-02', '11:30', '13:00', 'cuadrangulos') returning id`);
    await db.query('insert into public.meet_invite_participants (invite_id, student_id) values ($1, $2)', [id, ids.vale]);
    await denied(db.query('insert into public.meet_invite_participants (invite_id, student_id) values ($1, $2)', [id, ids.sebastian]));
    ids.invite = id;
  });
  await as('vale', async () => {
    assert.equal((await rows('select 1 from public.meet_invites')).length, 1);
    assert.equal((await db.query(`update public.meet_invite_participants set response = 'accepted' where student_id = '${ids.vale}'`)).affectedRows, 1);
  });
  await as('paulo', async () => assert.equal((await rows('select 1 from public.meet_invites')).length, 0));
});
