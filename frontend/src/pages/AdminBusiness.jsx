import React, { useEffect, useState } from 'react';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import api from '../services/apiClient';
import './Business.css';

const label = { pending: 'Chờ duyệt', draft: 'Nháp', needs_info: 'Cần bổ sung', approved: 'Đã duyệt', rejected: 'Từ chối', suspended: 'Đình chỉ' };
const errorText = e => e.response?.data?.message || e.message || 'Không thể tải dữ liệu.';
export default function AdminBusiness() {
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    const [a, b, c, d] = await Promise.all([api.get('/admin/business/stats'), api.get('/admin/business/applications'), api.get('/admin/business/businesses'), api.get('/admin/business/reports')]);
    setStats(a.data); setApps(b.data); setBusinesses(c.data); setReports(d.data);
    if (selected) setSelected(b.data.find(x => x.id === selected.id) || null);
  };
  useEffect(() => { Promise.all([api.get('/admin/business/stats'), api.get('/admin/business/applications'), api.get('/admin/business/businesses'), api.get('/admin/business/reports')]).then(([a, b, c, d]) => { setStats(a.data); setApps(b.data); setBusinesses(c.data); setReports(d.data); }).catch(e => setError(errorText(e))); }, []);
  const run = async fn => { setBusy(true); setError(''); setMessage(''); try { await fn(); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } };
  const decide = action => run(async () => {
    await api.post(`/admin/business/applications/${selected.id}/decision`, { action, reason });
    setMessage('Đã lưu quyết định và thông báo cho người nộp.'); setReason('');
  });
  const analyze = () => run(async () => { await api.post(`/admin/business/applications/${selected.id}/analyze`); setMessage('Đã lưu kết quả AI. Kết quả chỉ hỗ trợ xét duyệt.'); });
  const download = async e => {
    try { const response = await api.get(`/admin/business/applications/${selected.id}/evidence/${e.id}`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = e.filename; a.click(); URL.revokeObjectURL(url); }
    catch (err) { setError(errorText(err)); }
  };
  return <AdminLayout><main className="business-page admin-business">{selected && <section className="business-section"><h2>Thuộc tính theo loại hình</h2><pre>{JSON.stringify(selected.payload.attributes || {}, null, 2)}</pre></section>}
    <header className="business-heading"><div><h1>Business và cơ sở</h1><p>Xét duyệt bằng chứng, quyền quản lý và phản ánh đánh giá.</p></div></header>
    {error && <p role="alert" className="business-alert">{error}</p>}{message && <p role="status" className="business-success">{message}</p>}
    {stats && <div className="business-metrics">{[['Tổng cơ sở', stats.total], ['Hồ sơ chờ duyệt', stats.pending], ['Đang hoạt động', stats.active], ['Check-in hợp lệ', stats.checkins], ['Đánh giá cơ sở', stats.reviews]].map(([name, value]) => <div key={name}><strong>{value}</strong><span>{name}</span></div>)}</div>}
    <div className="business-admin-grid"><section className="business-section"><h2>Hồ sơ đăng ký</h2><div className="business-list">{apps.map(a => <button type="button" key={a.id} className={selected?.id === a.id ? 'selected' : ''} onClick={() => setSelected(a)}><strong>{a.payload.name}</strong><span>{label[a.status] || a.status}</span><small>{a.kind} · {a.payload.legalName}</small></button>)}{!apps.length && <p>Chưa có hồ sơ.</p>}</div></section>
    <section className="business-section"><h2>{selected ? `Hồ sơ #${selected.id}` : 'Chọn hồ sơ để xem'}</h2>{selected && <><dl className="business-details">{[['Trạng thái', label[selected.status]], ['Người nộp', selected.applicantId], ['Doanh nghiệp', selected.payload.legalName], ['Mã số thuế', selected.payload.taxCode], ['Cơ sở', selected.payload.name], ['Địa chỉ', selected.payload.address], ['Tọa độ', `${selected.payload.latitude}, ${selected.payload.longitude}`], ['Loại hình', selected.payload.type], ['Liên hệ', selected.payload.contact], ['Quyền đại diện', selected.payload.representativeProof], ['Khoảng giá', `${selected.payload.priceMin ?? '—'}–${selected.payload.priceMax ?? '—'} ${selected.payload.priceUnit}`]].map(([key, value]) => <React.Fragment key={key}><dt>{key}</dt><dd>{value || '—'}</dd></React.Fragment>)}</dl><h3>Bằng chứng</h3><ul>{selected.evidence.map(e => <li key={e.id}><button type="button" onClick={() => download(e)}>{e.filename} ({e.kind})</button></li>)}</ul><h3>Phân tích AI</h3><p>Đối chiếu nguồn thuế: <strong>{selected.aiResult?.taxRegistryStatus || 'Chưa đối chiếu nguồn đăng ký'}</strong></p><p>Trạng thái: {selected.aiStatus}{selected.aiError && ` · ${selected.aiError}`}</p>{selected.aiResult && <pre>{JSON.stringify(selected.aiResult.extracted, null, 2)}</pre>}<button type="button" onClick={analyze} disabled={busy || selected.aiStatus === 'running'}>{busy ? 'Đang xử lý…' : 'Phân tích lại hồ sơ bằng AI'}</button><h3>Lịch sử xét duyệt</h3><ul>{selected.events.map((event, index) => <li key={index}>{new Date(event.at).toLocaleString('vi-VN')} · {event.action} · người thực hiện #{event.actorId}{event.reason && ` · ${event.reason}`}</li>)}</ul>{selected.status === 'pending' && <div className="business-decisions"><label>Lý do / yêu cầu bổ sung<textarea value={reason} onChange={e => setReason(e.target.value)} /></label><button type="button" disabled={busy} onClick={() => decide('approve')}>Duyệt và cấp quyền</button><button type="button" disabled={busy || !reason.trim()} onClick={() => decide('needs_info')}>Yêu cầu bổ sung</button><button type="button" disabled={busy || !reason.trim()} onClick={() => decide('reject')}>Từ chối</button></div>}</>}</section></div>
    <section className="business-section"><h2>Cơ sở và người quản lý</h2><div className="business-table-wrap"><table><thead><tr><th>Cơ sở</th><th>Loại</th><th>Trạng thái</th><th>Người quản lý</th></tr></thead><tbody>{businesses.map(b => <tr key={b.id}><td>{b.name}</td><td>{b.type}</td><td>{b.isActive ? 'Hoạt động' : 'Tạm ngừng'}</td><td>{b.managers.map(m => <div key={m.id}>{m.name} ({m.status}) {m.status === 'active' && <button type="button" disabled={busy} onClick={() => { const why = window.prompt('Lý do đình chỉ quyền quản lý:'); if (why) run(async () => { await api.post(`/admin/business/businesses/${b.id}/suspend`, { userId: m.id, reason: why }); setMessage('Đã đình chỉ quyền quản lý.'); }); }}>Đình chỉ</button>}</div>)}</td></tr>)}</tbody></table></div></section>
    <section className="business-section"><h2>Báo cáo đánh giá</h2>{reports.length ? reports.map(r => <article className="business-review" key={r.id}><strong>{r.businessName} · {r.status}</strong><p>{r.reason}</p><blockquote>{r.review.content}</blockquote>{r.status === 'pending' && <><button type="button" disabled={busy} onClick={() => run(() => api.post(`/admin/business/reports/${r.id}/decision`, { action: 'hide' }))}>Ẩn đánh giá</button><button type="button" disabled={busy} onClick={() => run(() => api.post(`/admin/business/reports/${r.id}/decision`, { action: 'dismiss' }))}>Bỏ qua báo cáo</button></>}</article>) : <p>Chưa có báo cáo.</p>}</section>
  </main></AdminLayout>;
}
