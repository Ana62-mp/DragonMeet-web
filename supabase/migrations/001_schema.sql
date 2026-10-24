-- DragonMeet · esquema completo (Supabase / PostgreSQL).
-- Ejecutar una vez en el SQL Editor de Supabase (o con `supabase db push`). Es re-ejecutable.
--
-- Seguridad:
--  * RLS activo en TODAS las tablas; `anon` no recibe ningún privilegio.
--  * Cada estudiante solo lee/edita sus propias filas.
--  * Datos de OTROS (perfiles, horarios, zona) solo salen por funciones SECURITY DEFINER que validan
--    en el servidor: amistad aceptada + permisos de ambos lados. Ocultar texto en React no protege una API.
--  * Nunca se guardan coordenadas GPS: solo una zona general del catálogo.
--
-- Importante en Authentication > Providers > Email: desactiva "Allow new users to sign up".
-- Los usuarios se crean con scripts/seed-users.ts (service role, solo local).

create extension if not exists unaccent with schema extensions;

-- ───────────────────────── 1. Tablas ─────────────────────────

create table if not exists public.campus_zones (
  id    text primary key,
  label text not null,
  kind  text not null check (kind in ('BUILDING', 'OPEN'))
);

insert into public.campus_zones (id, label, kind) values
  ('da-vinci', 'Da Vinci', 'BUILDING'), ('newton', 'Newton', 'BUILDING'), ('einstein', 'Einstein', 'BUILDING'),
  ('galileo', 'Galileo', 'BUILDING'), ('darwin', 'Darwin', 'BUILDING'), ('maxwell', 'Maxwell', 'BUILDING'),
  ('epicuro', 'Epicuro', 'BUILDING'), ('hayek', 'Complejo Hayek', 'BUILDING'),
  ('biblioteca', 'Biblioteca Cicerón', 'OPEN'), ('hall-espejo', 'Hall Espejo', 'OPEN'),
  ('cuadrangulos', 'Cuadrángulos', 'OPEN'), ('plaza-maxwell', 'Plaza Maxwell', 'OPEN'),
  ('plaza-academica', 'Plaza Académica', 'OPEN')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null,
  first_name          text not null,
  email               text not null unique,
  banner_code         text not null unique check (banner_code ~ '^00[0-9]{6}$'),
  career              text not null,
  semester            smallint not null check (semester between 1 and 14),
  avatar_color        text not null default '#E11B22' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Privacy: everything starts private (opt-in).
  share_schedule_global boolean not null default false,
  share_location_global boolean not null default false,
  schedule_disclosure   text not null default 'DETAILS' check (schedule_disclosure in ('DETAILS', 'BUSY_ONLY')),
  -- Manual presence. Only the latest zone is kept, never a history.
  on_campus                 boolean not null default false,
  current_zone              text references public.campus_zones(id),
  current_zone_updated_at   timestamptz,
  created_at          timestamptz not null default now(),
  constraint profiles_zone_needs_campus check (current_zone is null or on_campus)
);
create index if not exists profiles_search_idx on public.profiles (banner_code);

create table if not exists public.schedule_blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_code text not null,
  course_name text not null,
  day_of_week smallint not null check (day_of_week between 1 and 5),   -- 1 = lunes ... 5 = viernes
  start_time  time not null,
  end_time    time not null,
  building    text not null check (building in (
    'Da Vinci', 'Newton', 'Einstein', 'Galileo', 'Darwin', 'Maxwell', 'Miguel de Santiago',
    'Aristóteles', 'Sócrates', 'Lao Tse', 'Mozart', 'Epicuro', 'Complejo Hayek')),
  room        text not null default '',
  constraint schedule_blocks_range check (start_time >= time '07:00' and end_time <= time '20:00' and start_time < end_time)
);
create index if not exists schedule_blocks_user_day_idx on public.schedule_blocks (user_id, day_of_week);

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- Directional and opt-in: a missing row means "not shared".
create table if not exists public.friend_permissions (
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  friend_id      uuid not null references public.profiles(id) on delete cascade,
  share_schedule boolean not null default false,
  share_location boolean not null default false,
  primary key (owner_id, friend_id),
  constraint friend_permissions_no_self check (owner_id <> friend_id)
);

create table if not exists public.meet_invites (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  event_date date not null,
  start_time time not null,
  end_time   time not null,
  zone_id    text not null references public.campus_zones(id),
  cancelled  boolean not null default false,
  created_at timestamptz not null default now(),
  constraint meet_invites_range check (start_time >= time '07:00' and end_time <= time '20:00' and start_time < end_time)
);

create table if not exists public.meet_invite_participants (
  invite_id  uuid not null references public.meet_invites(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  response   text not null default 'pending' check (response in ('pending', 'accepted', 'rejected')),
  primary key (invite_id, student_id)
);

-- ───────────────────────── 2. Helpers privados ─────────────────────────
-- Schema `private` is not exposed by the Data API.

create schema if not exists private;

create or replace function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a)));
$$;

-- Accepted friendship + both global switches + both per-friend permissions (all opt-in).
create or replace function private.can_view(viewer uuid, owner uuid, kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    viewer = owner or (
      private.are_friends(viewer, owner)
      and (select case kind when 'schedule' then share_schedule_global else share_location_global end
             from public.profiles where id = viewer)
      and (select case kind when 'schedule' then share_schedule_global else share_location_global end
             from public.profiles where id = owner)
      and (select case kind when 'schedule' then share_schedule else share_location end
             from public.friend_permissions where owner_id = owner and friend_id = viewer)
      and (select case kind when 'schedule' then share_schedule else share_location end
             from public.friend_permissions where owner_id = viewer and friend_id = owner)),
    false);
$$;

create or replace function private.is_invite_creator(inv uuid, who uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meet_invites where id = inv and creator_id = who);
$$;

create or replace function private.is_invite_participant(inv uuid, who uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meet_invite_participants where invite_id = inv and student_id = who);
$$;

-- New Auth user -> profile, from the metadata set by scripts/seed-users.ts.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if meta ? 'banner_code' then
    insert into public.profiles (id, full_name, first_name, email, banner_code, career, semester, avatar_color)
    values (new.id, meta->>'full_name', meta->>'first_name', new.email, meta->>'banner_code', meta->>'career',
            (meta->>'semester')::smallint, coalesce(meta->>'avatar_color', '#E11B22'))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Presence rules: turning "on campus" off clears the zone; any zone write is stamped with server time.
create or replace function private.stamp_presence() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not new.on_campus then
    new.current_zone := null;
    new.current_zone_updated_at := null;
  elsif new.current_zone is not null
        and (new.current_zone is distinct from old.current_zone
             or new.current_zone_updated_at is distinct from old.current_zone_updated_at) then
    new.current_zone_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_stamp_presence on public.profiles;
create trigger profiles_stamp_presence before update on public.profiles
  for each row execute function private.stamp_presence();

-- No overlapping classes for the same student and day (half-open intervals).
create or replace function private.reject_overlap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.schedule_blocks b
     where b.user_id = new.user_id and b.day_of_week = new.day_of_week and b.id <> new.id
       and b.start_time < new.end_time and b.end_time > new.start_time) then
    raise exception 'Este bloque se superpone con otra clase.' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_blocks_no_overlap on public.schedule_blocks;
create trigger schedule_blocks_no_overlap before insert or update on public.schedule_blocks
  for each row execute function private.reject_overlap();

revoke all on function private.are_friends(uuid, uuid), private.can_view(uuid, uuid, text),
  private.is_invite_creator(uuid, uuid), private.is_invite_participant(uuid, uuid),
  private.handle_new_user(), private.stamp_presence(), private.reject_overlap()
  from public, anon, authenticated;
-- RLS policies run with the caller's privileges, so the helpers they use must be executable.
-- The schema stays unexposed by the Data API, so these are not callable as RPC.
grant usage on schema private to authenticated;
grant execute on function private.are_friends(uuid, uuid), private.is_invite_creator(uuid, uuid),
  private.is_invite_participant(uuid, uuid) to authenticated;

-- ───────────────────────── 3. Row Level Security ─────────────────────────

alter table public.campus_zones              enable row level security;
alter table public.profiles                  enable row level security;
alter table public.schedule_blocks           enable row level security;
alter table public.friendships               enable row level security;
alter table public.friend_permissions        enable row level security;
alter table public.meet_invites              enable row level security;
alter table public.meet_invite_participants  enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.campus_zones to authenticated;
grant select on public.profiles to authenticated;
-- Column-level: email, banner_code and id can never be rewritten by the client.
grant update (full_name, first_name, career, semester, avatar_color, share_schedule_global,
              share_location_global, schedule_disclosure, on_campus, current_zone, current_zone_updated_at)
  on public.profiles to authenticated;
grant select, insert, update, delete on public.schedule_blocks to authenticated;
grant select on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;       -- inserts and deletes go through RPC
grant select, insert, update, delete on public.friend_permissions to authenticated;
grant select, insert on public.meet_invites, public.meet_invite_participants to authenticated;
grant update (cancelled) on public.meet_invites to authenticated;
grant update (response) on public.meet_invite_participants to authenticated;

drop policy if exists zones_select on public.campus_zones;
create policy zones_select on public.campus_zones for select to authenticated using (true);

-- Full profile: own row only. Others come through list_connections() / search_users().
drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Other students' classes are NEVER readable here: use get_visible_schedules().
drop policy if exists schedule_own on public.schedule_blocks;
create policy schedule_own on public.schedule_blocks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
drop policy if exists friendships_respond on public.friendships;
create policy friendships_respond on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status in ('accepted', 'rejected'));

-- Rows I grant (owner) and rows granted to me (friend, read-only) so the UI can show both directions.
drop policy if exists permissions_select on public.friend_permissions;
create policy permissions_select on public.friend_permissions for select to authenticated
  using ((select auth.uid()) in (owner_id, friend_id));
drop policy if exists permissions_write on public.friend_permissions;
create policy permissions_write on public.friend_permissions for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.are_friends(owner_id, friend_id));
drop policy if exists permissions_update on public.friend_permissions;
create policy permissions_update on public.friend_permissions for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and private.are_friends(owner_id, friend_id));
drop policy if exists permissions_delete on public.friend_permissions;
create policy permissions_delete on public.friend_permissions for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists invites_select on public.meet_invites;
create policy invites_select on public.meet_invites for select to authenticated
  using (creator_id = (select auth.uid()) or private.is_invite_participant(id, (select auth.uid())));
drop policy if exists invites_insert on public.meet_invites;
create policy invites_insert on public.meet_invites for insert to authenticated
  with check (creator_id = (select auth.uid()));
drop policy if exists invites_cancel on public.meet_invites;
create policy invites_cancel on public.meet_invites for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));

drop policy if exists participants_select on public.meet_invite_participants;
create policy participants_select on public.meet_invite_participants for select to authenticated
  using (student_id = (select auth.uid()) or private.is_invite_creator(invite_id, (select auth.uid())));
drop policy if exists participants_insert on public.meet_invite_participants;
create policy participants_insert on public.meet_invite_participants for insert to authenticated
  with check (private.is_invite_creator(invite_id, (select auth.uid()))
              and private.are_friends(student_id, (select auth.uid())));
drop policy if exists participants_respond on public.meet_invite_participants;
create policy participants_respond on public.meet_invite_participants for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- ───────────────────────── 4. RPC (lectura de datos ajenos y acciones sociales) ─────────────────────────

-- Public fields only: no email, no privacy flags, no zone.
create or replace function public.search_users(query text)
returns table (id uuid, full_name text, first_name text, career text, semester smallint, avatar_color text, banner_code text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.first_name, p.career, p.semester, p.avatar_color, p.banner_code
    from public.profiles p
   where length(trim(query)) >= 2
     and p.id <> (select auth.uid())
     and (extensions.unaccent(lower(p.full_name)) like '%' || extensions.unaccent(lower(trim(query))) || '%'
          or lower(p.banner_code) like '%' || lower(trim(query)) || '%'
          or lower(p.email) like '%' || lower(trim(query)) || '%')
   order by p.full_name
   limit 20;
$$;

-- Public fields of everyone I share a friendship row with (pending, accepted or rejected).
create or replace function public.list_connections()
returns table (id uuid, full_name text, first_name text, career text, semester smallint, avatar_color text, banner_code text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.first_name, p.career, p.semester, p.avatar_color, p.banner_code
    from public.profiles p
   where p.id in (select case when f.requester_id = (select auth.uid()) then f.addressee_id else f.requester_id end
                    from public.friendships f
                   where (select auth.uid()) in (f.requester_id, f.addressee_id));
$$;

-- What I may see of each accepted friend (drives the "visible / private" pills and the Match list).
create or replace function public.get_friend_access()
returns table (friend_id uuid, can_schedule boolean, can_location boolean)
language sql stable security definer set search_path = '' as $$
  select o.id, private.can_view((select auth.uid()), o.id, 'schedule'), private.can_view((select auth.uid()), o.id, 'location')
    from public.profiles o
   where private.are_friends((select auth.uid()), o.id);
$$;

-- Friends' classes, masked on the server: BUSY_ONLY returns no name/building; code and room never leave.
create or replace function public.get_visible_schedules()
returns table (id uuid, owner_id uuid, day_of_week smallint, start_time time, end_time time,
               busy_only boolean, course_name text, building text)
language sql stable security definer set search_path = '' as $$
  select b.id, b.user_id, b.day_of_week, b.start_time, b.end_time,
         (o.schedule_disclosure = 'BUSY_ONLY'),
         case when o.schedule_disclosure = 'DETAILS' then b.course_name end,
         case when o.schedule_disclosure = 'DETAILS' then b.building end
    from public.schedule_blocks b
    join public.profiles o on o.id = b.user_id
   where b.user_id <> (select auth.uid())
     and private.can_view((select auth.uid()), b.user_id, 'schedule')
   order by b.user_id, b.day_of_week, b.start_time;
$$;

-- Zones of friends who authorized location both ways, are "on campus" and reported within 4 hours.
create or replace function public.get_visible_friend_zones()
returns table (friend_id uuid, zone_id text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.id, o.current_zone, o.current_zone_updated_at
    from public.profiles o
   where o.id <> (select auth.uid())
     and o.on_campus and o.current_zone is not null
     and o.current_zone_updated_at > now() - interval '4 hours'
     and private.can_view((select auth.uid()), o.id, 'location');
$$;

-- Sends a request. Re-sending after a rejection replaces the old row; a pending request from the
-- other side is accepted instead of duplicated.
create or replace function public.send_friend_request(p_to uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); existing public.friendships;
begin
  if me is null or p_to is null or p_to = me then raise exception 'Solicitud inválida.'; end if;
  if not exists (select 1 from public.profiles where id = p_to) then raise exception 'Estudiante no encontrado.'; end if;
  select * into existing from public.friendships f
   where least(f.requester_id, f.addressee_id) = least(me, p_to) and greatest(f.requester_id, f.addressee_id) = greatest(me, p_to);
  if found then
    if existing.status = 'accepted' then return 'accepted'; end if;
    if existing.status = 'pending' and existing.requester_id = p_to then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    if existing.status = 'pending' then return 'pending'; end if;
    delete from public.friendships where id = existing.id;           -- rejected: start over
  end if;
  insert into public.friendships (requester_id, addressee_id) values (me, p_to);
  return 'pending';
end;
$$;

-- Cancels a request or removes a friend: deletes the friendship, revokes permissions both ways and
-- cancels the invitations the two of them shared.
create or replace function public.remove_friendship(p_other uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then raise exception 'No autenticado.'; end if;
  delete from public.friend_permissions
   where (owner_id = me and friend_id = p_other) or (owner_id = p_other and friend_id = me);
  update public.meet_invites i set cancelled = true
   where i.creator_id in (me, p_other)
     and exists (select 1 from public.meet_invite_participants p where p.invite_id = i.id and p.student_id in (me, p_other));
  delete from public.friendships f
   where (f.requester_id = me and f.addressee_id = p_other) or (f.requester_id = p_other and f.addressee_id = me);
end;
$$;

revoke all on function public.search_users(text), public.list_connections(), public.get_friend_access(),
  public.get_visible_schedules(), public.get_visible_friend_zones(), public.send_friend_request(uuid),
  public.remove_friendship(uuid) from public, anon;
grant execute on function public.search_users(text), public.list_connections(), public.get_friend_access(),
  public.get_visible_schedules(), public.get_visible_friend_zones(), public.send_friend_request(uuid),
  public.remove_friendship(uuid) to authenticated;
