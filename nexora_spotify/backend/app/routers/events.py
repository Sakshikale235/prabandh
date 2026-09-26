from fastapi import APIRouter, HTTPException
from ..supabase import get_supabase

router = APIRouter(prefix='/events', tags=['events'])

@router.get('')
def list_events():
    try:
        result = get_supabase().table('events').select('*').order('created_at', desc=True).execute()
        return result.data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@router.get('/{event_id}')
def get_event(event_id: str):
    try:
        result = get_supabase().table('events').select('*').eq('id', event_id).single().execute()
        return result.data
    except Exception as exc:
        raise HTTPException(status_code=404, detail='Event not found') from exc
