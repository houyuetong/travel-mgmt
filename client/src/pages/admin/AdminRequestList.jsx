import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import Pagination from '../../components/Pagination';
import { useToast } from '../../components/Toast';
import { reviewApi } from '../../api/review';
import { STATUS_OPTIONS } from '../../constants/requestStatus';
import { ERROR_MESSAGES } from '../../constants/errorCodes';

export default function AdminRequestList() {
  const [data, setData] = useState({ list: [], total: 0, page: 1, pageSize: 100 });
  const [status, setStatus] = useState('全部');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchData = async () => {
    try {
      const res = await reviewApi.listAllRequests({ status, page, pageSize: 100 });
      setData(res.data);
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '加载失败');
    }
  };

  useEffect(() => { fetchData(); }, [status, page]);

  return (
    <Layout title="申请审核" navItems={[{ path: '/admin/users', label: '员工管理' }, { path: '/admin/requests', label: '申请审核' }]}>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px' }}>状态筛选：</span>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>提交人</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>目的地</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>出发日期</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>返回日期</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>状态</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>提交时间</th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.list.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e8e8e8' }}>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.submitterName}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.destination}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.startDate?.slice(0, 10)}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.endDate?.slice(0, 10)}</td>
              <td style={{ padding: '12px' }}><StatusTag status={r.status} /></td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.submittedAt?.slice(0, 19).replace('T', ' ')}</td>
              <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>
                <button onClick={() => navigate(`/admin/requests/${r.id}`)} style={{ padding: '2px 8px', border: '1px solid #1677ff', borderRadius: '4px', background: '#fff', color: '#1677ff', cursor: 'pointer', fontSize: '12px' }}>审核</button>
              </td>
            </tr>
          ))}
          {data.list.length === 0 && <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '14px' }}>暂无数据</td></tr>}
        </tbody>
      </table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </Layout>
  );
}