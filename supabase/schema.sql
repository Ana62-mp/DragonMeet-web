-- DragonMeet · esquema PostgreSQL / Supabase (fase 2, opcional).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente donde es razonable.
-- Principios: RLS en todas las tablas, mínimo privilegio, nada legible por `anon`.
-- Horarios y presencia de OTROS estudiantes solo se leen mediante las funciones RPC
-- de la sección 4, que verifican identidad, amistad, permisos y modo de detalle EN EL SERVIDOR.

-- ───────────────────────── 1. Tablas ─────────────────────────

create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  demo_key  text unique check (demo_key in ('ana', 'vale', 'paulo', 'sofia', 'diego')),
  full_name text not null,
  email     text not null,
  major     text not null,
  color     text not null check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.campus_zones (
  id    text primary key,
  label text not null,
  kind  text not null check (kind in ('BUILDING', 'OPEN'))
);

create table if not exists public.schedule_entries (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  code       text not null,
  day        smallint not null check (day between 0 and 4),
  start_min  smallint not null,
  end_min    smallint not null,
  building   text not null check (building in (
    'Da Vinci', 'Newton', 'Einstein', 'Galileo', 'Darwin', 'Maxwell', 'Miguel de Santiago',
    'Aristóteles', 'Sócrates', 'Lao Tse', 'Mozart', 'Epicuro', 'Complejo Hayek')),
  room       text not null default '',
  constraint schedule_entries_range check (start_min >= 420 and end_min <= 1200 and start_min < end_min)
);
create index if not exists schedule_entries_student_day_idx on public.schedule_entries (student_id, day);

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at   timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);
-- One row per pair, whichever side asked first.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists public.privacy_settings (
  student_id          uuid primary key references public.profiles(id) on delete cascade,
  share_schedule      boolean not null default false,
  schedule_disclosure text not null default 'BUSY_ONLY' check (schedule_disclosure in ('DETAILS', 'BUSY_ONLY')),
  share_location      boolean not null default false,
  on_campus           boolean not null default false
);

create table if not exists public.sharing_permissions (
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  friend_id      uuid not null references public.profiles(id) on delete cascade,
  share_schedule boolean not null default false,
  share_location boolean not null default false,
  primary key (owner_id, friend_id),
  constraint sharing_permissions_no_self check (owner_id <> friend_id)
);

-- Only the latest zone, never a history. `expires_at` makes stale reports disappear.
create table if not exists public.user_presence (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  zone_id    text not null references public.campus_zones(id),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint user_presence_expiry check (expires_at > updated_at)
);

create table if not exists public.meet_invitations (
  id         uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  event_date date not null,
  start_min  smallint not null,
  end_min    smallint not null,
  title      text not null,
  zone_id    text not null references public.campus_zones(id),
  cancelled  boolean not null default false,
  constraint meet_invitations_range check (start_min >= 420 and end_min <= 1200 and start_min < end_min)
);

create table if not exists public.invitation_participants (
  invitation_id uuid not null references public.meet_invitations(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  response      text not null default 'PENDING' check (response in ('PENDING', 'ACCEPTED', 'REJECTED')),
  primary key (invitation_id, student_id)
);

-- Catalog (not student data). Map coordinates live in the frontend.
insert into public.campus_zones (id, label, kind) values
  ('da-vinci', 'Da Vinci', 'BUILDING'), ('newton', 'Newton', 'BUILDING'), ('einstein', 'Einstein', 'BUILDING'),
  ('galileo', 'Galileo', 'BUILDING'), ('darwin', 'Darwin', 'BUILDING'), ('maxwell', 'Maxwell', 'BUILDING'),
  ('epicuro', 'Epicuro', 'BUILDING'), ('hayek', 'Complejo Hayek', 'BUILDING'),
  ('biblioteca', 'Biblioteca Cicerón', 'OPEN'), ('hall-espejo', 'Hall Espejo', 'OPEN'),
  ('cuadrangulos', 'Cuadrángulos', 'OPEN'), ('plaza-maxwell', 'Plaza Maxwell', 'OPEN'),
  ('plaza-academica', 'Plaza Académica', 'OPEN')
on conflict (id) do nothing;

-- ───────────────────────── 2. Helpers privados ─────────────────────────
-- Schema `private` is not exposed by the Data API. Helpers bypass RLS on purpose (security definer)
-- so policies can consult other tables without recursion.

create schema if not exists private;

create or replace function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'ACCEPTED'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a)));
$$;

-- Mirrors the app rule: accepted friendship + both global switches + both per-friend permissions.
create or replace function private.can_view(viewer uuid, owner uuid, kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select viewer = owner or (
    private.are_friends(viewer, owner)
    and (select case kind when 'schedule' then share_schedule else share_location end
           from public.privacy_settings where student_id = viewer)
    and (select case kind when 'schedule' then share_schedule else share_location end
           from public.privacy_settings where student_id = owner)
    and (select case kind when 'schedule' then share_schedule else share_location end
           from public.sharing_permissions where owner_id = owner and friend_id = viewer)
    and (select case kind when 'schedule' then share_schedule else share_location end
           from public.sharing_permissions where owner_id = viewer and friend_id = owner));
$$;

create or replace function private.is_invitation_creator(inv uuid, who uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meet_invitations where id = inv and creator_id = who);
$$;

create or replace function private.is_invitation_participant(inv uuid, who uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.invitation_participants where invitation_id = inv and student_id = who);
$$;

-- Deleting a friendship revokes the permissions between the pair immediately.
create or replace function private.revoke_pair_permissions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.sharing_permissions
   where (owner_id = old.requester_id and friend_id = old.addressee_id)
      or (owner_id = old.addressee_id and friend_id = old.requester_id);
  return old;
end;
$$;

drop trigger if exists friendships_revoke_permissions on public.friendships;
create trigger friendships_revoke_permissions after delete on public.friendships
  for each row execute function private.revoke_pair_permissions();

revoke all on function private.are_friends(uuid, uuid), private.can_view(uuid, uuid, text),
  private.is_invitation_creator(uuid, uuid), private.is_invitation_participant(uuid, uuid),
  private.revoke_pair_permissions() from public, anon, authenticated;

-- ───────────────────────── 3. Row Level Security ─────────────────────────

alter table public.profiles                enable row level security;
alter table public.campus_zones            enable row level security;
alter table public.schedule_entries        enable row level security;
alter table public.friendships             enable row level security;
alter table public.privacy_settings        enable row level security;
alter table public.sharing_permissions     enable row level security;
alter table public.user_presence           enable row level security;
alter table public.meet_invitations        enable row level security;
alter table public.invitation_participants enable row level security;

-- Nothing is granted to `anon`. Authenticated users get table privileges, further limited by policies.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on public.profiles, public.campus_zones to authenticated;
grant select, insert, update, delete on public.schedule_entries, public.privacy_settings,
  public.sharing_permissions, public.user_presence to authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;            -- cannot rewrite who asked whom
grant select, insert on public.meet_invitations, public.invitation_participants to authenticated;
grant update (cancelled) on public.meet_invitations to authenticated;
grant update (response) on public.invitation_participants to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);  -- friend search; demo data only

drop policy if exists zones_select on public.campus_zones;
create policy zones_select on public.campus_zones for select to authenticated using (true);

-- Own rows only. Other students' classes are NEVER readable here: use get_friend_schedule().
drop policy if exists schedule_own on public.schedule_entries;
create policy schedule_own on public.schedule_entries for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists privacy_own on public.privacy_settings;
create policy privacy_own on public.privacy_settings for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists permissions_own on public.sharing_permissions;
create policy permissions_own on public.sharing_permissions for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists presence_own on public.user_presence;
create policy presence_own on public.user_presence for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'PENDING');
drop policy if exists friendships_respond on public.friendships;
create policy friendships_respond on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()) and status = 'PENDING')
  with check (addressee_id = (select auth.uid()) and status in ('ACCEPTED', 'REJECTED'));
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

drop policy if exists invitations_select on public.meet_invitations;
create policy invitations_select on public.meet_invitations for select to authenticated
  using (creator_id = (select auth.uid()) or private.is_invitation_participant(id, (select auth.uid())));
drop policy if exists invitations_insert on public.meet_invitations;
create policy invitations_insert on public.meet_invitations for insert to authenticated
  with check (creator_id = (select auth.uid()));
drop policy if exists invitations_cancel on public.meet_invitations;
create policy invitations_cancel on public.meet_invitations for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));

drop policy if exists participants_select on public.invitation_participants;
create policy participants_select on public.invitation_participants for select to authenticated
  using (student_id = (select auth.uid()) or private.is_invitation_creator(invitation_id, (select auth.uid())));
drop policy if exists participants_insert on public.invitation_participants;
create policy participants_insert on public.invitation_participants for insert to authenticated
  with check (private.is_invitation_creator(invitation_id, (select auth.uid()))
              and private.are_friends(student_id, (select auth.uid())));
drop policy if exists participants_respond on public.invitation_participants;
create policy participants_respond on public.invitation_participants for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- ───────────────────────── 4. RPC seguras (lectura de datos ajenos) ─────────────────────────
-- Hiding a field in React does not protect an API response: the masking happens here.

-- Classes of `p_owner` as the caller may see them. BUSY_ONLY (or any non-self view of code/room)
-- returns NULL for private columns, so the data never leaves the database.
create or replace function public.get_friend_schedule(p_owner uuid)
returns table (id uuid, day smallint, start_min smallint, end_min smallint, busy_only boolean,
               title text, building text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.day, e.start_min, e.end_min,
         (e.student_id <> (select auth.uid()) and ps.schedule_disclosure = 'BUSY_ONLY') as busy_only,
         case when e.student_id = (select auth.uid()) or ps.schedule_disclosure = 'DETAILS' then e.title end,
         case when e.student_id = (select auth.uid()) or ps.schedule_disclosure = 'DETAILS' then e.building end
    from public.schedule_entries e
    join public.privacy_settings ps on ps.student_id = e.student_id
   where e.student_id = p_owner
     and private.can_view((select auth.uid()), p_owner, 'schedule')
   order by e.day, e.start_min;
$$;

-- Zones of friends who authorized location both ways, are "on campus" and have a fresh report.
create or replace function public.get_visible_friend_zones()
returns table (student_id uuid, zone_id text)
language sql stable security definer set search_path = '' as $$
  select p.student_id, p.zone_id
    from public.user_presence p
    join public.privacy_settings ps on ps.student_id = p.student_id
   where p.student_id <> (select auth.uid())
     and ps.on_campus
     and p.expires_at > now()
     and private.can_view((select auth.uid()), p.student_id, 'location');
$$;

-- Friends visible by location AND schedule who have no class right now (Ecuador time).
-- "No class" is not a promise of free time. Weekends return no rows.
create or replace function public.get_friends_on_campus_now()
returns table (student_id uuid, zone_id text)
language sql stable security definer set search_path = '' as $$
  with clock as (
    select (extract(isodow from (now() at time zone 'America/Guayaquil')) - 1)::smallint as day,
           (extract(hour from (now() at time zone 'America/Guayaquil')) * 60
            + extract(minute from (now() at time zone 'America/Guayaquil')))::int as minute)
  select z.student_id, z.zone_id
    from public.get_visible_friend_zones() z, clock c
   where c.day between 0 and 4
     and private.can_view((select auth.uid()), z.student_id, 'schedule')
     and not exists (
       select 1 from public.schedule_entries e
        where e.student_id = z.student_id and e.day = c.day
          and e.start_min <= c.minute and e.end_min > c.minute);
$$;

revoke all on function public.get_friend_schedule(uuid), public.get_visible_friend_zones(),
  public.get_friends_on_campus_now() from public, anon;
grant execute on function public.get_friend_schedule(uuid), public.get_visible_friend_zones(),
  public.get_friends_on_campus_now() to authenticated;
