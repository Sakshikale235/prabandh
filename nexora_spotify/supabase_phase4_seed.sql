-- Optional repeatable Phase 4 seed helper. The main records are created by supabase_phase4.sql.
-- This file is intentionally small; changing venue/resource/partner data should happen in Supabase, not React.
select count(*) as venue_resources_seeded from public.venue_resources;
select count(*) as partner_availability_seeded from public.partner_availability;
