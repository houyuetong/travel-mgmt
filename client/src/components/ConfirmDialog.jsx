import React from 'react';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <Modal
      open={open}
      title={title}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={t('modal:confirmOk')}
      cancelText={t('modal:cancel')}
      maskClosable={false}
    >
      <p>{message}</p>
    </Modal>
  );
}
