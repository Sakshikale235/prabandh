-- PRABANDH Phase 3 — Live event operations and crowd intelligence
-- Run after Phase 1 + Phase 2 SQL. All operational UI reads/writes live data; no frontend mock state is used by Phase 3.

create table if not exists public.event_ops_config (
  event_id uuid primary key references public.events(id) on delete cascade,
  gate_busy_threshold numeric(5,2) not null default 70,
  gate_high_threshold numeric(5,2) not null default 85,
  gate_critical_threshold numeric(5,2) not null default 92,
  volunteer_target_ratio numeric(8,4) not null default 0.0010,
  recommendation_window_minutes integer not null default 5,
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_scans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  gate_id uuid not null references public.gates(id) on delete cascade,
  ticket_reference text not null,
  scan_status text not null default 'valid',
  source text not null default 'simulator',
  scanned_at timestamptz not null default now(),
  scanned_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.gate_live_state (
  gate_id uuid primary key references public.gates(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  current_entries integer not null default 0,
  occupancy_percent numeric(6,2) not null default 0,
  scan_velocity_per_minute numeric(8,2) not null default 0,
  pressure text not null default 'normal',
  last_scan_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crowd_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  gate_id uuid not null references public.gates(id) on delete cascade,
  current_entries integer not null,
  occupancy_percent numeric(6,2) not null,
  scan_velocity_per_minute numeric(8,2) not null,
  pressure text not null,
  captured_at timestamptz not null default now()
);

create table if not exists public.volunteer_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  volunteer_user_id uuid references public.profiles(id) on delete set null,
  volunteer_name text not null,
  gate_id uuid references public.gates(id) on delete set null,
  assignment_status text not null default 'active',
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  gate_id uuid references public.gates(id) on delete set null,
  alert_type text not null,
  severity text not null,
  title text not null,
  message text not null,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  gate_id uuid references public.gates(id) on delete set null,
  recommendation_type text not null,
  title text not null,
  reason text not null,
  priority text not null default 'medium',
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.operational_actions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  gate_id uuid references public.gates(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ticket_scans_event_gate_time_idx on public.ticket_scans(event_id, gate_id, scanned_at desc);
create index if not exists gate_live_state_event_idx on public.gate_live_state(event_id);
create index if not exists crowd_snapshots_event_gate_time_idx on public.crowd_snapshots(event_id, gate_id, captured_at desc);
create index if not exists volunteer_assignments_event_status_idx on public.volunteer_assignments(event_id, assignment_status);
create index if not exists operational_alerts_event_status_idx on public.operational_alerts(event_id, status, created_at desc);
create index if not exists recommendations_event_status_idx on public.recommendations(event_id, status, created_at desc);
create index if not exists operational_actions_event_time_idx on public.operational_actions(event_id, created_at desc);

create or replace function public.set_phase3_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists event_ops_config_updated_at on public.event_ops_config;
create trigger event_ops_config_updated_at before update on public.event_ops_config for each row execute function public.set_phase3_updated_at();
drop trigger if exists gate_live_state_updated_at on public.gate_live_state;
create trigger gate_live_state_updated_at before update on public.gate_live_state for each row execute function public.set_phase3_updated_at();

alter table public.event_ops_config enable row level security;
alter table public.ticket_scans enable row level security;
alter table public.gate_live_state enable row level security;
alter table public.crowd_snapshots enable row level security;
alter table public.volunteer_assignments enable row level security;
alter table public.operational_alerts enable row level security;
alter table public.recommendations enable row level security;
alter table public.operational_actions enable row level security;

-- Read access is intentionally broad to authenticated event participants; writes are performed through the FastAPI service layer.
drop policy if exists phase3_config_read on public.event_ops_config;
create policy phase3_config_read on public.event_ops_config for select to authenticated using (true);
drop policy if exists phase3_ticket_read on public.ticket_scans;
create policy phase3_ticket_read on public.ticket_scans for select to authenticated using (true);
drop policy if exists phase3_gate_state_read on public.gate_live_state;
create policy phase3_gate_state_read on public.gate_live_state for select to authenticated using (true);
drop policy if exists phase3_crowd_read on public.crowd_snapshots;
create policy phase3_crowd_read on public.crowd_snapshots for select to authenticated using (true);
drop policy if exists phase3_volunteer_read on public.volunteer_assignments;
create policy phase3_volunteer_read on public.volunteer_assignments for select to authenticated using (true);
drop policy if exists phase3_alert_read on public.operational_alerts;
create policy phase3_alert_read on public.operational_alerts for select to authenticated using (true);
drop policy if exists phase3_recommendation_read on public.recommendations;
create policy phase3_recommendation_read on public.recommendations for select to authenticated using (true);
drop policy if exists phase3_action_read on public.operational_actions;
create policy phase3_action_read on public.operational_actions for select to authenticated using (true);

-- Atomic ticket scan processor. Backend calls this RPC with the service role so scan -> state -> snapshot -> alert/recommendation is one database transaction.
create or replace function public.process_ticket_scan(
  p_event_id uuid,
  p_gate_id uuid,
  p_ticket_reference text,
  p_source text default 'scanner',
  p_scanned_by uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gate public.gates%rowtype;
  v_config public.event_ops_config%rowtype;
  v_state public.gate_live_state%rowtype;
  v_now timestamptz := now();
  v_velocity numeric := 0;
  v_pressure text := 'normal';
  v_scan_count integer := 0;
  v_existing_alert boolean := false;
  v_recommendation_id uuid;
  v_required_volunteers integer := 0;
  v_current_volunteers integer := 0;
begin
  select * into v_gate from public.gates where id=p_gate_id and venue_id in (select id from public.venues where event_id=p_event_id) for update;
  if not found then raise exception 'Gate not found for event'; end if;
  select * into v_config from public.event_ops_config where event_id=p_event_id;
  if not found then
    insert into public.event_ops_config(event_id) values(p_event_id) returning * into v_config;
  end if;
  insert into public.ticket_scans(event_id,gate_id,ticket_reference,scan_status,source,scanned_at,scanned_by)
  values(p_event_id,p_gate_id,p_ticket_reference,'valid',coalesce(p_source,'scanner'),v_now,p_scanned_by);

  select count(*) into v_scan_count from public.ticket_scans where event_id=p_event_id and gate_id=p_gate_id and scan_status='valid';
  select count(*) into v_current_volunteers from public.volunteer_assignments where event_id=p_event_id and gate_id=p_gate_id and assignment_status='active';
  select count(*) into v_scan_count from public.ticket_scans where event_id=p_event_id and gate_id=p_gate_id and scan_status='valid';
  select count(*) into v_current_volunteers from public.volunteer_assignments where event_id=p_event_id and gate_id=p_gate_id and assignment_status='active';
  select count(*) into v_scan_count from public.ticket_scans where event_id=p_event_id and gate_id=p_gate_id and scan_status='valid' and scanned_at >= v_now - make_interval(mins => v_config.recommendation_window_minutes);
  v_velocity := round((v_scan_count::numeric / greatest(v_config.recommendation_window_minutes,1)),2);

  select * into v_state from public.gate_live_state where gate_id=p_gate_id for update;
  if not found then
    insert into public.gate_live_state(gate_id,event_id,current_entries,occupancy_percent,scan_velocity_per_minute,pressure,last_scan_at)
    values(p_gate_id,p_event_id,1,round(100.0/greatest(v_gate.capacity,1),2),v_velocity,'normal',v_now)
    returning * into v_state;
  else
    update public.gate_live_state set current_entries=current_entries+1,
      occupancy_percent=round(((current_entries+1)::numeric/greatest(v_gate.capacity,1))*100,2),
      scan_velocity_per_minute=v_velocity,
      pressure=case
        when ((current_entries+1)::numeric/greatest(v_gate.capacity,1))*100 >= v_config.gate_critical_threshold then 'critical'
        when ((current_entries+1)::numeric/greatest(v_gate.capacity,1))*100 >= v_config.gate_high_threshold then 'high'
        when ((current_entries+1)::numeric/greatest(v_gate.capacity,1))*100 >= v_config.gate_busy_threshold then 'busy'
        else 'normal' end,
      last_scan_at=v_now,updated_at=v_now
    where gate_id=p_gate_id returning * into v_state;
  end if;

  update public.gates set status=v_state.pressure, updated_at=v_now where id=p_gate_id;
  insert into public.crowd_snapshots(event_id,gate_id,current_entries,occupancy_percent,scan_velocity_per_minute,pressure,captured_at)
  values(p_event_id,p_gate_id,v_state.current_entries,v_state.occupancy_percent,v_state.scan_velocity_per_minute,v_state.pressure,v_now);

  if v_state.pressure in ('high','critical') then
    select exists(select 1 from public.operational_alerts where event_id=p_event_id and gate_id=p_gate_id and status='open' and alert_type='gate_pressure') into v_existing_alert;
    if not v_existing_alert then
      insert into public.operational_alerts(event_id,gate_id,alert_type,severity,title,message,metadata)
      values(p_event_id,p_gate_id,'gate_pressure',case when v_state.pressure='critical' then 'critical' else 'high' end,
        'Gate '||v_gate.name||' approaching capacity',
        'Entry scans are driving '||v_state.occupancy_percent||'% occupancy at '||v_gate.name||'.',
        jsonb_build_object('occupancy_percent',v_state.occupancy_percent,'scan_velocity_per_minute',v_state.scan_velocity_per_minute));
    end if;
    v_required_volunteers := greatest(1,ceil((v_gate.capacity * v_config.volunteer_target_ratio))) + case when v_state.pressure='critical' then 2 else 0 end;
    if v_current_volunteers < v_required_volunteers then
      if not exists(select 1 from public.recommendations where event_id=p_event_id and gate_id=p_gate_id and recommendation_type='volunteer' and status='pending') then
        insert into public.recommendations(event_id,gate_id,recommendation_type,title,reason,priority,payload)
        values(p_event_id,p_gate_id,'volunteer','Deploy additional volunteers at '||v_gate.name,
          'Live entry pressure is '||v_state.occupancy_percent||'% with '||v_state.scan_velocity_per_minute||' scans/minute.',
          case when v_state.pressure='critical' then 'critical' else 'high' end,
          jsonb_build_object('current_volunteers',v_current_volunteers,'recommended_volunteers',v_required_volunteers,'additional_required',greatest(v_required_volunteers-v_current_volunteers,0)));
      end if;
    end if;
    if not exists(select 1 from public.recommendations where event_id=p_event_id and gate_id=p_gate_id and recommendation_type='redirect' and status='pending') then
      insert into public.recommendations(event_id,gate_id,recommendation_type,title,reason,priority,payload)
      select p_event_id,p_gate_id,'redirect','Redirect incoming attendees from '||v_gate.name,
        'Gate pressure is elevated. Route new arrivals toward the lowest-pressure active gate.',
        case when v_state.pressure='critical' then 'critical' else 'high' end,
        jsonb_build_object('from_gate_id',p_gate_id,'from_gate_name',v_gate.name,'occupancy_percent',v_state.occupancy_percent,'reason','capacity_pressure')
      where exists(select 1 from public.gates g where g.venue_id=v_gate.venue_id and g.id<>p_gate_id and g.status not in ('critical','closed'));
    end if;
  end if;

  insert into public.operational_actions(event_id,actor_user_id,action_type,gate_id,payload)
  values(p_event_id,p_scanned_by,'ticket_scan',p_gate_id,jsonb_build_object('ticket_reference',p_ticket_reference,'source',p_source));

  return jsonb_build_object('gate',to_jsonb(v_gate),'state',to_jsonb(v_state),'required_volunteers',v_required_volunteers);
end $$;

create or replace function public.simulate_gate_surge(
  p_event_id uuid,
  p_gate_id uuid,
  p_count integer,
  p_actor uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare i integer; v_result jsonb;
begin
  if p_count < 1 or p_count > 1000 then raise exception 'Surge count must be between 1 and 1000'; end if;
  for i in 1..p_count loop
    select public.process_ticket_scan(p_event_id,p_gate_id,'SIM-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')||'-'||i,'surge_simulator',p_actor) into v_result;
  end loop;
  return v_result;
end $$;

-- Seed only creates database state. The frontend never reads these values from mockData/localStorage.
insert into public.event_ops_config(event_id)
select id from public.events where slug='coldplay-dy-patil'
on conflict (event_id) do nothing;

insert into public.gate_live_state(gate_id,event_id,current_entries,occupancy_percent,scan_velocity_per_minute,pressure)
select g.id,v.id,
  case g.name when 'Gate 1' then 4200 when 'Gate 2' then 5100 when 'Gate 3' then 7850 when 'Gate 4' then 4800 else 0 end,
  round((case g.name when 'Gate 1' then 4200 when 'Gate 2' then 5100 when 'Gate 3' then 7850 when 'Gate 4' then 4800 else 0 end)::numeric/greatest(g.capacity,1)*100,2),
  0,
  case g.name when 'Gate 3' then 'busy' else 'normal' end
from public.gates g join public.venues ven on ven.id=g.venue_id join public.events v on v.id=ven.event_id
where v.slug='coldplay-dy-patil'
on conflict (gate_id) do nothing;

-- Realtime publication for live clients.
do $$ begin
  alter publication supabase_realtime add table public.gate_live_state;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.crowd_snapshots;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.operational_alerts;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.recommendations;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.volunteer_assignments;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.ticket_scans;
exception when duplicate_object then null; when undefined_object then null; end $$;
