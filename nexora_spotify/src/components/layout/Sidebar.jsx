import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Bell, BusFront, CalendarDays, ChevronRight, Heart, LayoutDashboard, Map, MapPinned, Navigation, Radio, Route, Users, Utensils, WandSparkles } from 'lucide-react';

const menus={
 organizer:[['Overview','/organizer',LayoutDashboard],['Live Entry','/organizer/live-entry',Radio],['Crowd Pulse','/organizer/crowd',Activity],['Venue Map','/organizer/venue',MapPinned],['Volunteers','/organizer/volunteers',Users],['PRABANDH AI','/organizer/recommendations',WandSparkles]],
 attendee:[['Home','/attendee',LayoutDashboard],['Journey Planner','/attendee/journey',Route],['Event Map','/attendee/map',Map],['Transport','/attendee/transport',BusFront],['Restaurants','/attendee/restaurants',Utensils],['Navigation','/attendee/navigation',Navigation]],
 partner:[['Dashboard','/partner',LayoutDashboard],['Availability','/partner/availability',Radio],['Requests','/partner/requests',Bell]],
 volunteer:[['My Assignment','/volunteer',LayoutDashboard],['Venue Map','/attendee/map',MapPinned],['Live Updates','/organizer/crowd',Activity]]
};
export default function Sidebar({role}){return <aside className="sidebar">
  <div className="spotify-mark">P</div>
  <div className="brand"><strong>PRABANDH</strong><span>EVENT INTELLIGENCE</span></div>
  <nav className="side-nav"><div className="nav-caption">{role.toUpperCase()} SPACE</div>{menus[role].map(([label,path,Icon])=><NavLink key={label} to={path} end={path===`/${role}`} className={({isActive})=>'side-link '+(isActive?'active':'')}><Icon size={19}/><span>{label}</span><ChevronRight size={15} className="side-chevron"/></NavLink>)}</nav>
  <div className="divider"/>
  <div className="nav-caption">YOUR EVENT</div>
  <div className="side-static"><CalendarDays size={18}/><span>18 Jan · Coldplay</span></div>
  <div className="side-static"><Route size={18}/><span>58,420 attendees</span></div>
  <div className="sidebar-spacer"/>
  <div className="mini-player"><div className="mini-art"></div><div><b>Coldplay · Live</b><small>Event atmosphere</small></div><Heart size={16}/></div>
  <div className="player-line"><span></span></div><div className="player-time"><small>LIVE</small><small>DY PATIL</small></div>
  <div className="side-footer">● LIVE DATA <span>Phase 3</span></div>
</aside>}
