import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Table, Spin, Empty, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import Pagination from '../../components/Pagination';
import { useToast } from '../../components/Toast';
import { reviewApi } from '../../api/review';
import { exportAdminRequests } from '../../api/export';
import { downloadBlob } from '../../utils/download.js';
import { STATUS_OPTIONS } from '../../constants/requestStatus';
import { displayText, formatDate, formatDateTime } from '../../utils/displayMapping.js';

export default function AdminRequestList() {
  const [data, setData] = useState({ list: [], total: 0, page: 1, pageSize: 100 });
  const [status, setStatus] = useState('全部');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await reviewApi.listAllRequests({ status, page, pageSize: 100 });
      setData(res.data);
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('common:loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [status, page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportAdminRequests({ status });
      downloadBlob(blob, `travel-requests-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.show(t('export:success'), 'success');
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('export:failed'));
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { title: t('table:columns.submitter'), dataIndex: 'submitterName', key: 'submitterName' },
    { title: t('table:columns.destination'), dataIndex: 'destination', key: 'destination' },
    { title: t('table:columns.startDate'), dataIndex: 'startDate', key: 'startDate', render: v => formatDate(v) },
    { title: t('table:columns.endDate'), dataIndex: 'endDate', key: 'endDate', render: v => formatDate(v) },
    { title: t('table:columns.status'), dataIndex: 'status', key: 'status', render: v => <StatusTag status={v} /> },
    { title: t('table:columns.submittedAt'), dataIndex: 'submittedAt', key: 'submittedAt', render: v => formatDateTime(v) },
    {
      title: t('table:columns.operator'),
      key: 'operator',
      render: (_, r) => (
        <Button type="link" size="small" onClick={() => navigate(`/admin/requests/${r.id}`)}>{t('table:actions.review')}</Button>
      ),
    },
  ];

  return (
    <Layout title={t('review:pageTitle')}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{t('common:statusFilter')}：</span>
        <Select
          style={{ width: 160 }}
          value={status}
          onChange={v => { setStatus(v); setPage(1); }}
          options={STATUS_OPTIONS.map(s => ({ value: s, label: s === '全部' ? t('common:all') : displayText(s) }))}
        />
        <Button onClick={handleExport} loading={exporting} style={{ marginLeft: 'auto' }}>{t('export:button')}</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : data.list.length === 0 ? (
        <Empty description={t('common:noData')} />
      ) : (
        <Table rowKey="id" columns={columns} dataSource={data.list} pagination={false} />
      )}

      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </Layout>
  );
}
