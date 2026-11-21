/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/apiClient';

export const typeLabels = { food: 'Ăn uống', stay: 'Lưu trú', activity: 'Tham quan / giải trí' };
export const errorText = error => error.response?.data?.message || error.message || 'Không thể tải dữ liệu. Hãy thử lại.';

export function useBusinessSelection({ loadDashboard = false, from, to } = {}) {
  const [params, setParams] = useSearchParams();
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState(params.get('businessId') || '');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/business/mine').then(({ data }) => {
      if (!active) return;
      const list = data.businesses || [];
      setBusinesses(list);
      const requested = params.get('businessId');
      const valid = list.some(item => String(item.id) === String(requested));
      const next = valid ? String(requested) : (list[0] ? String(list[0].id) : '');
      setBusinessId(next);
      if (next !== requested) setParams(current => { current.set('businessId', next); return current; }, { replace: true });
    }).catch(error => active && setError(errorText(error))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [params, setParams]);
  const selectBusiness = useCallback(id => {
    const next = businesses.find(item => String(item.id) === String(id));
    if (!next) return;
    setBusinessId(String(next.id));
    setParams(current => { current.set('businessId', String(next.id)); return current; });
  }, [businesses, setParams]);
  useEffect(() => {
    if (!loadDashboard || !businessId) { setDashboard(null); return undefined; }
    const id = ++request.current;
    setDashboard(null);
    setLoading(true);
    api.get(`/business/${businessId}/dashboard`, { params: { from: from || undefined, to: to || undefined } }).then(({ data }) => {
      if (id === request.current) setDashboard(data);
    }).catch(error => { if (id === request.current) setError(errorText(error)); }).finally(() => { if (id === request.current) setLoading(false); });
    return () => { if (id === request.current) request.current += 1; };
  }, [businessId, from, to, loadDashboard]);
  const selected = useMemo(() => businesses.find(item => String(item.id) === String(businessId)) || null, [businesses, businessId]);
  return { businesses, businessId, selected, dashboard, loading, error, setError, selectBusiness };
}

export function BusinessHeader({ title, description, businesses, businessId, onBusinessChange, actions }) {
  return <header className="business-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="business-heading-actions"><label className="business-inline-select"><span>Cơ sở</span><select aria-label="Chọn cơ sở" value={businessId} onChange={event => onBusinessChange(event.target.value)}><option value="">Chọn cơ sở</option>{businesses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{actions}</div></header>;
}

export function BusinessTimeFilter({ from, to, onRange }) {
  const setQuick = days => { const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - days + 1); onRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)); };
  const month = () => { const now = new Date(); onRange(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)); };
  return <div className="business-filter-bar" aria-label="Bộ lọc thời gian"><span>Khoảng thời gian</span><button type="button" className={!from && !to ? 'is-active' : ''} onClick={() => onRange('', '')}>Tất cả</button><button type="button" onClick={() => setQuick(7)}>7 ngày</button><button type="button" onClick={() => setQuick(30)}>30 ngày</button><button type="button" onClick={month}>Tháng này</button><label>Từ <input type="date" value={from} onChange={event => onRange(event.target.value, to)} /></label><label>Đến <input type="date" value={to} onChange={event => onRange(from, event.target.value)} /></label></div>;
}

export function EmptyState({ title = 'Chưa có dữ liệu', children }) { return <div className="business-empty"><strong>{title}</strong>{children && <p>{children}</p>}</div>; }
export function BusinessLinks({ businessId }) { return <nav className="business-tabs" aria-label="Điều hướng cơ sở"><Link className="btn btn-outline" to={`/business?businessId=${businessId}`}>Tổng quan</Link><Link className="btn btn-outline" to={`/business/${businessId}/edit?businessId=${businessId}`}>Chỉnh sửa thông tin</Link><Link className="btn btn-outline" to={`/business/reviews?businessId=${businessId}`}>Đánh giá</Link><Link className="btn btn-outline" to={`/business/reports?businessId=${businessId}`}>Báo cáo</Link></nav>; }
