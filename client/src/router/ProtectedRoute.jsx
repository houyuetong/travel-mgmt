import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../constants/roles';

export function AdminRoute({ children }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.role !== ROLES.ADMIN) return <Navigate to="/employee/requests" replace />;
  return children;
}

export function EmployeeRoute({ children }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.role !== ROLES.EMPLOYEE) return <Navigate to="/admin/users" replace />;
  return children;
}