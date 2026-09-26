import React from 'react';
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, MapPin, ScanLine, Users, WandSparkles } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EventMap from '../../components/maps/EventMap';
import { useLiveEvent } from '../../context/LiveEventContext';
import hero from '../../assets/concert-hero.jpg';
export default function Dashboard(){
 const {state,loading,error}=useLiveEvent();
 if(loading&&!state)return <div className="empty-state">Connecting to the PRABANDH live event engine…</div>;
 const gates=state?.gates||[]; const busiest=[...gates].sort((a,b)=>(b.live?.occupancy_percent||0)-(a.live?.occupancy_percent||0))[0];
 return <><PageHeader eyebrow="ORGANIZER · COMMAND CENTER" title="Your event, at a glance." subtitle="Monitor verified entry, gate pressure, volunteers and operational recommendations from one live workspace." action={<a className="primary-btn" href="/organizer/live-entry"><ScanLine size={16}/> Open live scanner</a>}/>
 {error&&<div className="login-alert error">{error}</div>}
 <section className="hero-card compact-hero"><img src={hero}/><div className="hero-overlay"/><div className="hero-copy"><span className="eyebrow">LIVE · DATABASE CONNECTED</span><h2>{state?.event?.name||'Coldplay — Music Of The Spheres'}</h2><p><MapPin/> DY Patil Stadium · Navi Mumbai · <Users/> {Number(state?.metrics?.total_entries||0).toLocaleString()} verified entries</p></div></section>
 <div className="stats-row"><StatCard icon={<Users/>} title="Verified entries" value={Number(state?.metrics?.total_entries||0).toLocaleString()} meta={`${Number(state?.metrics?.venue_occupancy_percent||0).toFixed(1)}% gate capacity`} trend/><StatCard icon={<Activity/>} title="Pressure gates" value={String(gates.filter(g=>['busy','high','critical'].includes(g.live?.pressure)).length)} meta="live attention required"/><StatCard icon={<MapPin/>} title={busiest?.name||'Gate'} value={busiest?`${Number(busiest.live.occupancy_percent).toFixed(1)}%`:'—'} meta={busiest?.live?.pressure||'normal'}/><StatCard icon={<CalendarDays/>} title="Open alerts" value={String(state?.metrics?.open_alerts||0)} meta="database operations"/></div>
 <div className="content-grid two-one"><section className="panel map-panel"><div className="panel-head"><div><h3>Live venue pulse</h3><p>Gate state is calculated from ticket scans and shared with attendee/volunteer clients.</p></div><span className="live-pill">● REALTIME</span></div><EventMap/><div className="pressure-grid">{gates.map(g=><div key={g.id}><span>{g.name}</span><b className={g.live?.pressure==='normal'?'green':g.live?.pressure==='busy'?'amber':'red'}>{Number(g.live?.occupancy_percent||0).toFixed(1)}%</b></div>)}</div></section>
 <section className="panel"><div className="panel-head"><div><h3><WandSparkles/> PRABANDH response</h3><p>Only live database recommendations appear here.</p></div></div>{(state?.recommendations||[]).slice(0,4).map(r=><div className="alert-item amber" key={r.id}><AlertTriangle/><div><b>{r.title}</b><p>{r.reason}</p></div></div>)}{!(state?.recommendations||[]).length&&<div className="alert-item green"><CheckCircle2/><div><b>Operations stable</b><p>No pending recommendation from the live engine.</p></div></div>}</section></div></>;
}
