import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, DatePicker, Select, InputNumber, Button, App } from 'antd';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { requestApi } from '../../api/request';
import { TRANSPORTS } from '../../constants/transports';
import { displayText } from '../../utils/displayMapping.js';

export default function NewRequest() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await requestApi.createRequest(values);
      toast.show(t('newRequest:submitSuccess'), 'success');
      navigate('/employee/requests');
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('newRequest:submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title={t('newRequest:pageTitle')}>
      <Card style={{ maxWidth: 600 }}>
        <Form layout="vertical" onFinish={handleSubmit} initialValues={{ estimatedCost: null }}>
          <Form.Item name="destination" label={t('form:destination')} rules={[{ required: true, message: t('form:validations.required') }]}>
            <Input maxLength={100} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="startDate" label={t('form:startDate')} rules={[{ required: true, message: t('form:validations.required') }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" valueFormat="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="endDate" label={t('form:endDate')} rules={[{ required: true, message: t('form:validations.required') }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" valueFormat="YYYY-MM-DD" />
            </Form.Item>
          </div>
          <Form.Item name="purpose" label={t('form:purpose')} rules={[{ required: true, message: t('form:validations.required') }]}>
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="transport" label={t('form:transport')} rules={[{ required: true, message: t('form:validations.required') }]} style={{ flex: 1 }}>
              <Select
                placeholder={t('form:selectPlaceholder')}
                options={TRANSPORTS.map(tp => ({ value: tp, label: displayText(tp) }))}
              />
            </Form.Item>
            <Form.Item name="estimatedCost" label={t('form:estimatedCost')} rules={[{ required: true, message: t('form:validations.required') }]} style={{ flex: 1 }}>
              <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" htmlType="submit" loading={loading}>{t('form:submit')}</Button>
            <Button onClick={() => navigate('/employee/requests')}>{t('form:cancel')}</Button>
          </div>
        </Form>
      </Card>
    </Layout>
  );
}
