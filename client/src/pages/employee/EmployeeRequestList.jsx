import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatusTag from '../../components/StatusTag';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { requestApi } from '../../api/request';
import { STATUS_OPTIONS } from '../../constants/requestStatus';
import { ERROR_MESSAGES } from '../../constants/errorCodes';

export default function EmployeeRequestList() {
  const [data, setData] = useState({ list: [], total: 0, page: 1, pageSize: 100 });
  const [status, setStatus] = useState('全部');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [withdrawId, setWithdrawId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await requestApi.listMyRequests({ status, page, pageSize: 100 });
      setData(res.data);
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [status, page]);

  const handleWithdraw = async () => {
    try {
      await requestApi.withdrawRequest(withdrawId);
      toast.show('撤回成功', 'success');
      setWithdrawId(null);
      fetchData();
    } catch (err) {
      toast.show(ERROR_MESSAGES[err.code] || err.message || '撤回失败');
    }
  };

  return (
    <Layout
      title="我的差旅申请"
      navItems={[{ path: '/employee/requests', label: '我的申请' }, { path: '/employee/requests/new', label: '新建申请' }]}
    >
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px' }}>状态筛选：</span>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => navigate('/employee/requests/new')} style={{ marginLeft: 'auto', padding: '6px 16px', border: 'none', borderRadius: '4px', backgroundColor: '#1677ff', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>新建申请</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '4px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>目的地</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>出发日期</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>返回日期</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>交通工具</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>预计费用</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>状态</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px' }}>提交时间</th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.list.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e8e8e8' }}>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.destination}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.startDate?.slice(0, 10)}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.endDate?.slice(0, 10)}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.transport}</td>
              <td style={{ padding: '12px', fontSize: '13px' }}>¥{r.estimatedCost}</td>
              <td style={{ padding: '12px' }}><StatusTag status={r.status} /></td>
              <td style={{ padding: '12px', fontSize: '13px' }}>{r.submittedAt?.slice(0, 19).replace('T', ' ')}</td>
              <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>
                <button onClick={() => navigate(`/employee/requests/${r.id}`)} style={{ padding: '2px 8px', border: '1px solid #1677ff', borderRadius: '4px', background: '#fff', color: '#1677ff', cursor: 'pointer', fontSize: '12px', marginRight: '4px' }}>详情</button>
                {r.status === '待审核' && <button onClick={() => setWithdrawId(r.id)} style={{ padding: '2px 8px', border: '1px solid #f5222d', borderRadius: '4px', background: '#fff', color: '#f5222d', cursor: 'pointer', fontSize: '12px' }}>撤回</button>}
                {r.status === '已拒绝' && <button onClick={() => navigate(`/employee/requests/${r.id}/resubmit`)} style={{ padding: '2px 8px', border: '1px solid #52c41a', borderRadius: '4px', background: '#fff', color: '#52c41a', cursor: 'pointer', fontSize: '12px' }}>重新提交</button>}
              </td>
            </tr>
          ))}
          {data.list.length === 0 && <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#999', fontSize: '14px' }}>暂无数据</td></tr>}
        </tbody>
      </table>

      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
      <ConfirmDialog open={!!withdrawId} title="确认撤回" message="撤回后不可恢复，确定要撤回此申请吗？" onConfirm={handleWithdraw} onCancel={() => setWithdrawId(null)} />
    </Layout>
  );
}