import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Col, Row, Select, Spin, Statistic } from 'antd';
import Layout from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { getEmployeeStats } from '../../api/stats';
import StatCards from '../../components/stat/StatCards';

const TrendChart = lazy(() => import('../../components/stat/TrendChart'));
const DistributionCharts = lazy(() => import('../../components/stat/DistributionCharts'));

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  const toast = useToast();

  const monthOptions = [
    { value: 3, label: t('dashboard:last3Months') },
    { value: 6, label: t('dashboard:last6Months') },
    { value: 12, label: t('dashboard:last12Months') },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployeeStats(months);
      setData(res.data);
    } catch (err) {
      setError(err.message || t('dashboard:loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Layout title={t('dashboard:employeePageTitle')}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{t('dashboard:timeRange')}：</span>
        <Select style={{ width: 140 }} value={months} onChange={setMonths} options={monthOptions} />
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={fetchData}>{t('dashboard:retry')}</Button>}
        />
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : data ? (
        <>
          <StatCards core={data.core} showApprovalRate={false} />
          <Card title={t('dashboard:costSummary')} style={{ marginTop: 16, marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic title={t('dashboard:totalCost')} value={data.cost?.totalCost} prefix="¥" precision={2} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title={t('dashboard:approvedCost')} value={data.cost?.approvedCost} prefix="¥" precision={2} />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic title={t('dashboard:pendingCost')} value={data.cost?.pendingCost} prefix="¥" precision={2} />
              </Col>
            </Row>
          </Card>
          <Card title={t('dashboard:monthlyTrend')} style={{ marginBottom: 16 }}>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>}>
              <TrendChart trend={data.trend} />
            </Suspense>
          </Card>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>}>
            <DistributionCharts statusDistribution={data.statusDistribution} />
          </Suspense>
        </>
      ) : null}
    </Layout>
  );
}
