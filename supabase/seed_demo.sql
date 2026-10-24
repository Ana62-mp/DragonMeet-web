-- DragonMeet · datos de demostración para Supabase (OPCIONAL, fase 2).
-- Ejecutar en el SQL Editor DESPUÉS de schema.sql. Se ejecuta como propietario (omite RLS), solo para sembrar.
--
-- ANTES de ejecutar:
--   1. En Authentication > Users crea CINCO usuarios de prueba con contraseña que elijas tú
--      (nunca la escribas en SQL ni en el repositorio). Usa correos que controles, por ejemplo
--      ana.demo@example.com, vale.demo@example.com, paulo.demo@example.com,
--      sofia.demo@example.com y diego.demo@example.com.
--   2. Si usas otros correos, cámbialos en la lista 'accounts' de abajo.
-- Este script NO crea cuentas ni inventa UUID: vincula perfiles a los usuarios Auth que ya existen.
-- Si falta alguno de los cinco usuarios, se detiene con un mensaje claro.

do $$
declare missing text;
begin
  select string_agg(a.email, ', ') into missing
    from (values ('ana.demo@example.com'), ('vale.demo@example.com'), ('paulo.demo@example.com'),
                 ('sofia.demo@example.com'), ('diego.demo@example.com')) a(email)
   where not exists (select 1 from auth.users u where u.email = a.email);
  if missing is not null then
    raise exception 'Faltan usuarios en Authentication: %', missing;
  end if;
end $$;

-- 1. Perfiles ligados a Auth
insert into public.profiles (id, demo_key, full_name, email, major, color)
select u.id, a.demo_key, a.full_name, a.email, a.major, a.color
  from (values
    ('ana',   'Ana',   'ana.demo@example.com',   'Ciencias de la Computación', '#E11B22'),
    ('vale',  'Vale',  'vale.demo@example.com',  'Ciencias de la Computación', '#8B5CF6'),
    ('paulo', 'Paulo', 'paulo.demo@example.com', 'Ciencias de la Computación', '#3B82F6'),
    ('sofia', 'Sofía', 'sofia.demo@example.com', 'Arquitectura',               '#EC4899'),
    ('diego', 'Diego', 'diego.demo@example.com', 'Administración',             '#F97316')
  ) a(demo_key, full_name, email, major, color)
  join auth.users u on u.email = a.email
on conflict (id) do update
  set demo_key = excluded.demo_key, full_name = excluded.full_name, email = excluded.email,
      major = excluded.major, color = excluded.color;

create or replace function pg_temp.uid(k text) returns uuid language sql as
  $f$ select id from public.profiles where demo_key = k $f$;

-- 2. Privacidad inicial (Sofía: solo bloques ocupados, sin ubicación)
insert into public.privacy_settings (student_id, share_schedule, schedule_disclosure, share_location, on_campus)
values
  (pg_temp.uid('ana'),   true, 'DETAILS',   true,  true),
  (pg_temp.uid('vale'),  true, 'DETAILS',   true,  true),
  (pg_temp.uid('paulo'), true, 'DETAILS',   true,  false),
  (pg_temp.uid('sofia'), true, 'BUSY_ONLY', false, true),
  (pg_temp.uid('diego'), true, 'DETAILS',   true,  false)
on conflict (student_id) do update
  set share_schedule = excluded.share_schedule, schedule_disclosure = excluded.schedule_disclosure,
      share_location = excluded.share_location, on_campus = excluded.on_campus;

-- 3. Amistades: Ana con Vale, Paulo y Sofía; solicitud pendiente de Diego a Ana
delete from public.friendships
 where requester_id in (select id from public.profiles where demo_key is not null);
insert into public.friendships (requester_id, addressee_id, status) values
  (pg_temp.uid('ana'),   pg_temp.uid('vale'),  'ACCEPTED'),
  (pg_temp.uid('ana'),   pg_temp.uid('paulo'), 'ACCEPTED'),
  (pg_temp.uid('ana'),   pg_temp.uid('sofia'), 'ACCEPTED'),
  (pg_temp.uid('diego'), pg_temp.uid('ana'),   'PENDING');

-- 4. Permisos direccionales (el borrado de amistades revoca los permisos por trigger)
delete from public.sharing_permissions
 where owner_id in (select id from public.profiles where demo_key is not null);
insert into public.sharing_permissions (owner_id, friend_id, share_schedule, share_location)
select pg_temp.uid(o), pg_temp.uid(f), true, not (o = 'sofia' or f = 'sofia')
  from (values ('ana','vale'), ('vale','ana'), ('ana','paulo'), ('paulo','ana'), ('ana','sofia'), ('sofia','ana')) p(o, f);

-- 5. Presencia manual (válida 4 h desde que se ejecuta este script)
insert into public.user_presence (student_id, zone_id, updated_at, expires_at) values
  (pg_temp.uid('ana'),   'cuadrangulos', now(), now() + interval '4 hours'),
  (pg_temp.uid('vale'),  'biblioteca',   now(), now() + interval '4 hours'),
  (pg_temp.uid('sofia'), 'galileo',      now(), now() + interval '4 hours')
on conflict (student_id) do update
  set zone_id = excluded.zone_id, updated_at = excluded.updated_at, expires_at = excluded.expires_at;

-- 6. Horarios ficticios (minutos desde medianoche)
delete from public.schedule_entries
 where student_id in (select id from public.profiles where demo_key is not null);
insert into public.schedule_entries (student_id, title, code, day, start_min, end_min, building, room)
select pg_temp.uid(v.k), v.title, v.code, v.day, v.start_min, v.end_min, v.building, v.room
  from (values
    ('ana', 'Cálculo Diferencial', 'MAT-1201', 0, 480, 570, 'Newton', 'N-201'),
    ('ana', 'Programación I', 'CMP-101', 0, 600, 690, 'Da Vinci', 'DV-105'),
    ('ana', 'Álgebra Lineal', 'MAT-2101', 1, 540, 630, 'Einstein', 'E-203'),
    ('ana', 'Microeconomía', 'ECO-101', 2, 480, 570, 'Galileo', 'G-102'),
    ('ana', 'Escritura Académica', 'ESP-100', 2, 840, 930, 'Sócrates', 'S-104'),
    ('ana', 'Cálculo Diferencial', 'MAT-1201', 3, 480, 570, 'Newton', 'N-201'),
    ('ana', 'Programación I', 'CMP-101', 4, 600, 690, 'Da Vinci', 'DV-105'),
    ('vale', 'Programación I', 'CMP-101', 0, 480, 570, 'Da Vinci', 'DV-105'),
    ('vale', 'Álgebra Lineal', 'MAT-2101', 0, 810, 900, 'Einstein', 'E-203'),
    ('vale', 'Física I', 'FIS-100', 1, 600, 720, 'Newton', 'N-103'),
    ('vale', 'Bases de Datos', 'CMP-230', 2, 540, 660, 'Da Vinci', 'DV-205'),
    ('vale', 'Física I', 'FIS-100', 3, 780, 900, 'Newton', 'N-103'),
    ('vale', 'Programación I', 'CMP-101', 4, 480, 570, 'Da Vinci', 'DV-105'),
    ('paulo', 'Cálculo Diferencial', 'MAT-1201', 0, 480, 600, 'Newton', 'N-201'),
    ('paulo', 'Bases de Datos', 'CMP-230', 0, 840, 960, 'Da Vinci', 'DV-205'),
    ('paulo', 'Programación I', 'CMP-101', 1, 480, 600, 'Da Vinci', 'DV-105'),
    ('paulo', 'Física I', 'FIS-100', 2, 660, 780, 'Newton', 'N-103'),
    ('paulo', 'Álgebra Lineal', 'MAT-2101', 3, 600, 720, 'Einstein', 'E-203'),
    ('paulo', 'Física I', 'FIS-100', 4, 780, 900, 'Newton', 'N-103'),
    ('sofia', 'Taller de Diseño', 'ARQ-110', 0, 540, 720, 'Galileo', 'G-201'),
    ('sofia', 'Historia del Arte', 'ARQ-130', 1, 480, 600, 'Miguel de Santiago', 'MS-202'),
    ('sofia', 'Dibujo', 'ARQ-120', 2, 600, 720, 'Galileo', 'G-103'),
    ('sofia', 'Taller de Diseño', 'ARQ-110', 3, 480, 660, 'Galileo', 'G-201'),
    ('sofia', 'Dibujo', 'ARQ-120', 4, 780, 960, 'Galileo', 'G-103'),
    ('diego', 'Contabilidad', 'ADM-100', 0, 600, 720, 'Einstein', 'E-101'),
    ('diego', 'Marketing', 'ADM-201', 1, 660, 780, 'Aristóteles', 'A-101'),
    ('diego', 'Economía', 'ECO-101', 2, 480, 600, 'Galileo', 'G-101'),
    ('diego', 'Marketing', 'ADM-201', 3, 840, 960, 'Aristóteles', 'A-101'),
    ('diego', 'Contabilidad', 'ADM-100', 4, 540, 660, 'Einstein', 'E-101')
  ) v(k, title, code, day, start_min, end_min, building, room);
