import React from 'react';
export default function StatCard({icon,title,value,meta,trend}){return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small className={trend?'good':''}>{meta}</small></div><b className="stat-arrow">›</b></div>}
