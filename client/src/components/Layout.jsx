import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useVersion } from '../hooks/useVersion';

export default function Layout({ title, children, navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const version = useVersion();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <div style={{ backgroundColor: '#001529', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>差旅管理系统</span>
          {navItems && navItems.map(item => (
            <span
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                fontSize: '14px', cursor: 'pointer', color: location.pathname === item.path ? '#1677ff' : '#fff',
                borderBottom: location.pathname === item.path ? '2px solid #1677ff' : 'none', paddingBottom: '4px',
              }}
            >{item.label}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {version && <span style={{ fontSize: '12px', opacity: 0.8 }}>{version}</span>}
          <span style={{ fontSize: '14px' }}>{user?.name} ({user?.role})</span>
          <button onClick={handleLogout} style={{ padding: '4px 12px', border: '1px solid #fff', borderRadius: '4px', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>登出</button>
        </div>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '16px', color: '#333' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}