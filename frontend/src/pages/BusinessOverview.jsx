import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../Components/Layout/Layout';
import api from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import './Business.css';

const messageOf = error => error.response?.data?.message || error.message || 'Không thể tải dữ liệu.';

export default function BusinessOverview() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/business/mine').then(({ data }) => { setBusinesses(data.businesses || []); setSelected(data.businesses?.[0]?.id || ''); }).catch(e => setError(messageOf(e))); }, []);
  useEffect(() => { if (selected) api.get(`/business/${selected}/dashboard`).then(({ data }) => setDashboard(data)).catch(e => setError(messageOf(e))); }, [selected]);
  if (user?.role !== 2 && user?.role !== 'business') return <Navigate to="/business/registration" replace />;
  return <Layout><main className="business-page">
    <header className="business-heading"><div><h1>Dashboard Business</h1><p>Tổng quan hoạt động của cơ sở đang được cấp quyền quản lý.</p></div><a className="btn btn-primary" href="/business/registration">Đăng ký hoặc cập nhật hồ sơ</a></header>
    {error && <p role="alert" className="business-alert">{error}</p>}
    <section className="business-section"><label className="business-field"><span>Cơ sở đang chọn</span><select value={selected} onChange={e => setSelected(e.target.value)}>{businesses.map(b => <option key={b.id} value={b.id}>{b.name} — {b.managementStatus}</option>)}</select></label></section>
    {dashboard && <><section className="business-section"><h2>{dashboard.business.name}</h2><p>{dashboard.business.address}</p><p>Trạng thái: {dashboard.business.isActive ? 'Đang hoạt động' : 'Tạm ngừng'} · Xét duyệt: {dashboard.business.managementStatus || 'Đã duyệt'} · Loại: {dashboard.business.type}</p><div className="business-metrics"><div><strong>{dashboard.stats.itineraryCount}</strong><span>Lịch trình có cơ sở</span></div><div><strong>{dashboard.stats.completedTripCount}</strong><span>Chuyến hoàn thành</span></div><div><strong>{dashboard.stats.checkinCount}</strong><span>Check-in hợp lệ</span></div><div><strong>{dashboard.stats.averageRating ?? 'Chưa có dữ liệu'}</strong><span>Điểm trung bình · {dashboard.stats.reviewCount} đánh giá</span></div></div><p>Thống kê lịch trình chỉ tổng hợp từ lịch trình riêng tư và được tính theo khoảng thời gian đã chọn.</p></section><section className="business-section"><h2>Truy cập nhanh</h2><div className="business-tabs"><a className="btn btn-outline" href={`/business/${selected}/edit`}>Chỉnh sửa hồ sơ</a><a className="btn btn-outline" href="/business/reviews">Đánh giá và phản hồi</a><a className="btn btn-outline" href="/business/reports">Báo cáo hoạt động</a></div></section></>}
  </main></Layout>;
}
