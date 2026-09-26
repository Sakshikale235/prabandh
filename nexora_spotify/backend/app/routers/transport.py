from fastapi import APIRouter, HTTPException, Query
from ..supabase import get_supabase

router = APIRouter(prefix='/transport', tags=['transport'])

EVENT_SLUG = 'coldplay-dy-patil'
def _present_schedule(row):
    if not row:
        return row
    out = dict(row)
    mode = str(out.get('mode') or '').lower()
    out['mode'] = {'train':'Train','bus':'Bus','shuttle':'Shuttle','metro':'Metro','cab':'Cab','walk':'Walk'}.get(mode, str(out.get('mode') or '').title())
    return out

DEMO_SCHEDULES = [
    {'id':'demo-tr-0942','mode':'Train','operator':'Central Railway','service':'Dombivli → Vashi','departure':'09:42','arrival':'10:18','duration':'36 min','status':'On schedule','frequency':'Scheduled','source':'demo'},
    {'id':'demo-tr-1008','mode':'Train','operator':'Central Railway','service':'Dombivli → Vashi','departure':'10:08','arrival':'10:44','duration':'36 min','status':'On schedule','frequency':'Scheduled','source':'demo'},
    {'id':'demo-tr-1032','mode':'Train','operator':'Central Railway','service':'Dombivli → Vashi','departure':'10:32','arrival':'11:08','duration':'36 min','status':'On schedule','frequency':'Scheduled','source':'demo'},
    {'id':'demo-bus-1015','mode':'Bus','operator':'NMMT','service':'Vashi → DY Patil Stadium','departure':'10:15','arrival':'11:05','duration':'50 min','status':'Moderate','frequency':'Event service','source':'demo'},
    {'id':'demo-bus-1030','mode':'Bus','operator':'NMMT','service':'Vashi → DY Patil Stadium','departure':'10:30','arrival':'11:18','duration':'48 min','status':'Regular','frequency':'Event service','source':'demo'},
    {'id':'demo-sh-1045','mode':'Shuttle','operator':'PRABANDH Event Shuttle','service':'Vashi → DY Patil Stadium','departure':'10:45','arrival':'11:20','duration':'35 min','status':'3 buses active','frequency':'Event service','source':'demo'},
]

@router.get('/schedules')
def schedules(event: str = Query(EVENT_SLUG)):
    try:
        result = get_supabase().table('transport_schedules').select('*').eq('event_key', event).eq('active', True).order('departure').execute()
        rows = result.data or []
        if rows:
            return [_present_schedule(row) for row in rows]
    except Exception:
        pass
    return DEMO_SCHEDULES if event == EVENT_SLUG else []

@router.get('/stops')
def stops():
    try:
        result = get_supabase().table('transport_stops').select('*').eq('active', True).order('name').execute()
        return result.data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail='Transport data unavailable') from exc
