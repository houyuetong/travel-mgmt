import React from 'react';
import { Timeline } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../utils/displayMapping.js';
import { REQUEST_STATUS } from '../constants/requestStatus';

export default function ApprovalTimeline({ request }) {
  const { t } = useTranslation();

  const items = [
    {
      children: (
        <div>
          <div>{t('timeline:submitted')}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{formatDateTime(request.submittedAt)}</div>
        </div>
      ),
    },
  ];

  const status = request.status;
  if (status === REQUEST_STATUS.PENDING) {
    items.push({
      children: (
        <div>
          <div>{t('timeline:pending')}</div>
        </div>
      ),
    });
  } else if (status === REQUEST_STATUS.APPROVED || status === REQUEST_STATUS.REJECTED) {
    items.push({
      color: status === REQUEST_STATUS.REJECTED ? 'red' : 'green',
      children: (
        <div>
          <div>{status === REQUEST_STATUS.REJECTED ? t('timeline:rejected') : t('timeline:approved')}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {t('timeline:reviewer')}: {request.reviewerName || request.reviewerUsername}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {t('timeline:reviewedAt')}: {formatDateTime(request.reviewedAt)}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {t('timeline:reviewComment')}: {request.reviewComment || t('timeline:noComment')}
          </div>
        </div>
      ),
    });
  } else if (status === REQUEST_STATUS.WITHDRAWN) {
    items.push({
      color: 'gray',
      children: (
        <div>
          <div>{t('timeline:withdrawn')}</div>
          {request.updatedAt && <div style={{ fontSize: 12, color: '#999' }}>{formatDateTime(request.updatedAt)}</div>}
        </div>
      ),
    });
  }

  return <Timeline items={items} />;
}