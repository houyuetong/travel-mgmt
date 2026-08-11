import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Typography, Steps, Button, Input, App } from 'antd';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import { reviewApi } from '../../api/review';
import { displayText, formatDate, formatDateTime, formatCurrency } from '../../utils/displayMapping.js';

export default function AdminRequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { message } = App.useApp();

  const fetchDetail = async () => {
    try {
      const res = await reviewApi.getRequestDetail(id);
      setRequest(res.data);
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('common:loadFailed'));
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await reviewApi.approveRequest(id, comment);
      message.success(t('review:approveSuccess'));
      setComment('');
      fetchDetail();
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('toast:fail.approve'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      message.error(t('review:commentRequiredReject'));
      return;
    }
    setLoading(true);
    try {
      await reviewApi.rejectRequest(id, comment);
      message.success(t('review:rejectSuccess'));
      setComment('');
      fetchDetail();
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('toast:fail.reject'));
    } finally {
      setLoading(false);
    }
  };

  if (!request) return <Layout title={t('review:pageTitleDetail')}><p style={{ color: '#999' }}>{t('common:loading')}</p></Layout>;

  const stepCurrent = request.status === '待审核' ? 1 : request.status === '已通过' || request.status === '已拒绝' ? 2 : 0;
  const stepsItems = [
    { title: t('detail:steps.submitted') },
    { title: t('detail:steps.pending') },
    { title: request.status === '已拒绝' ? t('detail:steps.rejected') : t('detail:steps.approved'), status: request.status === '已拒绝' ? 'error' : undefined },
  ];

  return (
    <Layout title={t('review:pageTitleDetail')}>
      <Typography.Title level={4}>{request.destination} <StatusTag status={request.status} /></Typography.Title>
      <Steps current={stepCurrent} items={stepsItems} style={{ marginBottom: 24, maxWidth: 600 }} />
      <Card title={t('detail:basicInfo')} style={{ maxWidth: 600, marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('table:columns.submitter')}>{request.submitterName} ({request.submitterUsername})</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.destination')}>{request.destination}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.startDate')}>{formatDate(request.startDate)}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.endDate')}>{formatDate(request.endDate)}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.transport')}>{displayText(request.transport)}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.estimatedCost')}>¥{formatCurrency(request.estimatedCost)}</Descriptions.Item>
          <Descriptions.Item label={t('table:columns.submittedAt')}>{formatDateTime(request.submittedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title={t('detail:purposeSection')} style={{ maxWidth: 600, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>{request.purpose}</p>
      </Card>
      {request.reviewedAt && (
        <Card title={t('detail:approvalStatus')} style={{ maxWidth: 600, marginBottom: 16 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={t('detail:reviewer')}>{request.reviewerUsername}</Descriptions.Item>
            <Descriptions.Item label={t('detail:reviewedAt')}>{formatDateTime(request.reviewedAt)}</Descriptions.Item>
            <Descriptions.Item label={t('detail:reviewComment')}>{request.reviewComment || t('detail:noComment')}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {request.status === '待审核' && (
        <Card title={t('review:commentLabel')} style={{ maxWidth: 600, marginBottom: 16 }}>
          <Input.TextArea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t('review:commentPlaceholder')}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" onClick={handleApprove} loading={loading}>{t('review:approve')}</Button>
            <Button danger onClick={handleReject} loading={loading}>{t('review:reject')}</Button>
            <Button onClick={() => navigate('/admin/requests')}>{t('review:back')}</Button>
          </div>
        </Card>
      )}

      {request.status !== '待审核' && (
        <div>
          <Button onClick={() => navigate('/admin/requests')}>{t('detail:backToList')}</Button>
        </div>
      )}
    </Layout>
  );
}
