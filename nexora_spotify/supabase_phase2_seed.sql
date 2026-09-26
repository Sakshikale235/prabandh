-- PRABANDH Phase 2 deterministic demo seed.
-- Run after supabase_phase1.sql, supabase_phase1_seed.sql, and supabase_phase2.sql.
-- These schedules are clearly synthetic demo data unless replaced by a licensed/official transit feed.

insert into public.transport_stops (name, mode, city, area, latitude, longitude)
select * from (values
 ('Dombivli','train','Thane','Dombivli',19.2183,73.0867),
 ('Vashi','train','Navi Mumbai','Vashi',19.0750,72.9986),
 ('DY Patil Stadium','bus','Navi Mumbai','Nerul',19.0437,73.0297)
) as v(name,mode,city,area,latitude,longitude)
where not exists (select 1 from public.transport_stops s where s.name=v.name and s.city=v.city);

insert into public.transport_routes (name, mode, operator, origin_stop_id, destination_stop_id)
select 'Dombivli → Vashi Express','train','Central Railway',o.id,v.id
from public.transport_stops o, public.transport_stops v
where o.name='Dombivli' and v.name='Vashi'
and not exists (select 1 from public.transport_routes r where r.name='Dombivli → Vashi Express');

insert into public.transport_routes (name, mode, operator, origin_stop_id, destination_stop_id)
select 'Vashi → DY Patil Event Service','bus','NMMT',o.id,d.id
from public.transport_stops o, public.transport_stops d
where o.name='Vashi' and d.name='DY Patil Stadium'
and not exists (select 1 from public.transport_routes r where r.name='Vashi → DY Patil Event Service');

insert into public.transport_routes (name, mode, operator, origin_stop_id, destination_stop_id)
select 'Vashi → DY Patil PRABANDH Shuttle','shuttle','PRABANDH Event Shuttle',o.id,d.id
from public.transport_stops o, public.transport_stops d
where o.name='Vashi' and d.name='DY Patil Stadium'
and not exists (select 1 from public.transport_routes r where r.name='Vashi → DY Patil PRABANDH Shuttle');

insert into public.transport_schedules (event_key, route_id, mode, operator, service, departure, arrival, duration, status, frequency)
select * from (values
 ('coldplay-dy-patil',(select id from public.transport_routes where name='Dombivli → Vashi Express' limit 1),'train','Central Railway','Dombivli → Vashi','09:42','10:18','36 min','On schedule','Scheduled'),
 ('coldplay-dy-patil',(select id from public.transport_routes where name='Dombivli → Vashi Express' limit 1),'train','Central Railway','Dombivli → Vashi','10:08','10:44','36 min','On schedule','Scheduled'),
 ('coldplay-dy-patil',(select id from public.transport_routes where name='Dombivli → Vashi Express' limit 1),'train','Central Railway','Dombivli → Vashi','10:32','11:08','36 min','On schedule','Scheduled'),
 ('coldplay-dy-patil',(select id from public.transport_routes where name='Vashi → DY Patil Event Service' limit 1),'bus','NMMT','Vashi → DY Patil Stadium','10:15','11:05','50 min','Moderate','Event service'),
 ('coldplay-dy-patil',(select id from public.transport_routes where name='Vashi → DY Patil Event Service' limit 1),'bus','NMMT','Vashi → DY Patil Stadium','10:30','11:18','48 min','Regular','Event service'),
 ('coldplay-dy-patil',(select id from public.transport_routes where name='Vashi → DY Patil PRABANDH Shuttle' limit 1),'shuttle','PRABANDH Event Shuttle','Vashi → DY Patil Stadium','10:45','11:20','35 min','3 buses active','Event service')
) as v(event_key,route_id,mode,operator,service,departure,arrival,duration,status,frequency)
where not exists (select 1 from public.transport_schedules s where s.event_key=v.event_key and s.service=v.service and s.departure=v.departure);
