import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Button, Table, Spin, Empty, App } from 'antd';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import Pagination from '../../components/Pagination';

import { useToast } from '../../components/Toast';
import { requestApi } from '../../api/request';
import { exportMyRequests } from '../../api/export';
import { downloadBlob } from '../../utils/download.js';
import { STATUS_OPTIONS } from '../../constants/requestStatus';
import { displayText, formatDate, formatDateTime, formatCurrency } from '../../utils/displayMapping.js';

export default function EmployeeRequestList() {
  const [data, setData] = useState({ list: [], total: 0, page: 1, pageSize: 100 });
  const [status, setStatus] = useState('全部');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const { modal } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await requestApi.listMyRequests({ status, page, pageSize: 100 });
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
      const blob = await exportMyRequests({ status });
      downloadBlob(blob, `travel-requests-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.show(t('export:success'), 'success');
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('export:failed'));
    } finally {
      setExporting(false);
    }
  };

  const handleWithdraw = async (id) => {
    try {
      await requestApi.withdrawRequest(id);
      toast.show(t('myRequests:withdrawSuccess'), 'success');

      fetchData();
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('myRequests:withdrawFailed'));
    }
  };

  const showWithdrawConfirm = (id) => {
    modal.confirm({
      title: t('modal:withdrawTitle'),
      content: t('modal:withdrawMessage'),
      okText: t('modal:confirmOk'),
      cancelText: t('modal:cancel'),
      onOk: () => handleWithdraw(id),
    });
  };

  const columns = [
    { title: t('table:columns.destination'), dataIndex: 'destination', key: 'destination' },
    { title: t('table:columns.startDate'), dataIndex: 'startDate', key: 'startDate', render: v => formatDate(v) },
    { title: t('table:columns.endDate'), dataIndex: 'endDate', key: 'endDate', render: v => formatDate(v) },
    { title: t('table:columns.transport'), dataIndex: 'transport', key: 'transport', render: v => displayText(v) },
    { title: t('table:columns.estimatedCost'), dataIndex: 'estimatedCost', key: 'estimatedCost', render: v => `¥${formatCurrency(v)}` },
    { title: t('table:columns.status'), dataIndex: 'status', key: 'status', render: v => <StatusTag status={v} /> },
    { title: t('table:columns.submittedAt'), dataIndex: 'submittedAt', key: 'submittedAt', render: v => formatDateTime(v) },
    {
      title: t('table:columns.operator'),
      key: 'operator',
      width: 220,
      render: (_, r) => (
        <>
          <Button type="link" size="small" onClick={() => navigate(`/employee/requests/${r.id}`)}>{t('table:actions.detail')}</Button>
          {r.status === '待审核' && <Button type="link" size="small" danger onClick={() => showWithdrawConfirm(r.id)}>{t('table:actions.withdraw')}</Button>}
          {r.status === '已拒绝' && <Button type="link" size="small" onClick={() => navigate(`/employee/requests/${r.id}/resubmit`)}>{t('table:actions.resubmit')}</Button>}
        </>
      ),
    },
  ];

  return (
    <Layout title={t('myRequests:pageTitle')}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{t('common:statusFilter')}：</span>
        <Select
          style={{ width: 160 }}
          value={status}
          onChange={v => { setStatus(v); setPage(1); }}
          options={STATUS_OPTIONS.map(s => ({ value: s, label: s === '全部' ? t('common:all') : displayText(s) }))}
        />
        <Button onClick={handleExport} loading={exporting} style={{ marginLeft: 'auto' }}>{t('export:button')}</Button>
        <Button type="primary" onClick={() => navigate('/employee/requests/new')}>{t('myRequests:createNew')}</Button>
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
