import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import {apiFetch} from '../lib/api';
import {useAuth} from './AuthContext';

const Ctx=createContext(null);
const EVENT_SLUG='coldplay-dy-patil';

export function EventDataProvider({children}){
  const {session}=useAuth();
  const [venueLocations,setVenueLocations]=useState([]);
  const [venue,setVenue]=useState(null);
  const [zones,setZones]=useState([]);
  const [gates,setGates]=useState([]);
  const [hotels,setHotels]=useState([]);
  const [restaurants,setRestaurants]=useState([]);
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [lastUpdated,setLastUpdated]=useState(null);

  const refresh=useCallback(async()=>{
    if(!session?.access_token){setLoading(false);return;}
    setError('');
    try{
      const [v,h,r,req]=await Promise.all([
        apiFetch(`/api/resources/venue?event_slug=${EVENT_SLUG}`),
        apiFetch(`/api/resources/external?event_slug=${EVENT_SLUG}&partner_type=hotel`),
        apiFetch(`/api/resources/external?event_slug=${EVENT_SLUG}&partner_type=restaurant`),
        apiFetch(`/api/resources/requests?event_slug=${EVENT_SLUG}`)
      ]);
      setVenue(v.venue||null);setZones(v.zones||[]);setGates(v.gates||[]);setVenueLocations(v.resources||[]);
      setHotels(h.items||[]);setRestaurants(r.items||[]);setRequests(req||[]);setLastUpdated(new Date());
    }catch(e){setError(e.message||'Unable to load live event resources.');}
    finally{setLoading(false)}
  },[session?.access_token]);

  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{
    if(!supabase||!session) return;
    const channel=supabase.channel(`prabandh-resources-${EVENT_SLUG}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'venue_resources'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'partner_availability'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'partner_requests'},refresh)
      .subscribe();
    const timer=setInterval(refresh,30000);
    return()=>{clearInterval(timer);supabase.removeChannel(channel)};
  },[session,refresh]);

  const addLocation=useCallback(async(loc)=>{
    const row=await apiFetch('/api/resources/venue/locations',{method:'POST',body:JSON.stringify({...loc,event_slug:EVENT_SLUG})});
    setVenueLocations(v=>[...v,row]);return row;
  },[]);
  const removeLocation=useCallback(async(id)=>{
    await apiFetch(`/api/resources/venue/locations/${id}`,{method:'DELETE'});setVenueLocations(v=>v.filter(x=>x.id!==id));
  },[]);
  const publishHotelRooms=useCallback(async(name,rooms)=>{
    const p=hotels.find(x=>x.name===name);if(!p) throw new Error('Hotel partner not found.');
    const a=p.availability||{};
    await apiFetch('/api/resources/external/availability',{method:'POST',body:JSON.stringify({partner_id:p.id,event_slug:EVENT_SLUG,available_units:rooms,capacity:a.capacity||rooms,wait_minutes:a.wait_minutes||0,discount_percent:a.discount_percent||0,status:rooms>0?'available':'sold_out'})});
    await refresh();
  },[hotels,refresh]);
  const publishRestaurantStatus=useCallback(async(name,wait,capacity,stallStatus)=>{
    const p=restaurants.find(x=>x.name===name);if(!p) throw new Error('Restaurant partner not found.');
    const a=p.availability||{};
    await apiFetch('/api/resources/external/availability',{method:'POST',body:JSON.stringify({partner_id:p.id,event_slug:EVENT_SLUG,available_units:a.available_units??capacity,capacity:Number(String(capacity).replace('%',''))||a.capacity||100,wait_minutes:wait,discount_percent:a.discount_percent||0,status:stallStatus==='TEMPORARILY CLOSED'?'closed':stallStatus==='BUSY'?'busy':'available'})});
    await refresh();
  },[restaurants,refresh]);
  const respondRequest=useCallback(async(id,accept)=>{await apiFetch(`/api/resources/requests/${id}`,{method:'POST',body:JSON.stringify({accepted:accept})});await refresh();},[refresh]);
  const navigation=useCallback(async(resourceId,fromResourceId)=>apiFetch(`/api/resources/navigation?event_slug=${EVENT_SLUG}&resource_id=${encodeURIComponent(resourceId)}${fromResourceId?`&from_resource_id=${encodeURIComponent(fromResourceId)}`:''}`),[]);
  const parking=venueLocations.filter(x=>x.resource_type==='parking');
  const value=useMemo(()=>({venue,zones,gates,venueLocations,parking,hotels,restaurants,requests,loading,error,lastUpdated,refresh,addLocation,removeLocation,publishHotelRooms,publishRestaurantStatus,respondRequest,navigation}),[venue,zones,gates,venueLocations,parking,hotels,restaurants,requests,loading,error,lastUpdated,refresh,addLocation,removeLocation,publishHotelRooms,publishRestaurantStatus,respondRequest,navigation]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useEventData(){const c=useContext(Ctx);if(!c) throw new Error('useEventData must be used within EventDataProvider');return c;}
