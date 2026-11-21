import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../Components/Layout/Layout';
import api from '../services/apiClient';
import './Business.css';
import { typeLabels } from './businessShared';

const errorText = e => e.response?.data?.message || e.message || 'Không thể tải dữ liệu.';
export default function BusinessPlaces() {
  const { id } = useParams();
  const [places, setPlaces] = useState([]);
  const [place, setPlace] = useState(null);
  const [visitId, setVisitId] = useState('');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data } = await api.get(id ? `/business/${id}` : '/business'); if (id) setPlace(data); else setPlaces(data); };
  useEffect(() => { api.get(id ? `/business/${id}` : '/business').then(({ data }) => { if (id) setPlace(data); else setPlaces(data); }).catch(e => setError(errorText(e))); }, [id]);
  const checkin = () => {
    setError(''); setBusy(true);
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ định vị.'); setBusy(false); return; }
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const { data } = await api.post(`/business/${id}/checkins`, { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() });
        setVisitId(data.id); setMessage(`${data.reused ? 'Đã dùng lượt ghé gần đây.' : 'Check-in thành công.'} ${data.note}`);
      } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
    }, e => { setError(`Không lấy được vị trí (${e.message}). Hãy cấp quyền và thử lại.`); setBusy(false); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
  };
  const saveReview = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.put(`/business/${id}/reviews/${visitId}`, { rating: Number(rating), content }); setMessage('Đã lưu đánh giá đã xác nhận ghé thăm.'); await load(); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  return <Layout><div className="business-page"><header className="business-heading"><div><h1>{place?.name || 'Cơ sở du lịch'}</h1><p>{place?.address || 'Khám phá cơ sở ăn uống, lưu trú và tham quan.'}</p></div><Link to={id ? '/business/places' : '/business/registration'}>{id ? 'Tất cả cơ sở' : 'Đăng ký Business'}</Link></header>
    {error && <p role="alert" className="business-alert">{error}</p>}{message && <p role="status" className="business-success">{message}</p>}
    {!id && <div className="business-place-grid">{places.map(p => <Link key={p.id} to={`/business/places/${p.id}`} className="business-place"><img className="business-place-image" src={p.imageUrl || '/images/place-placeholder.svg'} alt="" onError={event => { event.currentTarget.src = '/images/place-placeholder.svg'; }} /><strong>{p.name}</strong><span>{typeLabels[p.type] || p.type} · {p.address}</span><small>★ {p.averageRating ?? 'Chưa có dữ liệu'} · {p.priceMin ?? 'Chưa có giá'} {p.priceUnit || ''}</small></Link>)}{!places.length && <p>Chưa có cơ sở được duyệt.</p>}</div>}
    {place && <><section className="business-section"><p>{place.description || 'Chưa có mô tả.'}</p><dl className="business-details"><dt>Loại hình</dt><dd>{place.type}</dd><dt>Liên hệ</dt><dd>{place.contact || 'Chưa có dữ liệu'}</dd><dt>Giờ mở cửa</dt><dd>{place.openingHours || 'Chưa có dữ liệu'}</dd><dt>Giá</dt><dd>{place.priceMin ?? '—'}–{place.priceMax ?? '—'} {place.priceUnit || 'VND'}</dd><dt>Đánh giá</dt><dd>{place.averageRating ?? 'Chưa có dữ liệu'} ({place.reviewCount} lượt)</dd></dl><button type="button" disabled={busy} onClick={checkin}>Check-in bằng vị trí hiện tại</button><p>GPS hỗ trợ xác nhận vị trí trong phạm vi cơ sở; không bảo đảm chống giả mạo tuyệt đối.</p></section>
      <section className="business-section"><h2>Đánh giá trải nghiệm</h2>{visitId ? <form onSubmit={saveReview} className="business-form"><label className="business-field">Điểm đánh giá<select value={rating} onChange={e => setRating(e.target.value)}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} sao</option>)}</select></label><label className="business-field business-wide">Trải nghiệm của bạn<textarea value={content} onChange={e => setContent(e.target.value)} maxLength={5000} /></label><button disabled={busy}>Lưu đánh giá</button></form> : <p>Hãy check-in hợp lệ tại cơ sở để đánh giá. API cũng kiểm tra điều kiện này.</p>}{place.reviews.map(r => <article key={r.id} className="business-review"><strong>{r.author?.name || 'Khách'} · {r.rating}/5</strong><span>{r.verifiedVisit ? 'Đã xác nhận ghé thăm' : 'Đánh giá cũ chưa xác nhận check-in'}</span><p>{r.content}</p>{r.ownerReply && <blockquote>Phản hồi của cơ sở: {r.ownerReply}</blockquote>}</article>)}</section></>}
  </div></Layout>;
}
