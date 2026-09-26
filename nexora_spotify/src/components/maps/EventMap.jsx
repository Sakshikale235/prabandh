import React from 'react';
import { Layers, MapPin, Minus, Plus, Utensils, HeartPulse, Droplets, Car, Users, Store, Navigation } from 'lucide-react';
import mapImg from '../../assets/venue-map.jpg';
import {useEventData} from '../../context/EventDataContext';
import {useLiveEvent} from '../../context/LiveEventContext';
const toneClass=v=>v>=85?'#ff7178':v>=70?'#ffcf51':'#5cffb0';
const iconFor=t=>({food:<Store/>,medical:<HeartPulse/>,washroom:<Droplets/>,water:<Droplets/>,parking:<Car/>,information:<Navigation/>}[String(t||'').toLowerCase()]||<MapPin/>);
export default function EventMap({compact=false,highlightId}){
 const {venueLocations,gates}=useEventData(); const {state}=useLiveEvent();
 const stateByGate=Object.fromEntries((state?.gates||[]).map(g=>[g.id,g.live]));
 return <div className={`event-map ${compact?'compact':''}`}>
  <img src={mapImg} alt="DY Patil Stadium floor plan"/><div className="map-shade"/>
  <div className="map-controls"><button><Plus size={17}/></button><button><Minus size={17}/></button><button><Layers size={17}/></button></div>
  {gates.map(g=>{const val=Number(stateByGate[g.id]?.occupancy_percent||0);return <div key={g.id} className="map-pin" style={{left:`${g.map_x||50}%`,top:`${g.map_y||50}%`,background:toneClass(val),outline:highlightId===g.id?'3px solid #fff':'none'}} title={`${g.name} · ${val.toFixed(1)}%`}>{g.name.replace('Gate ','')}</div>})}
  {venueLocations.filter(r=>r.map_x!=null&&r.map_y!=null).map(r=><div key={r.id} className="map-resource-pin" style={{left:`${r.map_x}%`,top:`${r.map_y}%`}} title={r.name}>{iconFor(r.resource_type)}</div>)}
  <div className="map-stage">STAGE</div><div className="map-me">● CURRENT LOCATION</div>
  {!compact&&<div className="map-legend"><span><MapPin/> Gate</span><span><Utensils/> Food</span><span><Users/> Crowd</span><span><HeartPulse/> Medical</span><span><Droplets/> Water</span><span><Car/> Parking</span></div>}
 </div>;
}
