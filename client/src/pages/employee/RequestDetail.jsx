import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Typography, Steps, Button, Table, Empty } from 'antd';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import ApprovalTimeline from '../../components/ApprovalTimeline';
import { useToast } from '../../components/Toast';
import { requestApi } from '../../api/request';
import { displayText, formatDate, formatDateTime, formatCurrency } from '../../utils/displayMapping.js';

export default function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  useEffect(() => {
    requestApi.getMyRequest(id).then(res => setRequest(res.data)).catch(err => {
      toast.show(t(`errors:${err.code}`) || err.message || t('common:loadFailed'));
    });
  }, [id]);

  if (!request) return <Layout title={t('detail:pageTitle')}><p style={{ color: '#999' }}>{t('common:loading')}</p></Layout>;

  const stepCurrent = request.status === '待审核' ? 1 : request.status === '已通过' || request.status === '已拒绝' ? 2 : 0;
  const stepsItems = [
    { title: t('detail:steps.submitted') },
    { title: t('detail:steps.pending') },
    { title: request.status === '已拒绝' ? t('detail:steps.rejected') : t('detail:steps.approved'), status: request.status === '已拒绝' ? 'error' : undefined },
  ];

  return (
    <Layout title={t('detail:pageTitle')}>
      <Typography.Title level={4}>{request.destination} <StatusTag status={request.status} /></Typography.Title>
      <Steps current={stepCurrent} items={stepsItems} style={{ marginBottom: 24, maxWidth: 600 }} />
      <Card title={t('detail:basicInfo')} style={{ maxWidth: 600, marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('table:columns.destination')}>{request.destination}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.startDate')}>{formatDate(request.startDate)}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.endDate')}>{formatDate(request.endDate)}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.transport')}>{displayText(request.transport)}</Descriptions.Item>
          <Descriptions.Item label={t('form:totalCost')}>¥{formatCurrency(request.totalCost ?? request.estimatedCost)}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.submittedAt')}>{formatDateTime(request.submittedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title={t('expense:sectionTitle')} style={{ maxWidth: 600, marginBottom: 16 }}>
        {Array.isArray(request.expenseItems) && request.expenseItems.length > 0 ? (
          <Table
            rowKey={(_, i) => i}
            size="small"
            pagination={false}
            dataSource={request.expenseItems}
            columns={[
              { title: t('expense:category'), dataIndex: 'category', key: 'category', render: v => displayText(v) },
              { title: t('expense:amount'), dataIndex: 'amount', key: 'amount', render: v => `¥${formatCurrency(v)}` },
              { title: t('expense:description'), dataIndex: 'description', key: 'description', render: v => v || '-' },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><strong>{t('expense:totalLabel')}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2}><strong>¥{formatCurrency(request.totalCost ?? request.estimatedCost)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        ) : (
          <Empty description={t('expense:empty')} />
        )}
      </Card>
      <Card title={t('detail:purposeSection')} style={{ maxWidth: 600, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>{request.purpose}</p>
      </Card>

      <Card title={t('timeline:sectionTitle')} style={{ maxWidth: 600, marginBottom: 16 }}>
        <ApprovalTimeline request={request} />
      </Card>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate('/employee/requests')}>{t('detail:backToList')}</Button>
        {request.status === '已拒绝' && <Button type="primary" onClick={() => navigate(`/employee/requests/${id}/resubmit`)}>{t('detail:resubmit')}</Button>}
      </div>
    </Layout>
  );
}
