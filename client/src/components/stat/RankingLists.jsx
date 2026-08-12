import React from 'react';
import { Card, Col, Empty, Row, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/displayMapping.js';

export default function RankingLists({ departmentRanking, employeeRanking }) {
  const { t } = useTranslation();
  const deptData = departmentRanking || [];
  const empData = employeeRanking || [];
  if (deptData.length === 0 && empData.length === 0) {
    return <Empty description={t('dashboard:empty')} />;
  }
  const money = v => `¥${formatCurrency(v)}`;
  return (
    <Row gutter={[16, 16]}>
      {deptData.length > 0 && (
        <Col xs={24} md={12}>
          <Card title={t('dashboard:departmentRanking')}>
            <Table
              rowKey="department"
              size="small"
              pagination={false}
              dataSource={deptData}
              columns={[
                { title: t('dashboard:department'), dataIndex: 'department', key: 'department', render: v => v || t('dashboard:unassigned') },
                { title: t('dashboard:requestCountCol'), dataIndex: 'requestCount', key: 'requestCount' },
                { title: t('dashboard:cost'), dataIndex: 'cost', key: 'cost', render: money },
              ]}
            />
          </Card>
        </Col>
      )}
      {empData.length > 0 && (
        <Col xs={24} md={12}>
          <Card title={t('dashboard:employeeRanking')}>
            <Table
              rowKey="username"
              size="small"
              pagination={false}
              dataSource={empData}
              columns={[
                { title: t('dashboard:employee'), dataIndex: 'name', key: 'name' },
                { title: t('dashboard:requestCountCol'), dataIndex: 'requestCount', key: 'requestCount' },
                { title: t('dashboard:cost'), dataIndex: 'cost', key: 'cost', render: money },
              ]}
            />
          </Card>
        </Col>
      )}
    </Row>
  );
}