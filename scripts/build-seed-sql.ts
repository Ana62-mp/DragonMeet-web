/** Generates supabase/seed.sql from scripts/seed-data.ts. Run: npm run seed:sql */
import { writeFileSync } from 'node:fs';
import { friendships, people, permissions, profileState, schedules } from './seed-data.ts';

const q = (value: string) => `'${value.replace(/'/g, "''")}'`;
const uid = (key: string) => `(select id from public.profiles where email = ${q(people.find(p => p.key === key)!.email)})`;

const statements = [
  `-- DragonMeet · datos de demostración (generado por scripts/build-seed-sql.ts; no lo edites a mano).
-- Orden: 1) migración 001_schema.sql  2) npm run seed:users  3) este archivo en el SQL Editor.
-- Solo contiene datos ficticios no sensibles; las contraseñas viven en .env.local, nunca aquí.
-- Es re-ejecutable: borra y vuelve a crear horarios, amistades y permisos de las cuentas sembradas.
-- Las zonas actuales expiran a las 4 h; vuelve a ejecutar este archivo para refrescarlas.
`,
  `do $$
begin
  if (select count(*) from public.profiles where email in (${people.map(p => q(p.email)).join(', ')})) < ${people.length} then
    raise exception 'Faltan perfiles: ejecuta primero "npm run seed:users".';
  end if;
end $$;
`,
  `create temp table if not exists seed_emails (email text primary key);
truncate seed_emails;
insert into seed_emails values ${people.map(p => `(${q(p.email)})`).join(', ')};
delete from public.meet_invites where creator_id in (select id from public.profiles where email in (select email from seed_emails));
delete from public.friend_permissions where owner_id in (select id from public.profiles where email in (select email from seed_emails));
delete from public.friendships where requester_id in (select id from public.profiles where email in (select email from seed_emails));
delete from public.schedule_blocks where user_id in (select id from public.profiles where email in (select email from seed_emails));
update public.profiles set share_schedule_global = false, share_location_global = false, schedule_disclosure = 'DETAILS',
  on_campus = false, current_zone = null where email in (select email from seed_emails);
`,
  ...people.filter(p => profileState[p.key]).map(p => {
    const s = profileState[p.key];
    return `update public.profiles set share_schedule_global = ${s.schedule}, share_location_global = ${s.location}, schedule_disclosure = ${q(s.disclosure ?? 'DETAILS')}, on_campus = ${Boolean(s.zone)}, current_zone = ${s.zone ? q(s.zone) : 'null'} where email = ${q(p.email)};`;
  }),
  `\ninsert into public.friendships (requester_id, addressee_id, status) values\n${friendships.map(([a, b, status]) => `  (${uid(a)}, ${uid(b)}, ${q(status)})`).join(',\n')};`,
  `\ninsert into public.friend_permissions (owner_id, friend_id, share_schedule, share_location) values\n${permissions.map(([o, f, sc, lo]) => `  (${uid(o)}, ${uid(f)}, ${sc}, ${lo})`).join(',\n')};`,
  `\ninsert into public.schedule_blocks (user_id, course_code, course_name, day_of_week, start_time, end_time, building, room) values\n${schedules.map(s => `  (${uid(s.key)}, ${q(s.code)}, ${q(s.name)}, ${s.day}, ${q(s.start)}, ${q(s.end)}, ${q(s.building)}, ${q(s.room)})`).join(',\n')};\n`,
];

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), statements.join('\n'));
console.log(`supabase/seed.sql escrito: ${people.length} personas, ${schedules.length} bloques, ${friendships.length} amistades.`);
