import React from 'react';
import { Layout as AntLayout, Menu, Avatar, Button, Space, Dropdown, Tag } from 'antd';
import { GlobalOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useVersion } from '../hooks/useVersion';
import { ROLES } from '../constants/roles';
import { changeLanguage } from '../i18n/index.js';
import { displayText } from '../utils/displayMapping.js';

const { Sider, Header, Content } = AntLayout;

const MENU_BY_ROLE = {
  [ROLES.EMPLOYEE]: [
    { key: '/employee/requests', labelKey: 'layout:myRequests' },
    { key: '/employee/requests/new', labelKey: 'layout:newRequest' },
  ],
  [ROLES.ADMIN]: [
    { key: '/admin/requests', labelKey: 'layout:requestReview' },
    { key: '/admin/users', labelKey: 'layout:employeeManagement' },
  ],
};

export default function Layout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const version = useVersion();
  const isEn = i18n.language === 'en-US';

  const menuItems = (MENU_BY_ROLE[user?.role] || []).map(m => ({
    key: m.key,
    label: t(m.labelKey),
  }));

  const selectedKey = (() => {
    const p = location.pathname;
    if (p.startsWith('/admin/requests')) return '/admin/requests';
    if (p.startsWith('/admin/users')) return '/admin/users';
    if (p.startsWith('/employee/requests/new')) return '/employee/requests/new';
    if (p.startsWith('/employee/requests')) return '/employee/requests';
    return '';
  })();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div className="app-sider-title" style={{ color: '#fff', fontSize: 16, fontWeight: 600, padding: '20px 24px' }}>
          {t('common:appTitle')}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menuItems}
          onClick={({ key }) => navigate(key)} />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="page-title" style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,0.88)' }}>{title}</span>
          <Space size="middle">
            <Dropdown
              menu={{
                items: [
                  { key: 'zh-CN', label: '中文', onClick: () => changeLanguage('zh-CN') },
                  { key: 'en-US', label: 'EN', onClick: () => changeLanguage('en-US') },
                ],
                selectable: true,
                selectedKeys: [i18n.language],
              }}
              trigger={['click']}
            >
              <Button type="text" icon={<GlobalOutlined />}>{t('header:languageSwitch')}</Button>
            </Dropdown>
            {version && <span style={{ fontSize: 12, color: '#999' }}>{version}</span>}
            <Space size="small">
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.name}</span>
              <Tag color="blue">{displayText(user?.role)}</Tag>
            </Space>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>{t('layout:logout')}</Button>
          </Space>
        </Header>
        <Content style={{ margin: 24, background: 'transparent' }}>{children}</Content>
      </AntLayout>
    </AntLayout>
  );
}
