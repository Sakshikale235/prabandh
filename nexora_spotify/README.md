# PRABANDH — Event Intelligence Prototype

PRABANDH is the supplied React/Vite event-intelligence frontend, now extended with the Phase 1 foundation: Supabase Auth, role-aware routing, database schema, RLS, realtime foundations and a FastAPI backend skeleton.

## Product flow

The final five-phase prototype follows one connected journey:

`Location → Map/Train/Bus → DY Patil → Ticket Scan → Live Crowd → Gate/Volunteer Response → Venue Floor Plan → Venue Resources → Hotels/Restaurants/Transport → Recommendations`

The user can also enter any relevant feature directly. The underlying event state remains shared.

## Phase 1

See `PHASE_1.md` for setup and the exact Phase 1 scope.

### Important security rule

Frontend variables may contain only the Supabase URL and anon/publishable key. The Supabase service-role key and database password must never be shipped to the browser. The FastAPI backend accepts the service-role key only through its server-side `.env`.

## Development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Database:

```text
supabase_phase1.sql
supabase_phase1_seed.sql (optional)
```

## Phase 2
See `PHASE_2.md`. Phase 2 adds the attendee journey planner, browser location capture, Dombivli → D.Y. Patil route preview, structured train/bus/shuttle schedules, journey persistence APIs, and Supabase transport/journey tables. Phase 3 remains the live ticket-scan/crowd/volunteer engine.

## Phase 4 — Dynamic Venue + Resource Layer

Phase 4 makes the DY Patil floor-plan experience database/API driven and removes the remaining mock-data/local-storage paths from the operational product flows. Venue resources, parking, hotels, restaurants, partner availability and partner requests are stored in Supabase and exposed through FastAPI. Internal navigation is calculated from database map coordinates. Supabase Realtime refreshes venue/resource changes for connected clients.

Run `supabase_phase4.sql` after the Phase 1–3 migrations/seeds.
