from datetime import datetime, timezone
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from ..config import GOOGLE_MAPS_API_KEY
from ..supabase import get_supabase

router = APIRouter(prefix='/journeys', tags=['journeys'])
EVENT_SLUG = 'coldplay-dy-patil'
DESTINATION = 'DY Patil Stadium, Navi Mumbai'
DEMO_DESTINATION = 'DY Patil Stadium'

class JourneyCreate(BaseModel):
    origin: str = Field(min_length=1, max_length=120)
    destination: str = Field(default=DEMO_DESTINATION, min_length=1, max_length=120)
    event_slug: str = Field(default=EVENT_SLUG, min_length=1, max_length=120)
    location: dict | None = None
    selected_mode: str | None = None
    selected_schedule_id: str | None = None

def _demo_plan(origin: str):
    return {
        'origin': origin, 'destination': DESTINATION, 'distance': '39.4 km', 'duration': '1h 38m', 'arrival': '11:20 AM', 'provider': 'demo',
        'steps': [
            {'mode':'Train','from':origin,'to':'Vashi','detail':'Board the 10:08 service','duration':'36 min'},
            {'mode':'Transfer','from':'Vashi station','to':'Vashi event interchange','detail':'Walk to the event-service interchange','duration':'8 min'},
            {'mode':'Bus','from':'Vashi','to':'D.Y. Patil Stadium','detail':'NMMT event service','duration':'48 min'},
            {'mode':'Walk','from':'Stadium approach','to':'Event entry area','detail':'Final approach; live gate recommendation is applied in Phase 3','duration':'6 min'},
        ],
        'map_url': f'https://www.google.com/maps/dir/?api=1&origin={quote(origin)}&destination={quote(DESTINATION)}'
    }

def _resolve_event(event_slug: str):
    result = get_supabase().table('events').select('id,slug,name').eq('slug', event_slug).maybe_single().execute()
    return result.data if result.data else None

def _user_from_bearer(authorization: str | None):
    if not authorization or not authorization.lower().startswith('bearer '):
        return None
    token = authorization.split(' ',1)[1].strip()
    if not token:
        return None
    try:
        return get_supabase().auth.get_user(token).user
    except Exception:
        return None

@router.get('/plan')
def plan(origin: str = Query(..., min_length=1), destination: str = Query(DEMO_DESTINATION), latitude: float | None = None, longitude: float | None = None):
    # Google Directions is optional and server-side only. Without it, the deterministic event-demo route is returned explicitly as demo data.
    if GOOGLE_MAPS_API_KEY and latitude is not None and longitude is not None:
        try:
            params = {'origin': f'{latitude},{longitude}', 'destination': DESTINATION, 'mode':'transit', 'key':GOOGLE_MAPS_API_KEY}
            with httpx.Client(timeout=8.0) as client:
                response = client.get('https://maps.googleapis.com/maps/api/directions/json', params=params)
            response.raise_for_status()
            data = response.json()
            if data.get('status') == 'OK' and data.get('routes'):
                leg = data['routes'][0]['legs'][0]
                return {
                    'origin': origin, 'destination': DESTINATION, 'distance': leg['distance']['text'], 'duration': leg['duration']['text'],
                    'arrival': None, 'provider':'google_directions',
                    'steps':[{'mode':(s.get('travel_mode') or 'TRANSIT').title(), 'from':s.get('start_address',''), 'to':s.get('end_address',''), 'detail':s.get('html_instructions',''), 'duration':s.get('duration',{}).get('text','')} for s in leg.get('steps',[])],
                    'map_url': f'https://www.google.com/maps/dir/?api=1&origin={quote(origin)}&destination={quote(DESTINATION)}'
                }
        except Exception:
            pass
    return _demo_plan(origin)

@router.post('')
def create_journey(payload: JourneyCreate, authorization: str | None = Header(default=None)):
    user = _user_from_bearer(authorization)
    if not user:
        raise HTTPException(status_code=401, detail='Authenticated attendee session required to save a journey.')
    try:
        event = _resolve_event(payload.event_slug)
        if not event:
            raise HTTPException(status_code=404, detail='Event not found')
        row = {
            'user_id': user.id, 'event_id': event['id'], 'origin_label': payload.origin, 'destination_label': payload.destination,
            'origin_lat': (payload.location or {}).get('lat'), 'origin_lng': (payload.location or {}).get('lng'),
            'selected_mode': payload.selected_mode, 'selected_schedule_id': payload.selected_schedule_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
        result = get_supabase().table('journeys').insert(row).execute()
        return result.data[0] if result.data else row
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail='Journey could not be saved.') from exc
