import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useToast } from '../../components/Toast';
import { requestApi } from '../../api/request';
import { TRANSPORTS } from '../../constants/transports';
import { ERROR_MESSAGES } from '../../constants/errorCodes';

export default function ResubmitRequest() {
  const { id } = useParams();
  const [form, setForm] = useState({ destination: '', startDate: '', endDate: '', purpose: '', transport: '', estimatedCost: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    requestApi.getMyRequest(id).then(res => {
      const r = res.data;
      setForm({ destination: r.destination, startDate: r.startDate?.slice(0, 10), endDate: r.endDate?.slice(0, 10), purpose: r.purpose, transport: r.transport, estimatedCost: r.estimatedCost });
    }).catch(err => toast.show(ERROR_MESSAGES[err.code] || err.message || '加载失败'));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestApi.resubmitRequest(id, form);
      toast.show('重新提交成功', 'success');
      navigate('/employee/requests');
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' };

  return (
    <Layout title="重新提交申请" navItems={[{ path: '/employee/requests', label: '我的申请' }]}>
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', backgroundColor: '#fff', padding: '24px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>出差目的地 *</label>
          <input type="text" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} style={inputStyle} required maxLength={100} />
        </div>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>出发日期 *</label>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>返回日期 *</label>
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inputStyle} required />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>出差事由 *</label>
          <textarea value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} style={{ ...inputStyle, minHeight: '80px' }} required maxLength={500} />
        </div>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>交通工具 *</label>
            <select value={form.transport} onChange={e => setForm({ ...form, transport: e.target.value })} style={inputStyle} required>
              <option value="">请选择</option>
              {TRANSPORTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>预计费用 (元) *</label>
            <input type="number" step="0.01" min="0" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} style={inputStyle} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', backgroundColor: '#1677ff', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>{loading ? '提交中...' : '重新提交'}</button>
          <button type="button" onClick={() => navigate('/employee/requests')} style={{ padding: '8px 24px', border: '1px solid #d9d9d9', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '14px' }}>取消</button>
        </div>
      </form>
    </Layout>
  );
}