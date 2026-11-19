import React, { useEffect, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import api from '../services/apiClient';
import './Business.css';

export default function BusinessReviews() {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(''); const [dashboard, setDashboard] = useState(null); const [error, setError] = useState('');
  const load = id => api.get(`/business/${id}/dashboard`).then(({ data }) => setDashboard(data)).catch(e => setError(e.response?.data?.message || e.message));
  useEffect(() => { api.get('/business/mine').then(({ data }) => { setItems(data.businesses || []); const id = data.businesses?.[0]?.id || ''; setSelected(id); if (id) load(id); }).catch(e => setError(e.response?.data?.message || e.message)); }, []);
  return <Layout><main className="business-page"><header className="business-heading"><div><h1>Đánh giá và phản hồi</h1><p>Phản hồi khách hàng và báo cáo nội dung vi phạm.</p></div></header>{error && <p role="alert" className="business-alert">{error}</p>}<section className="business-section"><label className="business-field"><span>Cơ sở</span><select value={selected} onChange={e => { setSelected(e.target.value); load(e.target.value); }}>{items.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></section><section className="business-section">{dashboard?.reviews?.length ? dashboard.reviews.map(review => <article className="business-review" key={review.id}><strong>{review.author?.name || 'Khách'} · {review.rating}/5</strong><span>{review.verifiedVisit ? 'Đã xác nhận ghé thăm' : 'Đánh giá cũ chưa xác nhận check-in'}</span><p>{review.content}</p>{review.ownerReply && <blockquote>Phản hồi của cơ sở: {review.ownerReply}</blockquote>}<p className="business-muted">Phản hồi và báo cáo được xử lý qua API quản lý cơ sở.</p></article>) : <p>Chưa có đánh giá.</p>}</section></main></Layout>;
}
