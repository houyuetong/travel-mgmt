import React from 'react';
import { Pagination as AntPagination } from 'antd';
import { useTranslation } from 'react-i18next';

export default function Pagination({ page, pageSize, total, onChange }) {
  const { t } = useTranslation();
  if (total === 0) return null;
  return (
    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
      <AntPagination
        current={page}
        pageSize={pageSize}
        total={total}
        onChange={(p) => onChange(p)}
        showSizeChanger={false}
        showTotal={(tTotal) => t('common:total', { count: tTotal })}
      />
    </div>
  );
}
