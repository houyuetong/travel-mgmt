import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Dropdown, App } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { userApi } from '../../api/user';
import { USER_STATUS } from '../../constants/userStatus';
import { ROLES } from '../../constants/roles';
import { displayText, formatDateTime } from '../../utils/displayMapping.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const { t } = useTranslation();
  const toast = useToast();
  const { modal, message } = App.useApp();

  const fetchUsers = async () => {
    try {
      const res = await userApi.listUsers();
      setUsers(res.data);
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('common:loadFailed'));
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await userApi.createUser(values.username, values.name, values.password);
      toast.show(t('employeeManagement:createSuccess'), 'success');
      setShowCreate(false);
      createForm.resetFields();
      fetchUsers();
    } catch (err) {
      if (err?.errorFields) return;
      toast.show(t(`errors:${err.code}`) || err.message || t('toast:fail.create'));
    }
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      await userApi.updateUser(editUser.id, values);
      toast.show(t('employeeManagement:editSuccess'), 'success');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      if (err?.errorFields) return;
      toast.show(t(`errors:${err.code}`) || err.message || t('toast:fail.edit'));
    }
  };

  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields();
      await userApi.resetPassword(resetUser.id, values.newPassword);
      toast.show(t('employeeManagement:resetSuccess'), 'success');
      setResetUser(null);
      resetForm.resetFields();
    } catch (err) {
      if (err?.errorFields) return;
      toast.show(t(`errors:${err.code}`) || err.message || t('toast:fail.reset'));
    }
  };

  const handleToggleStatus = async (u) => {
    const newStatus = u.status === USER_STATUS.ACTIVE ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE;
    try {
      await userApi.updateUserStatus(u.id, newStatus);
      toast.show(t('employeeManagement:toggleSuccess'), 'success');
      fetchUsers();
    } catch (err) {
      toast.show(t(`errors:${err.code}`) || err.message || t('toast:fail.toggle'));
    }
  };

  const showToggleConfirm = (u) => {
    const newStatus = u.status === USER_STATUS.ACTIVE ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE;
    modal.confirm({
      title: t('modal:toggleStatusTitle'),
      content: t('modal:toggleStatusMessage', { name: u.name, status: displayText(newStatus) }),
      okText: t('modal:confirmOk'),
      cancelText: t('modal:cancel'),
      onOk: () => handleToggleStatus(u),
    });
  };

  const columns = [
    { title: t('table:columns.username'), dataIndex: 'username', key: 'username' },
    { title: t('table:columns.name'), dataIndex: 'name', key: 'name' },
    { title: t('table:columns.role'), dataIndex: 'role', key: 'role', render: v => displayText(v) },
    { title: t('table:columns.status'), dataIndex: 'status', key: 'status', render: v => displayText(v) },
    { title: t('table:columns.createdAt'), dataIndex: 'createdAt', key: 'createdAt', render: v => formatDateTime(v) },
    {
      title: t('table:columns.operator'),
      key: 'operator',
      render: (_, u) => {
        if (u.role !== ROLES.EMPLOYEE) return null;
        const moreItems = [
          { key: 'edit', label: t('table:actions.edit'), onClick: () => { setEditUser(u); editForm.setFieldsValue({ username: u.username, name: u.name, status: u.status }); } },
          { key: 'toggle', label: u.status === USER_STATUS.ACTIVE ? t('table:actions.disable') : t('table:actions.enable'), onClick: () => showToggleConfirm(u) },
          { key: 'reset', label: t('table:actions.resetPassword'), onClick: () => { setResetUser(u); resetForm.resetFields(); } },
        ];
        return (
          <Dropdown menu={{ items: moreItems }}>
            <Button type="link" size="small">{t('common:actions.more')} <DownOutlined /></Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <Layout title={t('employeeManagement:pageTitle')}>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setShowCreate(true)}>{t('employeeManagement:createButton')}</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={users} />

      <Modal
        title={t('employeeManagement:modalTitles.create')}
        open={showCreate}
        onOk={handleCreate}
        onCancel={() => setShowCreate(false)}
        okText={t('common:actions.create')}
        cancelText={t('common:actions.cancel')}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label={t('table:columns.username')} rules={[{ required: true, message: t('employeeManagement:validations.usernameRequired') }]}>
            <Input placeholder={t('employeeManagement:placeholders.username')} />
          </Form.Item>
          <Form.Item name="name" label={t('table:columns.name')} rules={[{ required: true, message: t('employeeManagement:validations.nameRequired') }]}>
            <Input placeholder={t('employeeManagement:placeholders.name')} />
          </Form.Item>
          <Form.Item name="password" label={t('login:password')} rules={[{ required: true, message: t('employeeManagement:validations.passwordMinLength') }, { min: 6, message: t('employeeManagement:validations.passwordMinLength') }]}>
            <Input.Password placeholder={t('employeeManagement:placeholders.password')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('employeeManagement:modalTitles.edit')}
        open={!!editUser}
        onOk={handleEdit}
        onCancel={() => setEditUser(null)}
        okText={t('common:actions.save')}
        cancelText={t('common:actions.cancel')}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label={t('table:columns.username')} rules={[{ required: true, message: t('employeeManagement:validations.usernameRequired') }]}>
            <Input placeholder={t('employeeManagement:placeholders.username')} />
          </Form.Item>
          <Form.Item name="name" label={t('table:columns.name')} rules={[{ required: true, message: t('employeeManagement:validations.nameRequired') }]}>
            <Input placeholder={t('employeeManagement:placeholders.name')} />
          </Form.Item>
          <Form.Item name="status" label={t('table:columns.status')} rules={[{ required: true, message: t('form:validations.required') }]}>
            <Select options={[
              { value: USER_STATUS.ACTIVE, label: displayText(USER_STATUS.ACTIVE) },
              { value: USER_STATUS.DISABLED, label: displayText(USER_STATUS.DISABLED) },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('employeeManagement:modalTitles.reset', { name: resetUser?.name || '' })}
        open={!!resetUser}
        onOk={handleResetPassword}
        onCancel={() => setResetUser(null)}
        okText={t('common:actions.reset')}
        cancelText={t('common:actions.cancel')}
        destroyOnClose
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item name="newPassword" label={t('login:password')} rules={[{ required: true, message: t('employeeManagement:validations.newPasswordMinLength') }, { min: 6, message: t('employeeManagement:validations.newPasswordMinLength') }]}>
            <Input.Password placeholder={t('employeeManagement:placeholders.newPassword')} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
