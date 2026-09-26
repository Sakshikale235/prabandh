-- PRABANDH Phase 4 — Dynamic venue map, navigation and resource layer.
-- Run after phases 1-3 SQL + seeds.

create table if not exists public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete cascade,
  request_type text not null default 'info',
  text text not null,
  priority text not null default 'Medium',
  amount integer,
  status text not null default 'pending',
  requested_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_requests_event on public.partner_requests(event_id, status);
create index if not exists idx_partner_requests_partner on public.partner_requests(partner_id, status);

alter table public.partner_requests enable row level security;
drop policy if exists partner_requests_authenticated_read on public.partner_requests;
create policy partner_requests_authenticated_read on public.partner_requests for select to authenticated using (true);
drop policy if exists partner_requests_partner_update on public.partner_requests;
create policy partner_requests_partner_update on public.partner_requests for update to authenticated using (partner_id in (select id from public.partners where owner_user_id=auth.uid())) with check (partner_id in (select id from public.partners where owner_user_id=auth.uid()));
drop policy if exists partner_requests_organizer_insert on public.partner_requests;
create policy partner_requests_organizer_insert on public.partner_requests for insert to authenticated with check (requested_by=auth.uid());

-- Venue metadata supports a real, database-owned coordinate system for the supplied floor-plan artwork.
update public.venues
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('map_coordinate_system','percent','meters_per_map_unit',20)
where name='DY Patil Stadium';

-- Dynamic floor-plan resources. These are seed records, not frontend constants.
insert into public.venue_resources (venue_id, zone_id, name, resource_type, status, capacity, wait_minutes, map_x, map_y, metadata)
select v.id, z.id, r.name, r.resource_type, r.status, r.capacity, r.wait_minutes, r.map_x, r.map_y, r.metadata::jsonb
from public.venues v
cross join (values
 ('Burger Point','food','available',250,8,18,70,'Food Court','{}'),
 ('Pizza Zone','food','available',180,3,32,70,'Food Court','{}'),
 ('Medical Centre','medical','available',40,0,61,58,'Main Concourse','{}'),
 ('Merchandise Hub','merchandise','available',400,6,79,58,'Main Concourse','{}'),
 ('North Washrooms','washroom','available',200,2,53,76,'Main Concourse','{}'),
 ('Water Point 1','water','available',500,1,42,63,'Main Concourse','{}'),
 ('Information Desk','information','available',30,1,57,68,'Main Concourse','{}')
) as r(name,resource_type,status,capacity,wait_minutes,map_x,map_y,zone_name,metadata)
join public.zones z on z.venue_id=v.id and z.name=r.zone_name
where v.name='DY Patil Stadium'
  and not exists (select 1 from public.venue_resources x where x.venue_id=v.id and x.name=r.name);

-- Partners and live availability for the surrounding ecosystem. Values are database seed data and can be changed by partners.
insert into public.partners (name,partner_type,address,city,latitude,longitude,active,metadata)
select p.name,p.partner_type,p.address,p.city,p.latitude,p.longitude,true,p.metadata::jsonb
from (values
 ('Sunset Grand Hotel','hotel','Sector 7, Nerul','Navi Mumbai',19.0470,73.0275,'{"rating":4.6,"distance_km":1.2}'),
 ('Navi Mumbai Suites','hotel','Palm Beach Road','Navi Mumbai',19.0320,73.0190,'{"rating":4.3,"distance_km":2.0}'),
 ('Stadium View Inn','hotel','Nerul East','Navi Mumbai',19.0405,73.0330,'{"rating":4.1,"distance_km":0.9}'),
 ('The Food Court','restaurant','DY Patil Stadium Concourse','Navi Mumbai',19.0438,73.0298,'{"type":"Food & Beverage","distance_km":0.1}'),
 ('Spice Route','restaurant','Sector 7, Nerul','Navi Mumbai',19.0460,73.0310,'{"type":"Restaurant","distance_km":0.8}'),
 ('Green Bowl','restaurant','Nerul East','Navi Mumbai',19.0410,73.0350,'{"type":"Quick Service","distance_km":0.7}'),
 ('Sky Lounge','restaurant','Palm Beach Road','Navi Mumbai',19.0370,73.0210,'{"type":"Premium Dining","distance_km":1.8}')
) as p(name,partner_type,address,city,latitude,longitude,metadata)
where not exists (select 1 from public.partners x where x.name=p.name);

insert into public.partner_availability (partner_id,event_id,available_units,capacity,wait_minutes,discount_percent,status)
select p.id,e.id,a.available_units,a.capacity,a.wait_minutes,a.discount_percent,a.status
from public.events e
join (values
 ('Sunset Grand Hotel',82,120,0,10,'available'),
 ('Navi Mumbai Suites',34,80,0,20,'available'),
 ('Stadium View Inn',65,100,0,15,'available'),
 ('The Food Court',38,100,8,10,'available'),
 ('Spice Route',18,80,17,5,'available'),
 ('Green Bowl',62,120,4,15,'available'),
 ('Sky Lounge',9,100,25,20,'busy')
) a(name,available_units,capacity,wait_minutes,discount_percent,status) on true
join public.partners p on p.name=a.name
where e.slug='coldplay-dy-patil'
  and not exists (select 1 from public.partner_availability x where x.partner_id=p.id and x.event_id=e.id);

insert into public.partner_requests (event_id,partner_id,request_type,text,priority,amount,status)
select e.id,p.id,r.request_type,r.text,r.priority,r.amount,'pending'
from public.events e
join public.partners p on p.name='Sunset Grand Hotel'
cross join (values
 ('hotel-rooms','Need 2 extra hotel rooms for artist support','High',2),
 ('info','Confirm current hotel inventory for organizer support','Medium',null)
) r(request_type,text,priority,amount)
where e.slug='coldplay-dy-patil'
  and not exists (select 1 from public.partner_requests x where x.event_id=e.id and x.text=r.text);

-- Realtime for attendee-facing venue/resource updates.
do $$ begin
  alter publication supabase_realtime add table public.venue_resources;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.partner_availability;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.partner_requests;
exception when duplicate_object then null; when undefined_object then null; end $$;
