import React from 'react';
import { Pie, Column } from '@ant-design/charts';
import { Card, Col, Empty, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import { displayText } from '../../utils/displayMapping.js';

export default function DistributionCharts({ statusDistribution, transportDistribution }) {
  const { t } = useTranslation();
  const pieData = (statusDistribution || []).map(d => ({
    status: displayText(d.status),
    count: d.count,
    percent: d.percent,
  }));
  const columnData = (transportDistribution || []).map(d => ({
    transport: displayText(d.transport),
    count: d.count,
  }));
  return (
    <Row gutter={[16, 16]}>
      {pieData.length > 0 && (
        <Col xs={24} md={12}>
          <Card title={t('dashboard:statusDistribution')}>
            <Pie
              data={pieData}
              angleField="count"
              colorField="status"
              height={280}
              legend={{ color: { position: 'bottom' } }}
              label={{ text: 'count' }}
              tooltip={{ title: 'status', items: [{ channel: 'y', name: t('dashboard:count') }, { channel: 'x', name: t('dashboard:percent') }] }}
            />
          </Card>
        </Col>
      )}
      {columnData.length > 0 && (
        <Col xs={24} md={12}>
          <Card title={t('dashboard:transportDistribution')}>
            <Column
              data={columnData}
              xField="transport"
              yField="count"
              height={280}
              legend={{ color: { position: 'top' } }}
            />
          </Card>
        </Col>
      )}
      {pieData.length === 0 && columnData.length === 0 && (
        <Col span={24}>
          <Empty description={t('dashboard:empty')} />
        </Col>
      )}
    </Row>
  );
}