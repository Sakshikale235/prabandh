-- Optional deterministic demo seed for PRABANDH Phase 1.
-- Run after supabase_phase1.sql. It does not create auth users.

insert into public.events (name, slug, description, event_type, status, city)
values ('Coldplay — Music Of The Spheres', 'coldplay-dy-patil', 'PRABANDH synthetic mega-event demo at DY Patil Stadium.', 'concert', 'scheduled', 'Navi Mumbai')
on conflict (slug) do nothing;

insert into public.venues (event_id, name, address, city, latitude, longitude)
select e.id, 'DY Patil Stadium', 'Sector 7, Nerul', 'Navi Mumbai', 19.0437, 73.0297
from public.events e where e.slug='coldplay-dy-patil'
  and not exists (select 1 from public.venues v where v.event_id=e.id and v.name='DY Patil Stadium');

insert into public.zones (venue_id, name, zone_type, capacity, map_x, map_y)
select v.id, z.name, z.zone_type, z.capacity, z.map_x, z.map_y
from public.venues v cross join (values
  ('Zone A','audience',18000,30,30),
  ('Zone B','audience',18000,70,30),
  ('Food Court','food',2500,25,72),
  ('Main Concourse','concourse',9000,50,58)
) as z(name,zone_type,capacity,map_x,map_y)
where v.name='DY Patil Stadium'
  and not exists (select 1 from public.zones x where x.venue_id=v.id and x.name=z.name);

insert into public.gates (venue_id, name, capacity, status, map_x, map_y)
select v.id, g.name, g.capacity, 'normal', g.map_x, g.map_y
from public.venues v cross join (values
  ('Gate 1',10000,18,82),('Gate 2',10000,82,82),('Gate 3',10000,25,50),('Gate 4',10000,75,50)
) as g(name,capacity,map_x,map_y)
where v.name='DY Patil Stadium'
  and not exists (select 1 from public.gates x where x.venue_id=v.id and x.name=g.name);

insert into public.venue_resources (venue_id, zone_id, name, resource_type, status, capacity, wait_minutes, map_x, map_y)
select v.id, z.id, r.name, r.resource_type, 'available', r.capacity, r.wait_minutes, r.map_x, r.map_y
from public.venues v
cross join (values
  ('Burger Point','food',250,8,22,68,'Food Court'),
  ('Pizza Zone','food',180,3,34,68,'Food Court'),
  ('Medical Centre','medical',40,0,62,58,'Main Concourse'),
  ('Merchandise Hub','merchandise',400,6,78,58,'Main Concourse'),
  ('North Washrooms','washroom',200,2,53,75,'Main Concourse')
) as r(name,resource_type,capacity,wait_minutes,map_x,map_y,zone_name)
join public.zones z on z.venue_id=v.id and z.name=r.zone_name
where v.name='DY Patil Stadium'
  and not exists (select 1 from public.venue_resources x where x.venue_id=v.id and x.name=r.name);
