-- PRABANDH Phase 1 — Foundation schema
-- Run in Supabase SQL Editor. Safe to run on a fresh PRABANDH project.

create extension if not exists pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('organizer','attendee','partner','volunteer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM ('draft','scheduled','live','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'attendee',
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  event_type text default 'concert',
  status public.event_status not null default 'draft',
  start_at timestamptz,
  end_at timestamptz,
  city text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  floor_plan_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  zone_type text,
  capacity integer,
  map_x double precision,
  map_y double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.gates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  capacity integer not null default 10000,
  status text not null default 'normal',
  map_x double precision,
  map_y double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venue_resources (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  zone_id uuid references public.zones(id) on delete set null,
  name text not null,
  resource_type text not null,
  status text not null default 'available',
  capacity integer,
  wait_minutes integer,
  map_x double precision,
  map_y double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  partner_type text not null,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  phone text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_availability (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  available_units integer,
  capacity integer,
  wait_minutes integer,
  discount_percent numeric(5,2) default 0,
  status text not null default 'available',
  valid_from timestamptz,
  valid_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Phase 2/5 foundational transport tables are created now so later phases can connect cleanly.
create table if not exists public.transport_stops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null,
  city text,
  latitude double precision,
  longitude double precision,
  metadata jsonb not null default '{}'::jsonb,
  unique(name, mode)
);

create table if not exists public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null,
  operator_name text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unique(name)
);

create table if not exists public.transport_schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.transport_routes(id) on delete cascade,
  from_stop_id uuid references public.transport_stops(id) on delete set null,
  to_stop_id uuid references public.transport_stops(id) on delete set null,
  departure_at timestamptz not null,
  arrival_at timestamptz,
  service_date date,
  availability_status text default 'scheduled',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_created_by on public.events(created_by);
create index if not exists idx_venues_event on public.venues(event_id);
create index if not exists idx_zones_venue on public.zones(venue_id);
create index if not exists idx_gates_venue on public.gates(venue_id);
create index if not exists idx_resources_venue on public.venue_resources(venue_id);
create index if not exists idx_partners_owner on public.partners(owner_user_id);
create index if not exists idx_partner_availability_partner on public.partner_availability(partner_id);
create index if not exists idx_transport_schedule_route_date on public.transport_schedules(route_id, service_date);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists venues_updated_at on public.venues;
create trigger venues_updated_at before update on public.venues for each row execute function public.set_updated_at();
drop trigger if exists gates_updated_at on public.gates;
create trigger gates_updated_at before update on public.gates for each row execute function public.set_updated_at();
drop trigger if exists resources_updated_at on public.venue_resources;
create trigger resources_updated_at before update on public.venue_resources for each row execute function public.set_updated_at();
drop trigger if exists partners_updated_at on public.partners;
create trigger partners_updated_at before update on public.partners for each row execute function public.set_updated_at();
drop trigger if exists availability_updated_at on public.partner_availability;
create trigger availability_updated_at before update on public.partner_availability for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'attendee');
  if requested_role not in ('organizer','attendee','partner','volunteer') then requested_role := 'attendee'; end if;
  insert into public.profiles(id, full_name, role)
  values(new.id, new.raw_user_meta_data->>'full_name', requested_role::public.user_role)
  on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.venues enable row level security;
alter table public.zones enable row level security;
alter table public.gates enable row level security;
alter table public.venue_resources enable row level security;
alter table public.partners enable row level security;
alter table public.partner_availability enable row level security;
alter table public.transport_stops enable row level security;
alter table public.transport_routes enable row level security;
alter table public.transport_schedules enable row level security;

-- Drop/recreate named policies to keep this migration repeatable on a fresh project.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists events_authenticated_read on public.events;
create policy events_authenticated_read on public.events for select to authenticated using (true);
drop policy if exists events_creator_insert on public.events;
create policy events_creator_insert on public.events for insert to authenticated with check (created_by = auth.uid());
drop policy if exists events_creator_update on public.events;
create policy events_creator_update on public.events for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists events_creator_delete on public.events;
create policy events_creator_delete on public.events for delete to authenticated using (created_by = auth.uid());

drop policy if exists event_members_read on public.event_members;
create policy event_members_read on public.event_members for select to authenticated using (user_id = auth.uid() or exists(select 1 from public.events e where e.id=event_id and e.created_by=auth.uid()));
drop policy if exists event_members_insert_creator on public.event_members;
create policy event_members_insert_creator on public.event_members for insert to authenticated with check (exists(select 1 from public.events e where e.id=event_id and e.created_by=auth.uid()));
drop policy if exists event_members_delete_creator on public.event_members;
create policy event_members_delete_creator on public.event_members for delete to authenticated using (exists(select 1 from public.events e where e.id=event_id and e.created_by=auth.uid()));

-- Venue hierarchy: authenticated users may read; event creators may manage.
drop policy if exists venues_read on public.venues;
create policy venues_read on public.venues for select to authenticated using (true);
drop policy if exists venues_manage_creator on public.venues;
create policy venues_manage_creator on public.venues for all to authenticated using (exists(select 1 from public.events e where e.id=event_id and e.created_by=auth.uid())) with check (exists(select 1 from public.events e where e.id=event_id and e.created_by=auth.uid()));

drop policy if exists zones_read on public.zones;
create policy zones_read on public.zones for select to authenticated using (true);
drop policy if exists zones_manage_creator on public.zones;
create policy zones_manage_creator on public.zones for all to authenticated using (exists(select 1 from public.venues v join public.events e on e.id=v.event_id where v.id=venue_id and e.created_by=auth.uid())) with check (exists(select 1 from public.venues v join public.events e on e.id=v.event_id where v.id=venue_id and e.created_by=auth.uid()));

drop policy if exists gates_read on public.gates;
create policy gates_read on public.gates for select to authenticated using (true);
drop policy if exists gates_manage_creator on public.gates;
create policy gates_manage_creator on public.gates for all to authenticated using (exists(select 1 from public.venues v join public.events e on e.id=v.event_id where v.id=venue_id and e.created_by=auth.uid())) with check (exists(select 1 from public.venues v join public.events e on e.id=v.event_id where v.id=venue_id and e.created_by=auth.uid()));

drop policy if exists resources_read on public.venue_resources;
create policy resources_read on public.venue_resources for select to authenticated using (true);
drop policy if exists resources_manage_creator on public.venue_resources;
create policy resources_manage_creator on public.venue_resources for all to authenticated using (exists(select 1 from public.venues v join public.events e on e.id=v.event_id where v.id=venue_id and e.created_by=auth.uid())) with check (exists(select 1 from public.venues v join public.events e on e.id=v.event_id where v.id=venue_id and e.created_by=auth.uid()));

-- Partners can manage their own records; authenticated users can see active partners.
drop policy if exists partners_read_active on public.partners;
create policy partners_read_active on public.partners for select to authenticated using (active = true or owner_user_id = auth.uid());
drop policy if exists partners_manage_owner on public.partners;
create policy partners_manage_owner on public.partners for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists partner_availability_read on public.partner_availability;
create policy partner_availability_read on public.partner_availability for select to authenticated using (true);
drop policy if exists partner_availability_manage on public.partner_availability;
create policy partner_availability_manage on public.partner_availability for all to authenticated using (exists(select 1 from public.partners p where p.id=partner_id and p.owner_user_id=auth.uid())) with check (exists(select 1 from public.partners p where p.id=partner_id and p.owner_user_id=auth.uid()));

drop policy if exists transport_stops_read on public.transport_stops;
create policy transport_stops_read on public.transport_stops for select to authenticated using (true);
drop policy if exists transport_routes_read on public.transport_routes;
create policy transport_routes_read on public.transport_routes for select to authenticated using (true);
drop policy if exists transport_schedules_read on public.transport_schedules;
create policy transport_schedules_read on public.transport_schedules for select to authenticated using (true);

-- Realtime foundation. Ignore duplicate-object errors so the migration remains rerunnable.
DO $$ BEGIN alter publication supabase_realtime add table public.events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN alter publication supabase_realtime add table public.gates; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN alter publication supabase_realtime add table public.venue_resources; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN alter publication supabase_realtime add table public.partner_availability; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
