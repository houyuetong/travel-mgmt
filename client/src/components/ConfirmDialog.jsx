import React, { useState } from 'react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '8px', padding: '24px',
        minWidth: '360px', maxWidth: '480px',
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>{title}</h3>
        <p style={{ margin: '0 0 20px', color: '#666', fontSize: '14px' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onCancel} style={{
            padding: '6px 16px', border: '1px solid #d9d9d9', borderRadius: '4px',
            background: '#fff', cursor: 'pointer', fontSize: '14px',
          }}>取消</button>
          <button onClick={onConfirm} style={{
            padding: '6px 16px', border: 'none', borderRadius: '4px',
            background: '#1677ff', color: '#fff', cursor: 'pointer', fontSize: '14px',
          }}>确认</button>
        </div>
      </div>
    </div>
  );
}