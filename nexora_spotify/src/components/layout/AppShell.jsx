import React from 'react';
import { Bell, ChevronDown, Search, UserCircle } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppShell({ role, children }) {
  const roleName = role[0].toUpperCase()+role.slice(1);
  return <div className="app-shell">
    <Sidebar role={role}/>
    <main className="main-area">
      <header className="topbar">
        <div className="search-wrap"><Search size={18}/><input placeholder="What do you want to explore?"/><kbd>⌘ K</kbd></div>
        <div className="top-actions"><Bell size={20}/><span className="bell-dot"/><div className="profile"><div className="avatar">{roleName[0]}</div><span>{roleName}</span><ChevronDown size={16}/></div></div>
      </header>
      <div className="page-content">{children}</div>
      <footer className="footer"><span>〽 PRABANDH</span><em>From Chaos to Coordination</em><span>Smarter events. Happier people.</span></footer>
    </main>
  </div>
}
