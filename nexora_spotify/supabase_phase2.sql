-- PRABANDH Phase 2: Attendee Journey + Transport
-- Run after supabase_phase1.sql. Run supabase_phase2_seed.sql after this migration.
-- Phase 2 owns journey planning and structured transport schedules. Live gate/crowd operations are Phase 3.

create table if not exists public.transport_stops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null check (mode in ('train','bus','shuttle','metro','cab','walk')),
  area text,
  city text,
  latitude double precision,
  longitude double precision,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null check (mode in ('train','bus','shuttle','metro','cab','walk')),
  operator text,
  origin_stop_id uuid references public.transport_stops(id) on delete set null,
  destination_stop_id uuid references public.transport_stops(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transport_schedules (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  route_id uuid references public.transport_routes(id) on delete set null,
  mode text not null,
  operator text,
  service text not null,
  departure text not null,
  arrival text not null,
  duration text,
  status text default 'On schedule',
  frequency text default 'Scheduled',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  origin_label text not null,
  destination_label text not null,
  origin_lat double precision,
  origin_lng double precision,
  selected_mode text,
  selected_schedule_id uuid references public.transport_schedules(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendee_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m double precision,
  captured_at timestamptz not null default now()
);

-- Additive compatibility for databases that were created from an earlier Phase 2 draft.
alter table public.transport_stops add column if not exists area text;
alter table public.transport_stops add column if not exists city text;
alter table public.transport_stops add column if not exists latitude double precision;
alter table public.transport_stops add column if not exists longitude double precision;
alter table public.transport_routes add column if not exists operator text;
alter table public.journeys add column if not exists selected_mode text;
alter table public.journeys add column if not exists selected_schedule_id uuid references public.transport_schedules(id) on delete set null;

create index if not exists transport_schedules_event_idx on public.transport_schedules(event_key, departure);
create index if not exists transport_routes_origin_idx on public.transport_routes(origin_stop_id);
create index if not exists transport_routes_destination_idx on public.transport_routes(destination_stop_id);
create index if not exists journeys_user_idx on public.journeys(user_id, created_at desc);
create index if not exists attendee_locations_event_idx on public.attendee_locations(event_id, captured_at desc);

alter table public.transport_stops enable row level security;
alter table public.transport_routes enable row level security;
alter table public.transport_schedules enable row level security;
alter table public.journeys enable row level security;
alter table public.attendee_locations enable row level security;

drop policy if exists "transport stops authenticated read" on public.transport_stops;
create policy "transport stops authenticated read" on public.transport_stops for select to authenticated using (active = true);
drop policy if exists "transport routes authenticated read" on public.transport_routes;
create policy "transport routes authenticated read" on public.transport_routes for select to authenticated using (active = true);
drop policy if exists "transport schedules authenticated read" on public.transport_schedules;
create policy "transport schedules authenticated read" on public.transport_schedules for select to authenticated using (active = true);
drop policy if exists "journeys own read" on public.journeys;
create policy "journeys own read" on public.journeys for select to authenticated using (user_id = auth.uid());
drop policy if exists "journeys own insert" on public.journeys;
create policy "journeys own insert" on public.journeys for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "locations own read" on public.attendee_locations;
create policy "locations own read" on public.attendee_locations for select to authenticated using (user_id = auth.uid());
drop policy if exists "locations own insert" on public.attendee_locations;
create policy "locations own insert" on public.attendee_locations for insert to authenticated with check (user_id = auth.uid());
