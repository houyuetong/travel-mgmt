import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { userApi } from '../../api/user';
import { USER_STATUS } from '../../constants/userStatus';
import { ERROR_MESSAGES } from '../../constants/errorCodes';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [createForm, setCreateForm] = useState({ username: '', name: '', password: '' });
  const [editForm, setEditForm] = useState({ username: '', name: '', status: '' });
  const [resetForm, setResetForm] = useState({ newPassword: '' });
  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const res = await userApi.listUsers();
      setUsers(res.data);
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '加载失败');
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await userApi.createUser(createForm.username, createForm.name, createForm.password);
      toast.show('创建成功', 'success');
      setShowCreate(false);
      setCreateForm({ username: '', name: '', password: '' });
      fetchUsers();
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '创建失败');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await userApi.updateUser(editUser.id, editForm);
      toast.show('编辑成功', 'success');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '编辑失败');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await userApi.resetPassword(resetUser.id, resetForm.newPassword);
      toast.show('重置成功', 'success');
      setResetUser(null);
      setResetForm({ newPassword: '' });
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '重置失败');
    }
  };

  const handleToggleStatus = async () => {
    const { id, status } = confirmStatus;
    const newStatus = status === USER_STATUS.ACTIVE ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE;
    try {
      await userApi.updateUserStatus(id, newStatus);
      toast.show('操作成功', 'success');
      setConfirmStatus(null);
      fetchUsers();
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '操作失败');
    }
  };

  const modalStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
  const modalContentStyle = { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', minWidth: '400px' };
  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px' };

  return (
    <Layout title="员工管理" navItems={[{ path: '/admin/users', label: '员工管理' }, { path: '/admin/requests', label: '申请审核' }]}>
      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => setShowCreate(true)} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#1677ff', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>创建员工</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>用户名</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>姓名</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>角色</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>状态</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>创建时间</th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #e8e8e8' }}>
              <td style={{ padding: '12px', fontSize: '13px' }}>{u.username}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{u.name}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{u.role}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{u.status}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{u.createdAt?.slice(0, 19).replace('T', ' ')}</td>
              <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>
                {u.role === '普通员工' && (
                  <>
                    <button onClick={() => { setEditUser(u); setEditForm({ username: u.username, name: u.name, status: u.status }); }} style={{ padding: '2px 8px', border: '1px solid #1677ff', borderRadius: '4px', background: '#fff', color: '#1677ff', cursor: 'pointer', fontSize: '12px', marginRight: '4px' }}>编辑</button>
                    <button onClick={() => setConfirmStatus({ id: u.id, status: u.status, name: u.name })} style={{ padding: '2px 8px', border: `1px solid ${u.status === '启用' ? '#f5222d' : '#52c41a'}`, borderRadius: '4px', background: '#fff', color: u.status === '启用' ? '#f5222d' : '#52c41a', cursor: 'pointer', fontSize: '12px', marginRight: '4px' }}>{u.status === '启用' ? '禁用' : '启用'}</button>
                    <button onClick={() => { setResetUser(u); setResetForm({ newPassword: '' }); }} style={{ padding: '2px 8px', border: '1px solid #faad14', borderRadius: '4px', background: '#fff', color: '#faad14', cursor: 'pointer', fontSize: '12px' }}>重置密码</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreate && (
        <div style={modalStyle} onClick={() => setShowCreate(false)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>创建员工</h3>
            <form onSubmit={handleCreate}>
              <input type="text" placeholder="用户名" value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} style={inputStyle} required />
              <input type="text" placeholder="姓名" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} style={inputStyle} required />
              <input type="password" placeholder="密码（至少6位）" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} style={inputStyle} required minLength={6} />
              <button type="submit" style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', backgroundColor: '#1677ff', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>创建</button>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div style={modalStyle} onClick={() => setEditUser(null)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>编辑员工</h3>
            <form onSubmit={handleEdit}>
              <input type="text" placeholder="用户名" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} style={inputStyle} required />
              <input type="text" placeholder="姓名" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} required />
              <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={inputStyle}>
                <option value="启用">启用</option>
                <option value="禁用">禁用</option>
              </select>
              <button type="submit" style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', backgroundColor: '#1677ff', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>保存</button>
            </form>
          </div>
        </div>
      )}

      {resetUser && (
        <div style={modalStyle} onClick={() => setResetUser(null)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>重置密码 - {resetUser.name}</h3>
            <form onSubmit={handleResetPassword}>
              <input type="password" placeholder="新密码（至少6位）" value={resetForm.newPassword} onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} style={inputStyle} required minLength={6} />
              <button type="submit" style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', backgroundColor: '#1677ff', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>重置</button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmStatus}
        title="确认操作"
        message={`确定要${confirmStatus?.status === '启用' ? '禁用' : '启用'} ${confirmStatus?.name} 吗？`}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmStatus(null)}
      />
    </Layout>
  );
}