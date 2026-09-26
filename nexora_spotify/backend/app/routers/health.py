from fastapi import APIRouter
from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_MAPS_API_KEY

router = APIRouter(prefix='/health', tags=['health'])

@router.get('')
def health():
    return {
        'status': 'ok',
        'service': 'prabandh-api',
        'phase': 2,
        'supabase_configured': bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
        'routing_provider': 'google_directions' if GOOGLE_MAPS_API_KEY else 'deterministic_demo'
    }
