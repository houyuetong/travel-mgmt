import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { useTranslation } from 'react-i18next';

export default function StatCards({ core, showApprovalRate = true }) {
  const { t } = useTranslation();
  const items = [
    { key: 'total', label: t('dashboard:totalRequests'), value: core?.total },
    { key: 'pending', label: t('dashboard:pending'), value: core?.pending },
    { key: 'approved', label: t('dashboard:approved'), value: core?.approved },
    { key: 'rejected', label: t('dashboard:rejected'), value: core?.rejected },
    { key: 'withdrawn', label: t('dashboard:withdrawn'), value: core?.withdrawn },
  ];
  if (showApprovalRate) {
    items.push({ key: 'rate', label: t('dashboard:approvalRate'), value: core?.approvalRate ?? '0%' });
  }
  return (
    <Row gutter={[16, 16]}>
      {items.map(it => (
        <Col key={it.key} xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title={it.label} value={it.value} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}