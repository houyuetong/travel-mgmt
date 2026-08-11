import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import { reviewApi } from '../../api/review';
import { ERROR_MESSAGES } from '../../constants/errorCodes';

export default function AdminRequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchDetail = async () => {
    try {
      const res = await reviewApi.getRequestDetail(id);
      setRequest(res.data);
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '加载失败');
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await reviewApi.approveRequest(id, comment);
      toast.show('已通过', 'success');
      setComment('');
      fetchDetail();
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.show('拒绝申请必须填写审核意见');
      return;
    }
    setLoading(true);
    try {
      await reviewApi.rejectRequest(id, comment);
      toast.show('已拒绝', 'success');
      setComment('');
      fetchDetail();
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  if (!request) return <Layout title="申请详情" navItems={[{ path: '/admin/requests', label: '申请审核' }]}><p style={{ color: '#999' }}>加载中...</p></Layout>;

  const fieldStyle = { display: 'flex', marginBottom: '12px' };
  const labelStyle = { width: '120px', fontSize: '14px', color: '#666', flexShrink: 0 };
  const valueStyle = { fontSize: '14px', color: '#333' };

  return (
    <Layout title="申请详情与审核" navItems={[{ path: '/admin/requests', label: '申请审核' }]}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '600px' }}>
        <div style={fieldStyle}><span style={labelStyle}>状态：</span><StatusTag status={request.status} /></div>
        <div style={fieldStyle}><span style={labelStyle}>提交人：</span><span style={valueStyle}>{request.submitterName} ({request.submitterUsername})</span></div>
        <div style={fieldStyle}><span style={labelStyle}>目的地：</span><span style={valueStyle}>{request.destination}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>出发日期：</span><span style={valueStyle}>{request.startDate?.slice(0, 10)}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>返回日期：</span><span style={valueStyle}>{request.endDate?.slice(0, 10)}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>出差事由：</span><span style={valueStyle}>{request.purpose}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>交通工具：</span><span style={valueStyle}>{request.transport}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>预计费用：</span><span style={valueStyle}>¥{request.estimatedCost}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>提交时间：</span><span style={valueStyle}>{request.submittedAt?.slice(0, 19).replace('T', ' ')}</span></div>
        {request.reviewedAt && (
          <>
            <div style={fieldStyle}><span style={labelStyle}>审核人：</span><span style={valueStyle}>{request.reviewerUsername}</span></div>
            <div style={fieldStyle}><span style={labelStyle}>审核时间：</span><span style={valueStyle}>{request.reviewedAt?.slice(0, 19).replace('T', ' ')}</span></div>
            <div style={fieldStyle}><span style={labelStyle}>审核意见：</span><span style={valueStyle}>{request.reviewComment || '无'}</span></div>
          </>
        )}

        {request.status === '待审核' && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #e8e8e8', paddingTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#333' }}>审核意见（通过时可选，拒绝时必填）</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={500} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleApprove} disabled={loading} style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', backgroundColor: '#52c41a', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>通过</button>
              <button onClick={handleReject} disabled={loading} style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', backgroundColor: '#f5222d', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: loading ? 0.7 : 1 }}>拒绝</button>
              <button onClick={() => navigate('/admin/requests')} style={{ padding: '8px 24px', border: '1px solid #d9d9d9', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '14px' }}>返回</button>
            </div>
          </div>
        )}

        {request.status !== '待审核' && (
          <div style={{ marginTop: '24px' }}>
            <button onClick={() => navigate('/admin/requests')} style={{ padding: '6px 16px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>返回列表</button>
          </div>
        )}
      </div>
    </Layout>
  );
}