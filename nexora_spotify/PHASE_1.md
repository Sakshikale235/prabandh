# PRABANDH — Phase 1: Foundation

This package keeps the supplied Spotify-themed React UI as the visual base and adds the production foundation required for the five-phase PRABANDH prototype.

## Included

- Supabase Auth with persistent sessions and role-aware routing.
- Roles: organizer, attendee, partner, volunteer.
- Supabase/Postgres foundation for events, venues, zones, gates, venue resources, partners and transport schedules.
- Row Level Security policies and auth profile trigger.
- Realtime publication foundation for event/gate/resource/partner changes.
- FastAPI backend skeleton with `/api/health` and `/api/events`.
- Deterministic Coldplay / DY Patil seed data for the demo.
- Upgraded PRABANDH login UI aligned to the existing dark/Spotify-inspired product language.
- Existing mock-data experience remains available as UI fallback while later phases replace each operational surface with API/realtime state.

## Setup

### Frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set only the browser-safe Supabase values in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or Supabase publishable key)

Never put `service_role`, a database password, or a Postgres connection string into the Vite frontend.

### Database

Run in Supabase SQL Editor:

1. `supabase_phase1.sql`
2. `supabase_phase1_seed.sql` (optional demo data)

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Windows
# or cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Backend-only environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS`

The service-role key belongs only on the backend/server. It is intentionally not bundled in the frontend ZIP.

## Five-phase contract

1. **Foundation** — this package: auth, roles, database, API/realtime base.
2. **Attendee Journey** — location, maps, train/bus schedules and Dombivli → DY Patil journey.
3. **Live Event Intelligence** — ticket scans, crowd pressure, gate redirection and volunteer response.
4. **Smart Venue** — leaflet/floor plan, stalls/resources and indoor navigation.
5. **Resource Ecosystem + Intelligence** — hotels, restaurants, partner availability, discounts and multi-factor recommendations.

The phases share one backend/database. A user may enter a feature directly; the features remain connected through the event state.
