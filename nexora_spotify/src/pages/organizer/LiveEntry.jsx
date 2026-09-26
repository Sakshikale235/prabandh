import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, Radio, ScanLine, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { useLiveEvent } from '../../context/LiveEventContext';

function pressureTone(p){ return p==='critical'?'red':p==='high'?'red':p==='busy'?'amber':'green'; }

export default function LiveEntry(){
  const {state,loading,error,scanTicket,simulateSurge,lastAction}=useLiveEvent();
  const [gateId,setGateId]=useState('');
  const [ticket,setTicket]=useState('');
  const [busy,setBusy]=useState(false);
  const gates=state?.gates||[];
  const selectedGate=useMemo(()=>gates.find(g=>g.id===gateId)||gates[0], [gates,gateId]);
  const submit=async()=>{ if(!selectedGate) return; setBusy(true); try{await scanTicket(selectedGate.id,ticket);setTicket('');}finally{setBusy(false)} };
  const surge=async()=>{ if(!selectedGate)return;setBusy(true);try{await simulateSurge(selectedGate.id,100)}finally{setBusy(false)} };
  if(loading&&!state) return <div className="empty-state">Connecting to live event operations…</div>;
  return <>
    <PageHeader eyebrow="ORGANIZER · LIVE ENTRY" title="Ticket Scanner" subtitle="Every verified scan becomes a live entry event and immediately recalculates gate pressure." action={<span className="live-pill"><Radio size={13}/> LIVE · REALTIME</span>}/>
    {error&&<div className="login-alert error">{error}. Start the FastAPI backend and apply <code>supabase_phase3.sql</code> before operating the scanner.</div>}
    <div className="live-entry-grid">
      <section className="panel scanner-panel">
        <div className="panel-head"><div><h3><ScanLine/> Live Entry Scanner</h3><p>Use one scan for a single attendee or simulate a controlled surge for the demo.</p></div><span className="source-pill">DATABASE EVENT</span></div>
        <label className="ops-label">Gate<select value={selectedGate?.id||''} onChange={e=>setGateId(e.target.value)}>{gates.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label className="ops-label">Ticket reference<input value={ticket} onChange={e=>setTicket(e.target.value)} placeholder="CP-847291 · optional"/></label>
        <div className="scanner-actions"><button className="primary-btn" disabled={busy||!selectedGate} onClick={submit}><ScanLine size={17}/> Scan valid ticket</button><button className="outline-btn" disabled={busy||!selectedGate} onClick={surge}><Zap size={17}/> Simulate 100 scans</button></div>
        <div className="scanner-note"><ShieldCheck size={16}/><div><b>Verified entry trigger</b><small>One click inserts a real ticket_scans row, updates gate_live_state, writes a crowd snapshot and can create an operational alert/recommendation.</small></div></div>
        {lastAction&&<div className="planned-banner"><CheckCircle2 size={16}/><div><b>{lastAction.type==='scan'?'Ticket scan accepted':'Crowd surge processed'}</b><small>Live state refreshed from Supabase.</small></div></div>}
      </section>
      <section className="panel"><div className="panel-head"><div><h3><Activity/> Gate control</h3><p>Current database state, not browser mock data.</p></div></div><div className="ops-gate-grid">{gates.map(g=><div className={`ops-gate-card ${pressureTone(g.live.pressure)}`} key={g.id}><div><span>{g.name}</span><b>{Number(g.live.occupancy_percent||0).toFixed(1)}%</b></div><div className="ops-progress"><i style={{width:`${Math.min(100,Number(g.live.occupancy_percent||0))}%`}}/></div><small>{Number(g.live.current_entries||0).toLocaleString()} / {Number(g.capacity||0).toLocaleString()} entries · {g.live.pressure}</small><small>{Number(g.live.scan_velocity_per_minute||0).toFixed(1)} scans/min</small></div>)}</div></section>
    </div>
    <div className="content-grid two-one">
      <section className="panel"><div className="panel-head"><div><h3><Sparkles/> PRABANDH response</h3><p>Recommendations generated from live pressure.</p></div></div>{(state?.recommendations||[]).slice(0,5).map(r=><div className="alert-item amber" key={r.id}><Sparkles/><div><b>{r.title}</b><p>{r.reason}</p><small>{r.priority.toUpperCase()} · pending</small></div></div>)}{!(state?.recommendations||[]).length&&<div className="empty-state">No pending recommendation. Scan traffic to generate one.</div>}</section>
      <section className="panel"><div className="panel-head"><div><h3><Users/> Live metrics</h3><p>Event-wide operational state.</p></div></div><div className="stats-row compact"><div className="stat-card"><div className="stat-icon"><Users/></div><div><span>Total entries</span><strong>{Number(state?.metrics?.total_entries||0).toLocaleString()}</strong><small>{Number(state?.metrics?.venue_occupancy_percent||0).toFixed(1)}% of gate capacity</small></div></div><div className="stat-card"><div className="stat-icon"><Activity/></div><div><span>Open alerts</span><strong>{state?.metrics?.open_alerts||0}</strong><small>from live event engine</small></div></div></div></section>
    </div>
  </>;
}
