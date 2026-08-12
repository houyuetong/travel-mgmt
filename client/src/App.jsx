import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminRoute, EmployeeRoute } from './router/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import EmployeeRequestList from './pages/employee/EmployeeRequestList';
import NewRequest from './pages/employee/NewRequest';
import RequestDetail from './pages/employee/RequestDetail';
import ResubmitRequest from './pages/employee/ResubmitRequest';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRequestList from './pages/admin/AdminRequestList';
import AdminRequestDetail from './pages/admin/AdminRequestDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/employee/dashboard" element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
        <Route path="/employee/requests" element={<EmployeeRoute><EmployeeRequestList /></EmployeeRoute>} />
        <Route path="/employee/requests/new" element={<EmployeeRoute><NewRequest /></EmployeeRoute>} />
        <Route path="/employee/requests/:id" element={<EmployeeRoute><RequestDetail /></EmployeeRoute>} />
        <Route path="/employee/requests/:id/resubmit" element={<EmployeeRoute><ResubmitRequest /></EmployeeRoute>} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/requests" element={<AdminRoute><AdminRequestList /></AdminRoute>} />
        <Route path="/admin/requests/:id" element={<AdminRoute><AdminRequestDetail /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ToastProvider>
  );
}