# PRABANDH Phase 4 — Dynamic DY Patil Venue Experience

Phase 4 adds the database-owned internal venue experience and removes the remaining frontend mock/local-state data paths from Phases 1–3.

## What is dynamic now

### Venue
- DY Patil venue, zones, gates and venue resources are loaded through FastAPI from Supabase.
- Organizer-created resources are persisted in `venue_resources`.
- Resource deletion is persisted in Supabase.
- The floor-plan artwork remains a presentation asset, but every gate/resource pin is positioned from database coordinates.
- Resource availability/status/wait/capacity are database values.

### Indoor navigation
`GET /api/resources/navigation` calculates a route from database map coordinates. It returns distance, ETA and a directional instruction. The venue metadata stores the map scale so the calculation is configurable rather than hardcoded in React.

### External resources
Hotels and restaurants are loaded from `partners` + `partner_availability`.
- Availability
- Capacity
- Wait time
- Discount
- Status
- Distance/rating metadata

Partner updates are persisted and broadcast through Supabase Realtime.

### Partner requests
`partner_requests` stores coordination requests and partner responses.

## Realtime
Clients subscribe to:
- `venue_resources`
- `partner_availability`
- `partner_requests`
- Existing Phase 3 live-operation tables

A periodic refresh is also used as a resilience mechanism.

## Phase 2 correction
The Journey Provider no longer uses a frontend schedule/route fallback. Transport schedules and route planning are backend-driven. If the backend is unavailable, the UI reports the live-data error rather than silently presenting mock transport data.

## Phase 3 preservation
Ticket scans, gate state, crowd pressure, alerts, recommendations and volunteer assignments continue to come from the Phase 3 backend/database/realtime layer.

## SQL order
Run:
1. `supabase_phase1.sql`
2. `supabase_phase1_seed.sql`
3. `supabase_phase2.sql`
4. `supabase_phase2_seed.sql`
5. `supabase_phase3.sql`
6. `supabase_phase4.sql`

`supabase_phase4_seed.sql` is an optional verification query file.

## Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Frontend
```bash
npm install
npm run dev
```

Required frontend variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

Privileged Supabase credentials remain backend-only.
