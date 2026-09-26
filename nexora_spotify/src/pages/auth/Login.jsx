import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, MapPin, Radio, ShieldCheck, Sparkles, TrainFront, Users } from 'lucide-react';
import hero from '../../assets/concert-hero.jpg';
import { useAuth } from '../../context/AuthContext';

const roles = [
  { id: 'attendee', label: 'Attendee', icon: Users, copy: 'Plan your journey and navigate the venue.' },
  { id: 'organizer', label: 'Organizer', icon: Radio, copy: 'Monitor gates, crowds and operations.' },
  { id: 'partner', label: 'Partner', icon: Sparkles, copy: 'Publish availability and offers.' },
  { id: 'volunteer', label: 'Volunteer', icon: ShieldCheck, copy: 'See assignments and live updates.' }
];

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [role, setRole] = useState('attendee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const nav = useNavigate();
  const location = useLocation();
  const { signIn, signUp, configured } = useAuth();

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setMessage(''); setBusy(true);
    try {
      const result = mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp({ email: email.trim(), password, fullName: fullName.trim(), role });
      if (result?.error) throw result.error;
      if (mode === 'signup') {
        setMessage('Account created. Check your email if confirmation is enabled, then sign in.');
        setMode('signin');
      } else {
        nav(location.state?.from?.pathname || `/${role}`, { replace: true });
      }
    } catch (e) {
      setError(e?.message || 'Authentication failed.');
    } finally { setBusy(false); }
  };

  return <main className="login-page">
    <img src={hero} className="login-bg" alt="Coldplay event atmosphere" />
    <div className="login-gradient" />
    <div className="login-noise" />

    <section className="login-shell">
      <div className="login-branding">
        <div className="login-brand-row"><div className="login-mark">P</div><div><b>PRABANDH</b><span>EVENT INTELLIGENCE</span></div></div>
        <div className="login-kicker"><span className="live-dot"/> LIVE EVENT ORCHESTRATION</div>
        <h1>From chaos<br/><em>to coordination.</em></h1>
        <p>One connected layer for journeys, gates, crowds, venue resources and event partners.</p>
        <div className="login-feature-list">
          <div><MapPin size={16}/><span><b>Journey aware</b><small>Dombivli → DY Patil</small></span></div>
          <div><TrainFront size={16}/><span><b>Live transport context</b><small>Train, bus & route options</small></span></div>
          <div><Radio size={16}/><span><b>Real-time operations</b><small>Gate pressure & volunteer response</small></span></div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-card-top"><div><span className="eyebrow">PRABANDH ACCESS</span><h2>{mode === 'signin' ? 'Welcome back' : 'Create your workspace'}</h2></div><div className="secure-pill"><LockKeyhole size={13}/> Secure</div></div>

        <div className="login-segment"><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Create account</button></div>

        <div className="login-role-grid">{roles.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={role === id ? 'role-card active' : 'role-card'} onClick={() => setRole(id)}><Icon size={17}/><span>{label}</span>{role === id && <i/>}</button>)}</div>

        <form onSubmit={submit}>
          {mode === 'signup' && <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" required /></label>}
          <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required /></label>
          <label>Password<div className="password-wrap"><input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="••••••••" minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          {error && <div className="login-alert error">{error}</div>}
          {message && <div className="login-alert success">{message}</div>}
          {!configured && <div className="login-alert warning">Supabase is not configured yet. Add the frontend anon/publishable key in <code>.env.local</code>.</div>}
          <button className="login-submit" disabled={busy || !configured}>{busy ? 'Connecting…' : mode === 'signin' ? `Enter ${roles.find(r => r.id === role)?.label} workspace` : 'Create PRABANDH account'}<ArrowRight size={18}/></button>
        </form>
        <div className="login-trust"><ShieldCheck size={14}/><span>Your role and session are managed by Supabase Auth. No service-role key is exposed in the browser.</span></div>
      </div>
    </section>
    <footer className="login-footer"><span>PRABANDH · COLDPLAY / DY PATIL PROTOTYPE</span><span>DEMO ENVIRONMENT · SYNTHETIC EVENT DATA</span></footer>
  </main>;
}
