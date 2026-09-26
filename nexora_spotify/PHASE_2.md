# PRABANDH Phase 2 — Attendee Journey + Transport

Phase 2 continues directly from the uploaded Phase 1 frontend baseline. It implements the first attendee journey segment of the agreed master flow: **starting location → route → train/bus/shuttle schedules → DY Patil Stadium**.

## What is live / connected
- React attendee Journey Planner connected to FastAPI when `VITE_API_BASE_URL` is configured.
- Browser geolocation can supply latitude/longitude to the backend route planner.
- FastAPI reads transport schedules from Supabase and falls back to clearly labelled deterministic demo schedules if the database is unavailable.
- Journey saves require an authenticated Supabase attendee session and are persisted through FastAPI into Supabase.
- The selected train/bus/shuttle schedule is stored with the journey.
- The frontend refreshes API-backed journey/schedule data every 30 seconds while the backend is configured.
- Optional server-side Google Directions support can be enabled with `GOOGLE_MAPS_API_KEY`; the key never belongs in frontend code.
- Without a routing API key, the route is explicitly labelled as the PRABANDH deterministic demo route; the external Google Maps button still opens real directions.

## Canonical demo event
- Event slug: `coldplay-dy-patil`
- Venue: D.Y. Patil Stadium, Navi Mumbai
- Demo origin: Dombivli

## Phase boundary
Phase 2 intentionally does **not** implement live ticket scanning, gate pressure, volunteer allocation, or crowd-aware gate redistribution. Those are Phase 3 and consume the arrival handoff from this phase.

## Database
Run in order:
1. `supabase_phase1.sql`
2. `supabase_phase1_seed.sql`
3. `supabase_phase2.sql`
4. `supabase_phase2_seed.sql`

The Phase 2 migration is additive and includes compatibility `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements for earlier drafts.

## Validation notes
- Frontend relative-import validation: passed with zero unresolved local imports.
- Backend Python compilation: passed with `python -m compileall -q backend/app`.
- Phase 2 transport seed uses lowercase database enum/check values and the API normalizes them to UI labels.
- A live Vite build and live Supabase integration test still require installing dependencies and supplying the user's actual environment variables in the user's environment.
