import React from 'react';
import { Line } from '@ant-design/charts';
import { Empty } from 'antd';
import { useTranslation } from 'react-i18next';

export default function TrendChart({ trend }) {
  const { t } = useTranslation();
  if (!trend || !Array.isArray(trend.months) || trend.months.length === 0) {
    return <Empty description={t('dashboard:empty')} />;
  }
  const data = [];
  trend.months.forEach((m, i) => {
    data.push({ month: m, type: t('dashboard:requestCount'), value: trend.requestCounts?.[i] ?? 0 });
    data.push({ month: m, type: t('dashboard:cost'), value: trend.costs?.[i] ?? 0 });
  });
  const config = {
    data,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    colorField: 'type',
    height: 280,
    legend: { color: { position: 'top' } },
    scale: { y: { domainMin: 0 } },
  };
  return <Line {...config} />;
}