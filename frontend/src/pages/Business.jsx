import React, { useEffect, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import api from '../services/apiClient';
import './Business.css';

const labels = { draft: 'Bản nháp', pending: 'Chờ admin duyệt', needs_info: 'Cần bổ sung', approved: 'Đã duyệt', rejected: 'Từ chối', suspended: 'Đình chỉ' };
const empty = { kind: 'new', legalName: '', taxCode: '', name: '', address: '', latitude: '', longitude: '', type: 'food', contact: '', representativeProof: '', description: '', openingHours: '', imageUrl: '', currency: 'VND', priceMin: '', priceMax: '', attributes: {} };
const errorText = error => error.response?.data?.message || error.message || 'Không thể thực hiện. Hãy thử lại.';
const Field = ({ label, name, value, onChange, type = 'text', required = false, ...rest }) => <label className="business-field"><span>{label}</span><input name={name} type={type} value={value ?? ''} onChange={e => onChange(name, e.target.value)} required={required} {...rest} /></label>;
const AttributeEditor = ({ type, attributes = {}, onChange }) => <div className="business-form">
  {type === 'food' && <><Field label="Loại cơ sở ăn uống" name="restaurantType" value={attributes.restaurantType} onChange={onChange} /><Field label="Nhóm món ăn" name="cuisine" value={attributes.cuisine} onChange={onChange} /><label><input type="checkbox" checked={Boolean(attributes.vegetarian)} onChange={e => onChange('vegetarian', e.target.checked)} /> Có món chay</label><label><input type="checkbox" checked={Boolean(attributes.parking)} onChange={e => onChange('parking', e.target.checked)} /> Có chỗ đỗ xe</label><label><input type="checkbox" checked={Boolean(attributes.reservation)} onChange={e => onChange('reservation', e.target.checked)} /> Có đặt bàn</label></>}
  {type === 'stay' && <><Field label="Loại lưu trú" name="stayType" value={attributes.stayType} onChange={onChange} /><Field label="Loại phòng" name="roomType" value={attributes.roomType} onChange={onChange} /><Field label="Sức chứa" name="capacity" type="number" min="0" value={attributes.capacity} onChange={onChange} /><Field label="Giờ nhận phòng" name="checkIn" value={attributes.checkIn} onChange={onChange} /><Field label="Giờ trả phòng" name="checkOut" value={attributes.checkOut} onChange={onChange} /></>}
  {type === 'activity' && <><Field label="Loại activiteit / hoạt động" name="activityType" value={attributes.activityType} onChange={onChange} /><Field label="Thời lượng gợi ý (phút)" name="suggestedMinutes" type="number" min="0" value={attributes.suggestedMinutes} onChange={onChange} /><Field label="Tuổi tối thiểu" name="minAge" type="number" min="0" value={attributes.minAge} onChange={onChange} /><label><input type="checkbox" checked={Boolean(attributes.freeEntry)} onChange={e => onChange('freeEntry', e.target.checked)} /> Miễn phí</label><label><input type="checkbox" checked={Boolean(attributes.reservation)} onChange={e => onChange('reservation', e.target.checked)} /> Cần đặt trước</label></>}
</div>;

export default function Business() {
  const [mine, setMine] = useState({ businesses: [], applications: [] });
  const [selected, setSelected] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState(empty);
  const [application, setApplication] = useState(null);
  const [files, setFiles] = useState({});
  const [places, setPlaces] = useState([]);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [edit, setEdit] = useState({});
  const [dirty, setDirty] = useState(false);
  const change = (key, value) => {
    if (key === 'type' && Object.keys(form.attributes || {}).length && value !== form.type && !window.confirm('Đổi loại hình sẽ xóa các thuộc tính riêng đã nhập. Bạn có muốn tiếp tục không?')) return;
    setDirty(true);
    setForm(old => ({ ...old, [key]: value, ...(key === 'type' ? { attributes: {} } : {}) }));
  };
  const attribute = (key, value) => change('attributes', { ...form.attributes, [key]: value });
  const load = async () => {
    const { data } = await api.get('/business/mine');
    setMine(data);
    if (!selected && data.businesses.length) setSelected(data.businesses[0].id);
  };
  useEffect(() => { api.get('/business/mine').then(({ data }) => { setMine(data); setSelected(data.businesses[0]?.id || ''); }).catch(e => setError(errorText(e))); }, []);
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!selected) return;
    api.get(`/business/${selected}/dashboard`, { params: { from: from || undefined, to: to || undefined } })
      .then(({ data }) => { setDashboard(data); setEdit({ description: data.business.description || '', openingHours: data.business.openingHours || '', imageUrl: data.business.imageUrl || '', gallery: (data.business.gallery || []).join('\n'), priceMin: data.business.priceMin ?? '', priceMax: data.business.priceMax ?? '', attributes: data.business.attributes || {} }); })
      .catch(e => setError(errorText(e)));
  }, [selected, from, to]);
  const run = async fn => { setBusy(true); setError(''); setMessage(''); try { await fn(); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); } };
  const search = async () => {
    if (query.trim().length < 2) return setError('Nhập ít nhất 2 ký tự để tìm địa điểm.');
    await run(async () => { const { data } = await api.get('/locations', { params: { region: query.trim(), limit: 30 } }); setPlaces(data); });
  };
  const saveDraft = () => run(async () => {
    const body = { ...form, ...(form.kind === 'claim' ? { locationId: form.locationId } : {}), ...(form.kind === 'change' ? { businessId: selected } : {}) };
    const { data } = application?.status === 'draft' || application?.status === 'needs_info'
      ? await api.put(`/business/applications/${application.id}`, body)
      : await api.post('/business/applications', body);
    setApplication(data); setDirty(false); setMessage('Đã lưu bản nháp. Tải đủ ba loại bằng chứng rồi gửi xét duyệt.');
  });
  const upload = () => run(async () => {
    if (!application) throw new Error('Hãy lưu bản nháp trước khi tải bằng chứng.');
    for (const kind of ['legal', 'operation', 'representative']) {
      const file = files[kind]; if (!file) continue;
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      await api.post(`/business/applications/${application.id}/evidence`, { kind, filename: file.name, data });
    }
    const { data } = await api.get('/business/mine');
    setApplication(data.applications.find(a => a.id === application.id));
    setFiles({}); setMessage('Đã tải bằng chứng.');
  });
  const submit = () => run(async () => { await api.post(`/business/applications/${application.id}/submit`); setApplication(null); setForm(empty); setMessage('Hồ sơ đã gửi. Theo dõi trạng thái bên dưới.'); });
  const savePublic = () => run(async () => { await api.patch(`/business/${selected}`, { ...edit, gallery: edit.gallery.split('\n').map(x => x.trim()).filter(Boolean) }); const { data } = await api.get(`/business/${selected}/dashboard`); setDashboard(data); setMessage('Đã cập nhật hồ sơ công khai và lưu lịch sử chỉnh sửa.'); });
  const editAttribute = (name, value) => setEdit(old => ({ ...old, attributes: { ...old.attributes, [name]: value } }));
  const reply = (reviewId) => run(async () => { const content = window.prompt('Phản hồi công khai của cơ sở:'); if (!content) return; await api.put(`/business/${selected}/reviews/${reviewId}/reply`, { content }); const { data } = await api.get(`/business/${selected}/dashboard`); setDashboard(data); });
  const report = (reviewId) => run(async () => { const reason = window.prompt('Lý do báo cáo đánh giá:'); if (!reason) return; await api.post(`/business/${selected}/reviews/${reviewId}/report`, { reason }); setMessage('Đã gửi báo cáo cho admin.'); });
  const downloadReport = async () => {
    const response = await api.get(`/business/${selected}/report.csv`, { params: { from: from || undefined, to: to || undefined }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `business-${selected}-report.csv`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <Layout><main className="business-page">{dashboard && <section className="business-section"><h2>Thuộc tính đang công bố</h2><AttributeEditor type={dashboard.business.type} attributes={edit.attributes} onChange={editAttribute} /><button type="button" onClick={savePublic} disabled={busy}>Lưu thuộc tính</button></section>}
    <header className="business-heading"><div><h1>Quản lý cơ sở</h1><p>Mỗi cơ sở có hồ sơ, đánh giá và quyền quản lý riêng.</p></div><span>{mine.businesses.filter(b => b.managementStatus === 'active').length} cơ sở đang quản lý</span></header>
    {error && <p role="alert" className="business-alert">{error}</p>}{message && <p role="status" className="business-success">{message}</p>}{selected && <button type="button" onClick={() => downloadReport().catch(e => setError(errorText(e)))}>Tải báo cáo CSV</button>}{dashboard?.trend?.length > 0 && <section className="business-trend" aria-label="Biểu đồ hoạt động theo ngày"><h3>Hoạt động theo ngày</h3>{dashboard.trend.slice(-30).map(row => <div className="business-trend-row" key={row.date}><span>{row.date}</span><div><i style={{ width: `${Math.min(100, row.itineraryCount * 12)}%` }} /><b>{row.itineraryCount} lịch trình · {row.checkinCount} check-in · {row.reviewCount} đánh giá</b></div></div>)}</section>}
    <section className="business-section"><h2>Hồ sơ xét duyệt</h2>{mine.applications.length ? <div className="business-list">{mine.applications.map(a => <button key={a.id} type="button" onClick={() => { setApplication(a); setForm({ ...empty, ...a.payload, kind: a.kind, locationId: a.locationId }); }}><strong>{a.payload.name}</strong><span>{labels[a.status] || a.status}</span><small>{a.reason || 'Chưa có ghi chú từ admin'}</small></button>)}</div> : <p>Chưa có hồ sơ. Đăng ký cơ sở mới hoặc xin quản lý địa điểm trong danh mục.</p>}</section>
    <section className="business-section"><h2>{application ? `Hồ sơ #${application.id}` : 'Đăng ký Business'}</h2>
      <p>Quyền quản lý chỉ được cấp sau khi admin duyệt. Bạn vẫn dùng tài khoản cá nhân bình thường.</p>
      <div className="business-tabs"><button type="button" onClick={() => { setApplication(null); setForm(empty); }}>Cơ sở mới</button><button type="button" onClick={() => { setApplication(null); setForm({ ...empty, kind: 'claim' }); }}>Cơ sở có sẵn</button>{selected && <button type="button" onClick={() => { setApplication(null); setForm({ ...empty, kind: 'change', ...dashboard?.business, legalName: '', taxCode: '', representativeProof: '' }); }}>Yêu cầu sửa thông tin cần duyệt</button>}</div>
      <p>Loại hồ sơ: <strong>{form.kind === 'new' ? 'Cơ sở mới' : form.kind === 'claim' ? 'Xin quản lý cơ sở có sẵn' : 'Duyệt lại thông tin cơ sở'}</strong></p>
      {form.kind === 'claim' && <div className="business-search"><input aria-label="Tìm địa điểm" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên địa điểm hoặc khu vực" /><button type="button" onClick={search}>Tìm</button><select aria-label="Chọn địa điểm" value={form.locationId || ''} onChange={e => { const p = places.find(x => x.id === e.target.value); change('locationId', e.target.value); if (p) setForm(old => ({ ...old, locationId: p.id, name: p.name, address: p.address || '', latitude: p.latitude, longitude: p.longitude })); }}><option value="">Chọn cơ sở</option>{places.map(p => <option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}</select></div>}
      <form className="business-form" onSubmit={e => { e.preventDefault(); saveDraft(); }}>
        <Field label="Doanh nghiệp hoặc hộ kinh doanh" name="legalName" value={form.legalName} onChange={change} required /><Field label="Mã số thuế" name="taxCode" value={form.taxCode} onChange={change} required />
        <Field label="Tên cơ sở hoặc chi nhánh" name="name" value={form.name} onChange={change} required /><Field label="Địa chỉ" name="address" value={form.address} onChange={change} required />
        <Field label="Vĩ độ" name="latitude" type="number" step="any" value={form.latitude} onChange={change} required /><Field label="Kinh độ" name="longitude" type="number" step="any" value={form.longitude} onChange={change} required />
        <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition(p => setForm(old => ({ ...old, latitude: p.coords.latitude, longitude: p.coords.longitude })), () => setError('Không lấy được vị trí. Hãy nhập tọa độ thủ công.'), { enableHighAccuracy: true })}>Lấy vị trí hiện tại</button>
        <label className="business-field"><span>Loại hình</span><select value={form.type} onChange={e => change('type', e.target.value)}><option value="food">Ăn uống</option><option value="stay">Lưu trú</option><option value="activity">Tham quan / giải trí</option></select></label>
        <Field label="Liên hệ" name="contact" value={form.contact} onChange={change} required /><Field label="Mô tả" name="description" value={form.description} onChange={change} /><Field label="Giờ mở cửa" name="openingHours" value={form.openingHours} onChange={change} /><Field label="Ảnh đại diện (URL)" name="imageUrl" value={form.imageUrl} onChange={change} />
        <label className="business-field"><span>Tiền tệ</span><select value={form.currency || 'VND'} onChange={e => change('currency', e.target.value)}><option value="VND">VND</option><option value="USD">USD</option></select></label><Field label={`Giá từ (${form.currency || 'VND'})`} name="priceMin" type="number" min="0" value={form.priceMin} onChange={change} /><Field label={`Giá đến (${form.currency || 'VND'})`} name="priceMax" type="number" min="0" value={form.priceMax} onChange={change} />
        {form.type === 'food' && <><Field label="Loại cơ sở ăn uống" name="restaurantType" value={form.attributes?.restaurantType} onChange={attribute} /><Field label="Nhóm món ăn" name="cuisine" value={form.attributes?.cuisine} onChange={attribute} /><label><input type="checkbox" checked={Boolean(form.attributes?.vegetarian)} onChange={e => attribute('vegetarian', e.target.checked)} /> Có món chay</label><label><input type="checkbox" checked={Boolean(form.attributes?.parking)} onChange={e => attribute('parking', e.target.checked)} /> Có chỗ đỗ xe</label><label><input type="checkbox" checked={Boolean(form.attributes?.reservation)} onChange={e => attribute('reservation', e.target.checked)} /> Có đặt bàn</label></>}
        {form.type === 'stay' && <><Field label="Loại lưu trú" name="stayType" value={form.attributes?.stayType} onChange={attribute} /><Field label="Loại phòng" name="roomType" value={form.attributes?.roomType} onChange={attribute} /><Field label="Sức chứa" name="capacity" type="number" min="0" value={form.attributes?.capacity} onChange={attribute} /><Field label="Giờ nhận phòng" name="checkIn" value={form.attributes?.checkIn} onChange={attribute} /><Field label="Giờ trả phòng" name="checkOut" value={form.attributes?.checkOut} onChange={attribute} /></>}
        {form.type === 'activity' && <><Field label="Loại điểm tham quan / hoạt động" name="activityType" value={form.attributes?.activityType} onChange={attribute} /><Field label="Thời lượng gợi ý (phút)" name="suggestedMinutes" type="number" value={form.attributes?.suggestedMinutes} onChange={attribute} /><Field label="Tuổi tối thiểu" name="minAge" type="number" value={form.attributes?.minAge} onChange={attribute} /><label><input type="checkbox" checked={Boolean(form.attributes?.freeEntry)} onChange={e => attribute('freeEntry', e.target.checked)} /> Miễn phí</label><label><input type="checkbox" checked={Boolean(form.attributes?.reservation)} onChange={e => attribute('reservation', e.target.checked)} /> Cần đặt trước</label></>}
        <Field label="Tiện ích (cách nhau bằng dấu phẩy)" name="amenities" value={(form.attributes?.amenities || []).join(', ')} onChange={(_, value) => attribute('amenities', value.split(',').map(x => x.trim()).filter(Boolean))} />
        <label className="business-field business-wide"><span>Giải thích quyền đại diện</span><textarea value={form.representativeProof} onChange={e => change('representativeProof', e.target.value)} required /></label>
        <button type="submit" disabled={busy || (application && !['draft', 'needs_info'].includes(application.status))}>Lưu bản nháp</button>
      </form>
      {application && ['draft', 'needs_info'].includes(application.status) && <div className="business-evidence"><h3>Bằng chứng riêng tư</h3><p>JPEG, PNG, WebP hoặc PDF; tối đa 8 MB mỗi tệp. Chỉ bạn và admin truy cập được.</p>{[['legal', 'Giấy tờ pháp lý'], ['operation', 'Ảnh hoạt động'], ['representative', 'Quyền đại diện']].map(([key, label]) => <label key={key}>{label}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFiles(old => ({ ...old, [key]: e.target.files[0] }))} /></label>)}<button type="button" disabled={busy} onClick={upload}>Tải bằng chứng</button><ul>{application.evidence?.map(e => <li key={e.id}><a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/business/applications/${application.id}/evidence/${e.id}`} onClick={async event => { event.preventDefault(); const response = await api.get(`/business/applications/${application.id}/evidence/${e.id}`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = url; a.download = e.filename; a.click(); URL.revokeObjectURL(url); }}>{e.filename}</a> ({e.kind})</li>)}</ul><button type="button" disabled={busy} onClick={submit}>Gửi admin xét duyệt</button></div>}
    </section>
    {mine.businesses.length > 0 && <section className="business-section"><h2>Dashboard cơ sở</h2><select aria-label="Chọn cơ sở" value={selected} onChange={e => setSelected(e.target.value)}>{mine.businesses.map(b => <option key={b.id} value={b.id}>{b.name} — {b.managementStatus}</option>)}</select>{dashboard && <><p>Trạng thái: {dashboard.business.isActive ? 'Đang hoạt động' : 'Tạm ngừng'} · Loại: {dashboard.business.type} · Giá: {dashboard.business.priceUnit || 'VND'}</p><div className="business-filters"><label>Từ ngày <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>Đến ngày <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label></div><div className="business-metrics"><div><strong>{dashboard.stats.itineraryCount}</strong><span>Lịch trình đã thêm cơ sở</span></div><div><strong>{dashboard.stats.completedTripCount}</strong><span>Chuyến đã hoàn thành có cơ sở</span></div><div><strong>{dashboard.stats.checkinCount}</strong><span>Check-in GPS hợp lệ</span></div><div><strong>{dashboard.stats.averageRating ?? 'Chưa có dữ liệu'}</strong><span>Điểm trung bình · {dashboard.stats.reviewCount} đánh giá</span></div></div><p>Chỉ số lịch trình là số tổng hợp; lượt được thêm vào lịch trình khác với lượt ghé thực tế.</p><h3>Chỉnh sửa thông tin công khai</h3><div className="business-form">{[['description','Mô tả'],['openingHours','Giờ mở cửa'],['imageUrl','Ảnh đại diện'],['priceMin','Giá từ VND'],['priceMax','Giá đến VND']].map(([key, label]) => <Field key={key} label={label} name={key} value={edit[key]} onChange={(name, value) => setEdit(old => ({ ...old, [name]: value }))} />)}<label className="business-field"><span>Ảnh bổ sung, mỗi URL một dòng</span><textarea value={edit.gallery} onChange={e => setEdit(old => ({ ...old, gallery: e.target.value }))} /></label>{dashboard.business.type === 'food' && <><Field label="Loại món" name="cuisine" value={edit.attributes?.cuisine} onChange={editAttribute} /><label><input type="checkbox" checked={Boolean(edit.attributes?.vegetarian)} onChange={e => editAttribute('vegetarian', e.target.checked)} /> Có món chay</label></>}{dashboard.business.type === 'stay' && <><Field label="Loại lưu trú" name="stayType" value={edit.attributes?.stayType} onChange={editAttribute} /><Field label="Giờ nhận phòng" name="checkIn" value={edit.attributes?.checkIn} onChange={editAttribute} /><Field label="Giờ trả phòng" name="checkOut" value={edit.attributes?.checkOut} onChange={editAttribute} /></>}{dashboard.business.type === 'activity' && <><Field label="Thời lượng gợi ý (phút)" name="suggestedMinutes" value={edit.attributes?.suggestedMinutes} onChange={editAttribute} /><Field label="Tuổi tối thiểu" name="minAge" value={edit.attributes?.minAge} onChange={editAttribute} /></>}<Field label="Tiện ích (dấu phẩy)" name="amenities" value={(edit.attributes?.amenities || []).join(', ')} onChange={(_, value) => editAttribute('amenities', value.split(',').map(x => x.trim()).filter(Boolean))} /><button type="button" onClick={savePublic} disabled={busy}>Lưu thay đổi</button></div><h3>Đánh giá khách</h3>{dashboard.reviews.length ? dashboard.reviews.map(r => <article key={r.id} className="business-review"><strong>{r.author?.name || 'Khách'} · {r.rating}/5</strong><span>{r.verifiedVisit ? 'Đã xác nhận ghé thăm' : 'Đánh giá cũ chưa xác nhận check-in'}</span><p>{r.content}</p>{r.ownerReply && <blockquote>Phản hồi của cơ sở: {r.ownerReply}</blockquote>}<button type="button" onClick={() => reply(r.id)}>Phản hồi</button><button type="button" onClick={() => report(r.id)}>Báo cáo vi phạm</button></article>) : <p>Chưa có đánh giá.</p>}</>}</section>}
  </main></Layout>;
}
