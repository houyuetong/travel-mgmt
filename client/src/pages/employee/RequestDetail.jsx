import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import { useToast } from '../../components/Toast';
import { requestApi } from '../../api/request';
import { ERROR_MESSAGES } from '../../constants/errorCodes';

export default function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    requestApi.getMyRequest(id).then(res => setRequest(res.data)).catch(err => {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '加载失败');
    });
  }, [id]);

  if (!request) return <Layout title="申请详情" navItems={[{ path: '/employee/requests', label: '我的申请' }]}><p style={{ color: '#999' }}>加载中...</p></Layout>;

  const fieldStyle = { display: 'flex', marginBottom: '12px' };
  const labelStyle = { width: '120px', fontSize: '14px', color: '#666', flexShrink: 0 };
  const valueStyle = { fontSize: '14px', color: '#333' };

  return (
    <Layout title="申请详情" navItems={[{ path: '/employee/requests', label: '我的申请' }]}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '600px' }}>
        <div style={fieldStyle}><span style={labelStyle}>状态：</span><StatusTag status={request.status} /></div>
        <div style={fieldStyle}><span style={labelStyle}>目的地：</span><span style={valueStyle}>{request.destination}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>出发日期：</span><span style={valueStyle}>{request.startDate?.slice(0, 10)}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>返回日期：</span><span style={valueStyle}>{request.endDate?.slice(0, 10)}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>出差事由：</span><span style={valueStyle}>{request.purpose}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>交通工具：</span><span style={valueStyle}>{request.transport}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>预计费用：</span><span style={valueStyle}>¥{request.estimatedCost}</span></div>
        <div style={fieldStyle}><span style={labelStyle}>提交时间：</span><span style={valueStyle}>{request.submittedAt?.slice(0, 19).replace('T', ' ')}</span></div>
        {request.resubmittedFrom && <div style={fieldStyle}><span style={labelStyle}>重新提交来源：</span><span style={valueStyle}>{request.resubmittedFrom}</span></div>}
        {request.reviewedAt && (
          <>
            <div style={fieldStyle}><span style={labelStyle}>审核人：</span><span style={valueStyle}>{request.reviewerUsername}</span></div>
            <div style={fieldStyle}><span style={labelStyle}>审核时间：</span><span style={valueStyle}>{request.reviewedAt?.slice(0, 19).replace('T', ' ')}</span></div>
            <div style={fieldStyle}><span style={labelStyle}>审核意见：</span><span style={valueStyle}>{request.reviewComment || '无'}</span></div>
          </>
        )}
        <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/employee/requests')} style={{ padding: '6px 16px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '14px' }}>返回列表</button>
          {request.status === '已拒绝' && <button onClick={() => navigate(`/employee/requests/${id}/resubmit`)} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#52c41a', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>重新提交</button>}
        </div>
      </div>
    </Layout>
  );
}