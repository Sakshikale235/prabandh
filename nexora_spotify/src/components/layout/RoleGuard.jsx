import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RoleGuard({ role, children }) {
  const location = useLocation();
  const { loading, user, role: activeRole, configured } = useAuth();

  if (loading) return <div className="auth-loading"><div className="auth-spinner"/><span>Connecting to PRABANDH…</span></div>;
  if (!configured) return <Navigate to="/login" state={{ from: location, configError: true }} replace />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (activeRole !== role) return <Navigate to={activeRole ? `/${activeRole}` : '/login'} replace />;
  return children;
}
