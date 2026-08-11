import React from 'react';
import { REQUEST_STATUS } from '../constants/requestStatus';

const STATUS_COLORS = {
  '待审核': '#e6a700',
  '已通过': '#52c41a',
  '已拒绝': '#f5222d',
  '已撤回': '#8c8c8c',
};

export default function StatusTag({ status }) {
  const color = STATUS_COLORS[status] || '#8c8c8c';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      color,
      backgroundColor: color + '20',
      border: `1px solid ${color}40`,
    }}>
      {status}
    </span>
  );
}