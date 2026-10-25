-- DragonMeet · datos de demostración (generado por scripts/build-seed-sql.ts; no lo edites a mano).
-- Orden: 1) migración 001_schema.sql  2) npm run seed:users  3) este archivo en el SQL Editor.
-- Solo contiene datos ficticios no sensibles; las contraseñas viven en .env.local, nunca aquí.
-- Es re-ejecutable: borra y vuelve a crear horarios, amistades y permisos de las cuentas sembradas.
-- Las zonas actuales expiran a las 4 h; vuelve a ejecutar este archivo para refrescarlas.

do $$
begin
  if (select count(*) from public.profiles where email in ('pmoposita@estud.usfq.edu.ec', 'jvparedes@estud.usfq.edu.ec', 'pperez@estud.usfq.edu.ec', 'candrade@estud.usfq.edu.ec', 'sjativa@estud.usfq.edu.ec', 'dcevallos@estud.usfq.edu.ec', 'jtoapanta@estud.usfq.edu.ec', 'iron@estud.usfq.edu.ec', 'msalazar@estud.usfq.edu.ec', 'avera@estud.usfq.edu.ec', 'aquishpe@estud.usfq.edu.ec', 'respinosa@estud.usfq.edu.ec', 'ncarrion@estud.usfq.edu.ec', 'enaranjo@estud.usfq.edu.ec', 'garteaga@estud.usfq.edu.ec', 'syanez@estud.usfq.edu.ec', 'dcardenas@estud.usfq.edu.ec')) < 17 then
    raise exception 'Faltan perfiles: ejecuta primero "npm run seed:users".';
  end if;
end $$;

create temp table if not exists seed_emails (email text primary key);
truncate seed_emails;
insert into seed_emails values ('pmoposita@estud.usfq.edu.ec'), ('jvparedes@estud.usfq.edu.ec'), ('pperez@estud.usfq.edu.ec'), ('candrade@estud.usfq.edu.ec'), ('sjativa@estud.usfq.edu.ec'), ('dcevallos@estud.usfq.edu.ec'), ('jtoapanta@estud.usfq.edu.ec'), ('iron@estud.usfq.edu.ec'), ('msalazar@estud.usfq.edu.ec'), ('avera@estud.usfq.edu.ec'), ('aquishpe@estud.usfq.edu.ec'), ('respinosa@estud.usfq.edu.ec'), ('ncarrion@estud.usfq.edu.ec'), ('enaranjo@estud.usfq.edu.ec'), ('garteaga@estud.usfq.edu.ec'), ('syanez@estud.usfq.edu.ec'), ('dcardenas@estud.usfq.edu.ec');
delete from public.meet_invites where creator_id in (select id from public.profiles where email in (select email from seed_emails));
delete from public.friend_permissions where owner_id in (select id from public.profiles where email in (select email from seed_emails));
delete from public.friendships where requester_id in (select id from public.profiles where email in (select email from seed_emails));
delete from public.schedule_blocks where user_id in (select id from public.profiles where email in (select email from seed_emails));
update public.profiles set share_schedule_global = false, share_location_global = false, schedule_disclosure = 'DETAILS',
  on_campus = false, current_zone = null where email in (select email from seed_emails);

update public.profiles set share_schedule_global = true, share_location_global = true, schedule_disclosure = 'DETAILS', on_campus = true, current_zone = 'cuadrangulos' where email = 'pmoposita@estud.usfq.edu.ec';
update public.profiles set share_schedule_global = true, share_location_global = true, schedule_disclosure = 'DETAILS', on_campus = true, current_zone = 'biblioteca' where email = 'jvparedes@estud.usfq.edu.ec';
update public.profiles set share_schedule_global = true, share_location_global = true, schedule_disclosure = 'DETAILS', on_campus = true, current_zone = 'da-vinci' where email = 'pperez@estud.usfq.edu.ec';
update public.profiles set share_schedule_global = true, share_location_global = true, schedule_disclosure = 'BUSY_ONLY', on_campus = true, current_zone = 'galileo' where email = 'candrade@estud.usfq.edu.ec';
update public.profiles set share_schedule_global = true, share_location_global = false, schedule_disclosure = 'DETAILS', on_campus = false, current_zone = null where email = 'dcevallos@estud.usfq.edu.ec';
update public.profiles set share_schedule_global = true, share_location_global = true, schedule_disclosure = 'DETAILS', on_campus = false, current_zone = null where email = 'jtoapanta@estud.usfq.edu.ec';
update public.profiles set share_schedule_global = false, share_location_global = false, schedule_disclosure = 'DETAILS', on_campus = false, current_zone = null where email = 'iron@estud.usfq.edu.ec';
update public.profiles set share_schedule_global = true, share_location_global = true, schedule_disclosure = 'DETAILS', on_campus = true, current_zone = 'plaza-academica' where email = 'msalazar@estud.usfq.edu.ec';

insert into public.friendships (requester_id, addressee_id, status) values
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), 'accepted'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'accepted'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'pending'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), 'accepted'),
  ((select id from public.profiles where email = 'dcevallos@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'accepted'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'iron@estud.usfq.edu.ec'), 'accepted'),
  ((select id from public.profiles where email = 'sjativa@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'pending'),
  ((select id from public.profiles where email = 'enaranjo@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'pending'),
  ((select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), (select id from public.profiles where email = 'respinosa@estud.usfq.edu.ec'), 'accepted'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), (select id from public.profiles where email = 'msalazar@estud.usfq.edu.ec'), 'accepted'),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), (select id from public.profiles where email = 'jtoapanta@estud.usfq.edu.ec'), 'accepted');

insert into public.friend_permissions (owner_id, friend_id, share_schedule, share_location) values
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'dcevallos@estud.usfq.edu.ec'), true, false),
  ((select id from public.profiles where email = 'dcevallos@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), true, false),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), (select id from public.profiles where email = 'iron@estud.usfq.edu.ec'), false, false),
  ((select id from public.profiles where email = 'iron@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), (select id from public.profiles where email = 'msalazar@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'msalazar@estud.usfq.edu.ec'), (select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), (select id from public.profiles where email = 'jtoapanta@estud.usfq.edu.ec'), true, true),
  ((select id from public.profiles where email = 'jtoapanta@estud.usfq.edu.ec'), (select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), true, true);

insert into public.schedule_blocks (user_id, course_code, course_name, day_of_week, start_time, end_time, building, room) values
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 1, '08:00', '09:30', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'CMP-101', 'Programación I', 1, '10:00', '11:30', 'Da Vinci', 'DV-105'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'MAT-2101', 'Álgebra Lineal', 2, '09:00', '10:30', 'Einstein', 'E-203'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'ECO-101', 'Microeconomía', 3, '08:00', '09:30', 'Galileo', 'G-102'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'ESP-100', 'Escritura Académica', 3, '14:00', '15:30', 'Sócrates', 'S-104'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 4, '08:00', '09:30', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'pmoposita@estud.usfq.edu.ec'), 'CMP-101', 'Programación I', 5, '10:00', '11:30', 'Da Vinci', 'DV-105'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), 'CMP-101', 'Programación I', 1, '08:00', '09:30', 'Da Vinci', 'DV-105'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), 'MAT-2101', 'Álgebra Lineal', 1, '13:30', '15:00', 'Einstein', 'E-203'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 2, '10:00', '12:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), 'CMP-230', 'Bases de Datos', 3, '09:00', '11:00', 'Da Vinci', 'DV-205'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 4, '13:00', '15:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'jvparedes@estud.usfq.edu.ec'), 'CMP-101', 'Programación I', 5, '08:00', '09:30', 'Da Vinci', 'DV-105'),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 1, '08:00', '10:00', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'CMP-230', 'Bases de Datos', 1, '14:00', '16:00', 'Da Vinci', 'DV-205'),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'CMP-101', 'Programación I', 2, '08:00', '10:00', 'Da Vinci', 'DV-105'),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 3, '11:00', '13:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'MAT-2101', 'Álgebra Lineal', 4, '10:00', '12:00', 'Einstein', 'E-203'),
  ((select id from public.profiles where email = 'pperez@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 5, '13:00', '15:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), 'ARQ-110', 'Taller de Diseño', 1, '09:00', '12:00', 'Galileo', 'G-201'),
  ((select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), 'ARQ-120', 'Dibujo', 3, '10:00', '12:00', 'Galileo', 'G-103'),
  ((select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), 'ARQ-130', 'Historia del Arte', 4, '13:00', '15:00', 'Miguel de Santiago', 'MS-202'),
  ((select id from public.profiles where email = 'candrade@estud.usfq.edu.ec'), 'ARQ-110', 'Taller de Diseño', 5, '08:00', '11:00', 'Galileo', 'G-201'),
  ((select id from public.profiles where email = 'sjativa@estud.usfq.edu.ec'), 'ADM-100', 'Contabilidad', 1, '10:00', '12:00', 'Einstein', 'E-101'),
  ((select id from public.profiles where email = 'sjativa@estud.usfq.edu.ec'), 'ADM-201', 'Marketing', 2, '11:00', '13:00', 'Aristóteles', 'A-101'),
  ((select id from public.profiles where email = 'sjativa@estud.usfq.edu.ec'), 'ECO-101', 'Economía', 4, '08:00', '10:00', 'Galileo', 'G-101'),
  ((select id from public.profiles where email = 'sjativa@estud.usfq.edu.ec'), 'ADM-201', 'Marketing', 5, '14:00', '16:00', 'Aristóteles', 'A-101'),
  ((select id from public.profiles where email = 'dcevallos@estud.usfq.edu.ec'), 'MED-110', 'Anatomía', 1, '08:00', '10:00', 'Darwin', 'D-101'),
  ((select id from public.profiles where email = 'dcevallos@estud.usfq.edu.ec'), 'MED-120', 'Biología Celular', 2, '13:00', '15:00', 'Darwin', 'D-204'),
  ((select id from public.profiles where email = 'dcevallos@estud.usfq.edu.ec'), 'QUI-100', 'Química General', 3, '10:00', '12:00', 'Maxwell', 'M-102'),
  ((select id from public.profiles where email = 'dcevallos@estud.usfq.edu.ec'), 'MED-110', 'Anatomía', 5, '09:00', '11:00', 'Darwin', 'D-101'),
  ((select id from public.profiles where email = 'jtoapanta@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 1, '08:00', '09:30', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'jtoapanta@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 2, '10:00', '12:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'jtoapanta@estud.usfq.edu.ec'), 'IND-110', 'Procesos de Manufactura', 4, '13:00', '15:00', 'Maxwell', 'M-201'),
  ((select id from public.profiles where email = 'jtoapanta@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 5, '08:00', '09:30', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'iron@estud.usfq.edu.ec'), 'PSI-100', 'Psicología General', 1, '11:00', '13:00', 'Sócrates', 'S-101'),
  ((select id from public.profiles where email = 'iron@estud.usfq.edu.ec'), 'PSI-210', 'Desarrollo Humano', 3, '08:00', '10:00', 'Lao Tse', 'LT-102'),
  ((select id from public.profiles where email = 'iron@estud.usfq.edu.ec'), 'EST-100', 'Estadística', 4, '11:00', '13:00', 'Lao Tse', 'LT-201'),
  ((select id from public.profiles where email = 'iron@estud.usfq.edu.ec'), 'PSI-100', 'Psicología General', 5, '15:00', '17:00', 'Sócrates', 'S-101'),
  ((select id from public.profiles where email = 'msalazar@estud.usfq.edu.ec'), 'COM-100', 'Teoría de la Comunicación', 2, '08:00', '10:00', 'Mozart', 'MZ-101'),
  ((select id from public.profiles where email = 'msalazar@estud.usfq.edu.ec'), 'COM-220', 'Producción Audiovisual', 3, '13:00', '16:00', 'Mozart', 'MZ-203'),
  ((select id from public.profiles where email = 'msalazar@estud.usfq.edu.ec'), 'LIT-110', 'Redacción', 4, '09:00', '11:00', 'Epicuro', 'EP-102'),
  ((select id from public.profiles where email = 'msalazar@estud.usfq.edu.ec'), 'COM-220', 'Producción Audiovisual', 5, '10:00', '12:00', 'Mozart', 'MZ-203'),
  ((select id from public.profiles where email = 'avera@estud.usfq.edu.ec'), 'MED-110', 'Anatomía', 1, '09:30', '11:30', 'Darwin', 'D-101'),
  ((select id from public.profiles where email = 'avera@estud.usfq.edu.ec'), 'MED-120', 'Biología Celular', 2, '09:30', '11:30', 'Darwin', 'D-204'),
  ((select id from public.profiles where email = 'avera@estud.usfq.edu.ec'), 'QUI-100', 'Química General', 4, '14:00', '16:00', 'Maxwell', 'M-102'),
  ((select id from public.profiles where email = 'avera@estud.usfq.edu.ec'), 'MED-110', 'Anatomía', 5, '13:00', '15:00', 'Darwin', 'D-101'),
  ((select id from public.profiles where email = 'aquishpe@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 1, '13:30', '15:00', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'aquishpe@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 3, '09:00', '11:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'aquishpe@estud.usfq.edu.ec'), 'IND-110', 'Procesos de Manufactura', 4, '08:00', '10:00', 'Maxwell', 'M-201'),
  ((select id from public.profiles where email = 'aquishpe@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 5, '10:00', '12:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'respinosa@estud.usfq.edu.ec'), 'ARQ-110', 'Taller de Diseño', 2, '10:00', '13:00', 'Galileo', 'G-201'),
  ((select id from public.profiles where email = 'respinosa@estud.usfq.edu.ec'), 'ARQ-120', 'Dibujo', 3, '14:00', '16:00', 'Galileo', 'G-103'),
  ((select id from public.profiles where email = 'respinosa@estud.usfq.edu.ec'), 'ARQ-130', 'Historia del Arte', 5, '09:00', '11:00', 'Miguel de Santiago', 'MS-202'),
  ((select id from public.profiles where email = 'respinosa@estud.usfq.edu.ec'), 'ARQ-110', 'Taller de Diseño', 4, '09:00', '12:00', 'Galileo', 'G-201'),
  ((select id from public.profiles where email = 'ncarrion@estud.usfq.edu.ec'), 'ADM-100', 'Contabilidad', 1, '08:00', '10:00', 'Einstein', 'E-101'),
  ((select id from public.profiles where email = 'ncarrion@estud.usfq.edu.ec'), 'ADM-201', 'Marketing', 2, '14:00', '16:00', 'Aristóteles', 'A-101'),
  ((select id from public.profiles where email = 'ncarrion@estud.usfq.edu.ec'), 'ECO-101', 'Economía', 3, '11:00', '13:00', 'Galileo', 'G-101'),
  ((select id from public.profiles where email = 'ncarrion@estud.usfq.edu.ec'), 'ADM-100', 'Contabilidad', 5, '10:00', '12:00', 'Einstein', 'E-101'),
  ((select id from public.profiles where email = 'enaranjo@estud.usfq.edu.ec'), 'COM-100', 'Teoría de la Comunicación', 1, '15:00', '17:00', 'Mozart', 'MZ-101'),
  ((select id from public.profiles where email = 'enaranjo@estud.usfq.edu.ec'), 'COM-220', 'Producción Audiovisual', 3, '09:00', '11:00', 'Mozart', 'MZ-203'),
  ((select id from public.profiles where email = 'enaranjo@estud.usfq.edu.ec'), 'LIT-110', 'Redacción', 4, '10:00', '12:00', 'Epicuro', 'EP-102'),
  ((select id from public.profiles where email = 'enaranjo@estud.usfq.edu.ec'), 'COM-220', 'Producción Audiovisual', 5, '13:00', '15:00', 'Mozart', 'MZ-203'),
  ((select id from public.profiles where email = 'garteaga@estud.usfq.edu.ec'), 'PSI-100', 'Psicología General', 2, '08:30', '10:00', 'Sócrates', 'S-101'),
  ((select id from public.profiles where email = 'garteaga@estud.usfq.edu.ec'), 'PSI-210', 'Desarrollo Humano', 3, '10:30', '12:00', 'Lao Tse', 'LT-102'),
  ((select id from public.profiles where email = 'garteaga@estud.usfq.edu.ec'), 'EST-100', 'Estadística', 4, '15:00', '17:00', 'Lao Tse', 'LT-201'),
  ((select id from public.profiles where email = 'garteaga@estud.usfq.edu.ec'), 'PSI-100', 'Psicología General', 5, '08:00', '09:30', 'Sócrates', 'S-101'),
  ((select id from public.profiles where email = 'syanez@estud.usfq.edu.ec'), 'IND-110', 'Procesos de Manufactura', 1, '10:00', '12:00', 'Maxwell', 'M-201'),
  ((select id from public.profiles where email = 'syanez@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 2, '08:00', '10:00', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'syanez@estud.usfq.edu.ec'), 'FIS-100', 'Física I', 4, '13:00', '15:00', 'Newton', 'N-103'),
  ((select id from public.profiles where email = 'syanez@estud.usfq.edu.ec'), 'MAT-1201', 'Cálculo Diferencial', 5, '14:00', '16:00', 'Newton', 'N-201'),
  ((select id from public.profiles where email = 'dcardenas@estud.usfq.edu.ec'), 'MED-110', 'Anatomía', 1, '08:00', '11:00', 'Darwin', 'D-101'),
  ((select id from public.profiles where email = 'dcardenas@estud.usfq.edu.ec'), 'MED-120', 'Biología Celular', 3, '08:00', '10:00', 'Darwin', 'D-204'),
  ((select id from public.profiles where email = 'dcardenas@estud.usfq.edu.ec'), 'QUI-100', 'Química General', 4, '11:00', '13:00', 'Maxwell', 'M-102'),
  ((select id from public.profiles where email = 'dcardenas@estud.usfq.edu.ec'), 'MED-110', 'Anatomía', 5, '14:00', '16:00', 'Darwin', 'D-101');
