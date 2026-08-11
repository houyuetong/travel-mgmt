import React from 'react';

export default function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
      <span style={{ fontSize: '13px', color: '#666' }}>共 {total} 条</span>
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1, fontSize: '13px' }}
      >上一页</button>
      <span style={{ fontSize: '13px' }}>{page} / {totalPages}</span>
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, fontSize: '13px' }}
      >下一页</button>
    </div>
  );
}