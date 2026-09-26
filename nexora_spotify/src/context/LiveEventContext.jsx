import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/api';

const Ctx = createContext(null);
const EVENT_SLUG = 'coldplay-dy-patil';

export function LiveEventProvider({ children }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState(null);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const next = await apiFetch(`/api/operations/state?event_slug=${encodeURIComponent(EVENT_SLUG)}`);
      setState(next);
    } catch (err) {
      setError(err.message || 'Live operations are unavailable.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer); }, [refresh]);

  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase.channel(`prabandh-live-${EVENT_SLUG}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_live_state' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_scans' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_alerts' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recommendations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteer_assignments' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const scanTicket = useCallback(async (gateId, ticketReference) => {
    const result = await apiFetch('/api/operations/ticket-scan', { method:'POST', body: JSON.stringify({ gate_id: gateId, ticket_reference: ticketReference || undefined, event_slug: EVENT_SLUG }) });
    setLastAction({ type:'scan', at:new Date().toISOString(), result });
    await refresh();
    return result;
  }, [refresh]);

  const simulateSurge = useCallback(async (gateId, count = 100) => {
    const result = await apiFetch('/api/operations/crowd-surge', { method:'POST', body: JSON.stringify({ gate_id: gateId, count, event_slug: EVENT_SLUG }) });
    setLastAction({ type:'surge', at:new Date().toISOString(), result });
    await refresh();
    return result;
  }, [refresh]);

  const assignVolunteer = useCallback(async (gateId, volunteerName) => {
    const result = await apiFetch('/api/operations/volunteers/assign', { method:'POST', body: JSON.stringify({ gate_id: gateId, volunteer_name: volunteerName, event_slug: EVENT_SLUG }) });
    setLastAction({ type:'volunteer', at:new Date().toISOString(), result });
    await refresh();
    return result;
  }, [refresh]);

  const acknowledgeAlert = useCallback(async (alertId) => {
    const result = await apiFetch(`/api/operations/alerts/${alertId}/ack`, { method:'POST' });
    await refresh();
    return result;
  }, [refresh]);

  const value = useMemo(() => ({ state, loading, error, refresh, scanTicket, simulateSurge, assignVolunteer, acknowledgeAlert, lastAction }), [state, loading, error, refresh, scanTicket, simulateSurge, assignVolunteer, acknowledgeAlert, lastAction]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLiveEvent() { const ctx = useContext(Ctx); if (!ctx) throw new Error('useLiveEvent must be used within LiveEventProvider'); return ctx; }
