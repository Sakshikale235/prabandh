import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {apiFetch} from '../lib/api';
import {useAuth} from './AuthContext';

const Ctx=createContext(null);
const EVENT_SLUG='coldplay-dy-patil';
const DESTINATION='DY Patil Stadium, Navi Mumbai';

const normalizeSchedule=s=>({...s,mode:{train:'Train',bus:'Bus',shuttle:'Shuttle',metro:'Metro',cab:'Cab',walk:'Walk'}[(s?.mode||'').toLowerCase()]||s?.mode});

export function JourneyProvider({children}){
 const {session}=useAuth();
 const [origin,setOrigin]=useState('Dombivli'); const [location,setLocation]=useState(null);
 const [schedules,setSchedules]=useState([]); const [route,setRoute]=useState(null); const [loading,setLoading]=useState(false);
 const [source,setSource]=useState('live'); const [error,setError]=useState(''); const [selectedMode,setSelectedMode]=useState('All');
 const [lastUpdated,setLastUpdated]=useState(null); const [selectedSchedule,setSelectedSchedule]=useState(null);
 const load=useCallback(async()=>{
  if(!session?.access_token){setLoading(false);return;} setLoading(true);setError('');
  try{const locationQuery=location?`&latitude=${location.lat}&longitude=${location.lng}`:'';
   const [s,r]=await Promise.all([apiFetch(`/api/transport/schedules?event=${EVENT_SLUG}`),apiFetch(`/api/journeys/plan?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(DESTINATION)}${locationQuery}`)]);
   setSchedules((s||[]).map(normalizeSchedule));setRoute(r);setSource(r?.provider||'live');setLastUpdated(new Date());
  }catch(e){setError(e.message||'Live journey data unavailable.');setSchedules([]);setRoute(null);setSource('unavailable');}
  finally{setLoading(false)}
 },[session?.access_token,origin,location]);
 useEffect(()=>{load()},[load]);
 useEffect(()=>{const timer=setInterval(load,30000);return()=>clearInterval(timer)},[load]);
 const useBrowserLocation=useCallback(()=>{if(!navigator.geolocation){setError('Browser location is not available.');return;}navigator.geolocation.getCurrentPosition(p=>{setLocation({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)});setOrigin('My current location');},()=>setError('Location permission was not granted.'),{enableHighAccuracy:true,timeout:8000,maximumAge:30000})},[]);
 const filtered=useMemo(()=>selectedMode==='All'?schedules:schedules.filter(s=>s.mode===selectedMode),[schedules,selectedMode]);
 const saveJourney=useCallback(async(schedule=selectedSchedule)=>apiFetch('/api/journeys',{method:'POST',body:JSON.stringify({origin,destination:DESTINATION,event_slug:EVENT_SLUG,location,selected_mode:schedule?.mode||null,selected_schedule_id:schedule?.id||null})}),[origin,location,selectedSchedule]);
 return <Ctx.Provider value={{origin,setOrigin,location,useBrowserLocation,schedules:filtered,allSchedules:schedules,route,loading,source,error,selectedMode,setSelectedMode,lastUpdated,reload:load,saveJourney,event:null,transport:[],selectedSchedule,setSelectedSchedule}}>{children}</Ctx.Provider>
}
export function useJourney(){const c=useContext(Ctx);if(!c)throw new Error('useJourney must be used within JourneyProvider');return c}
