import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext(null);
const roles = ['organizer', 'attendee', 'partner', 'volunteer'];

async function loadProfile(user) {
  if (!user || !supabase) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data || null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (nextSession) => {
    setSession(nextSession);
    if (nextSession?.user) {
      const nextProfile = await loadProfile(nextSession.user);
      setProfile(nextProfile);
      if (nextProfile?.role) localStorage.setItem('prabandh_role', nextProfile.role);
    } else {
      setProfile(null);
      localStorage.removeItem('prabandh_role');
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      await hydrate(data.session);
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await hydrate(nextSession);
      if (active) setLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [hydrate]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.') };
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, role }) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    if (!roles.includes(role)) return { error: new Error('Invalid PRABANDH role.') };
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } }
    });
  }, []);

  const signOut = useCallback(() => supabase?.auth.signOut(), []);

  const value = useMemo(() => ({
    session, user: session?.user || null, profile, loading, configured: supabaseConfigured,
    role: profile?.role || session?.user?.user_metadata?.role || localStorage.getItem('prabandh_role') || null,
    signIn, signUp, signOut
  }), [session, profile, loading, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
