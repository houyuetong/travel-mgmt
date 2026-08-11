import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../constants/roles';
import { useVersion } from '../hooks/useVersion';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const version = useVersion();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.username, values.password);
      if (user.role === ROLES.ADMIN) {
        navigate('/admin/users');
      } else {
        navigate('/employee/requests');
      }
    } catch (err) {
      message.error(t(`errors:${err.code}`) || err.message || t('login:loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Card style={{ width: 380, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>{t('common:appTitle')}</Typography.Title>
        <Form onFinish={handleSubmit} size="large">
          <Form.Item name="username" rules={[{ required: true, message: t('login:usernameRequired') }]}>
            <Input prefix={<UserOutlined />} placeholder={t('login:usernamePlaceholder')} autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: t('login:passwordRequired') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('login:passwordPlaceholder')} autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>{t('login:loginButton')}</Button>
          </Form.Item>
        </Form>
        {version && <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>{version}</div>}
      </Card>
    </div>
  );
}
