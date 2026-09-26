# PRABANDH Phase 3 — Live Event Operations

Phase 3 turns the ticket scanner into the live event trigger. The frontend does not use localStorage/mockData for live operations. It reads live state from FastAPI/Supabase and subscribes to Supabase Realtime.

## Flow
1. Organizer opens Live Entry.
2. Organizer selects a database-backed gate.
3. Scan Ticket calls `POST /api/operations/ticket-scan`.
4. FastAPI validates the organizer session and calls the atomic `process_ticket_scan` Postgres function.
5. The transaction inserts `ticket_scans`, increments `gate_live_state`, writes `crowd_snapshots`, updates gate status, and creates alerts/recommendations when thresholds are crossed.
6. Supabase Realtime broadcasts changes to organizer, attendee, and volunteer clients.
7. Organizer can simulate 100 verified entry events using `POST /api/operations/crowd-surge`; this is a controlled demo simulator, not static UI state.
8. Volunteer deployment is persisted through `POST /api/operations/volunteers/assign`.
9. Attendee Home consumes the same live gate state and can show a lower-pressure gate.
10. Volunteer workspace consumes the same live assignments/alerts.

## Required setup
Run SQL in order:
- `supabase_phase1.sql`
- `supabase_phase1_seed.sql`
- `supabase_phase2.sql`
- `supabase_phase2_seed.sql`
- `supabase_phase3.sql`

Backend `.env`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS`

Frontend `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (default `http://localhost:8000`)

## Security
The service-role key is backend-only. Ticket scanning, surge simulation, volunteer assignment and alert acknowledgement are organizer-protected API actions. Browser clients use the public Supabase key and authenticated session.

## Dynamic guarantee
Phase 3 operational screens do not read `src/data/mockData.js` or localStorage for crowd, gates, tickets, alerts, recommendations, or volunteer assignments. The SQL seed creates initial database state only; subsequent state is mutated by the backend and observed through API refresh + Supabase Realtime.
