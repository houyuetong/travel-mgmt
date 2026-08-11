import React from 'react';
import { Tag } from 'antd';
import { STATUS_COLORS } from '../theme/designTokens.js';
import { displayText } from '../utils/displayMapping.js';

export default function StatusTag({ status }) {
  const color = STATUS_COLORS[status] || '#8c8c8c';
  return (
    <Tag color={color} style={{ fontWeight: status === '待审核' ? 600 : 400 }}>
      {displayText(status)}
    </Tag>
  );
}
