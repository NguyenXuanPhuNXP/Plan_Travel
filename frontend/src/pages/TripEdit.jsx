import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, Check, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import Layout from '../Components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { itineraryService } from '../services/itineraryService';
import { friendService } from '../services/friendService';
import apiClient from '../services/apiClient';
import { createPlanDraft, planPayload } from '../utils/planDraft';
import './TripEdit.css';

const COSTS = [['costTransport', 'Di chuyển'], ['costMeals', 'Ăn uống'], ['costAttractions', 'Tham quan'], ['costAccommodation', 'Lưu trú'], ['costContingency', 'Dự phòng']];
const TABS = [['general', 'Thông tin'], ['schedule', 'Lịch trình'], ['costs', 'Chi phí'], ['packing', 'Đồ mang theo'], ['members', 'Thành viên']];
const newKey = () => crypto.randomUUID();
function Field({ label, children }) { return <label className="plan-edit-field"><span>{label}</span>{children}</label>; }

function EditorFrame({ embedded, children }) { return embedded ? <>{children}</> : <Layout>{children}</Layout>; }
function EditorSection({ embedded, title, visible, children }) {
  if (embedded) return <details className="plan-edit-inline-section" open={title === 'Thông tin'}><summary>{title}</summary><div>{children}</div></details>;
  return visible ? <>{children}</> : null;
}

export default function TripEdit({ embedded = false, onSaved, onCancel }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { addTrip } = useTrips();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [friends, setFriends] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [friendId, setFriendId] = useState('');
  const isOwner = String(trip?.userId) === String(user?.id);
  const canEdit = isOwner || trip?.collaborators?.some(member => String(member.userId) === String(user?.id) && member.permission === 'edit');

  useEffect(() => {
    let active = true;
    itineraryService.getById(id).then(data => {
      if (active) { setTrip(data); setDraft(createPlanDraft(data)); }
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Không thể tải kế hoạch.'); })
      .finally(() => { if (active) setLoading(false); });
    itineraryService.getPackingCatalog().then(data => { if (active) setCatalog(data); }).catch(() => {});
    friendService.getFriends().then(data => { if (active) setFriends(data); }).catch(() => {});
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const change = (key, value) => { setDirty(true); setDraft(previous => ({ ...previous, [key]: value })); };
  const updateRow = (list, index, key, value) => change(list, draft[list].map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const removeRow = (list, index) => change(list, draft[list].filter((_, rowIndex) => rowIndex !== index));
  const moveStop = (index, direction) => {
    const next = [...draft.items];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    change('items', next);
  };
  const addStop = location => change('items', [...draft.items, {
    key: newKey(), locationId: location?.id || null, customName: location ? '' : 'Hoạt động mới',
    displayName: location?.name || 'Hoạt động mới', day: 1, startTime: '', endTime: '', durationMinutes: '', travelMinutes: '', travelDistanceKm: '', note: ''
  }]);
  const addPacking = item => change('packingItems', [...draft.packingItems, {
    key: newKey(), itemName: item?.name || '', category: item?.category || 'other', quantity: item?.defaultQuantity || 1, notes: '', isPacked: false
  }]);
  const searchPlaces = async event => {
    event.preventDefault(); setSearching(true); setError('');
    try { const { data } = await apiClient.get('/locations', { params: { region: query, limit: 30 } }); setResults(Array.isArray(data) ? data : []); }
    catch { setError('Không thể tìm địa điểm. Vui lòng thử lại.'); }
    finally { setSearching(false); }
  };
  const addMember = () => {
    const friend = friends.find(item => String(item.id) === friendId);
    if (!friend && !memberEmail.trim()) return;
    const email = (friend?.email || memberEmail).trim().toLowerCase();
    if (draft.collaborators.some(member => member.email?.toLowerCase() === email) || email === user.email?.toLowerCase()) { setError('Thành viên này đã có trong kế hoạch.'); return; }
    change('collaborators', [...draft.collaborators, { userId: friend?.id, name: friend?.fullName || friend?.name, email, permission: 'view' }]);
    setMemberEmail(''); setFriendId('');
  };
  const cancel = () => { if (!saving && (!dirty || window.confirm('Bỏ các thay đổi chưa lưu?'))) (embedded ? onCancel?.() : navigate(`/trip/${id}`)); };
  const save = async () => {
    setError('');
    if (!draft.name.trim()) { setError('Hãy đặt tên cho kế hoạch.'); setTab('general'); return; }
    if (draft.startDate && draft.endDate && new Date(draft.endDate) < new Date(draft.startDate)) { setError('Ngày kết thúc phải sau ngày bắt đầu.'); setTab('general'); return; }
    setSaving(true);
    try {
      const updated = await itineraryService.savePlan(id, planPayload(draft, trip, isOwner));
      addTrip(updated); setDirty(false); if (embedded) onSaved?.(updated); else navigate(`/trip/${id}`, { replace: true });
    } catch (err) { setError(err.response?.data?.message || 'Chưa lưu được thay đổi. Dữ liệu bạn đang nhập vẫn được giữ.'); }
    finally { setSaving(false); }
  };
  if (loading) return <EditorFrame embedded={embedded}><div className={embedded ? "plan-editor plan-editor-embedded" : "plan-editor"}><Loader2 className="animate-spin" /> Đang tải kế hoạch…</div></EditorFrame>;
  if (!draft || !canEdit) return <EditorFrame embedded={embedded}><div className={embedded ? "plan-editor plan-editor-embedded" : "plan-editor"}><p role="alert">{error || 'Bạn chỉ có quyền xem kế hoạch này.'}</p><Link to={`/trip/${id}`}>Quay lại kế hoạch</Link></div></EditorFrame>;
  const total = COSTS.reduce((sum, [key]) => sum + Number(draft[key] || 0), 0) * (draft.costScope === 'PERSON' ? Number(draft.travelerCount || 1) : 1);
  const input = (key, type = 'text', props = {}) => <input type={type} value={draft[key] ?? ''} onChange={event => change(key, event.target.value)} {...props} />;

  return <EditorFrame embedded={embedded}><div className={embedded ? "plan-editor plan-editor-embedded" : "plan-editor"}>
    {embedded ? <header className="plan-edit-inline-heading"><h3>Sửa thông tin kế hoạch</h3><p>{dirty ? 'Có thay đổi chưa lưu' : 'Mở từng mục bên dưới để điều chỉnh kế hoạch.'}</p></header> : <>    <header className="plan-edit-heading"><button className="btn btn-outline" type="button" onClick={cancel}><ArrowLeft size={16} /> Quay lại</button><div><h1>Chỉnh sửa kế hoạch</h1><p>{draft.name} · {dirty ? 'Có thay đổi chưa lưu' : 'Mọi thay đổi được lưu cùng lúc'}</p></div></header>
    <nav className="plan-edit-tabs" aria-label="Các phần chỉnh sửa">{TABS.map(([key, label]) => <button type="button" key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}{key === 'schedule' ? ` (${draft.items.length})` : key === 'packing' ? ` (${draft.packingItems.length})` : ''}</button>)}</nav>
</>}
    {error && <p className="plan-edit-error" role="alert">{error}</p>}
    <fieldset className="plan-edit-panel" disabled={saving}>
      <EditorSection embedded={embedded} title="Thông tin" visible={tab === 'general'}><h2>Hành trình theo cách của bạn</h2><div className="plan-edit-grid">
        <Field label="Tên kế hoạch">{input('name', 'text', { maxLength: 200 })}</Field>
        <Field label="Điểm đến">{input('destination', 'text', { maxLength: 200 })}</Field>
        <Field label="Điểm khởi hành">{input('startLocation')}</Field><Field label="Điểm kết thúc">{input('endLocation')}</Field>
        <Field label="Ngày, giờ bắt đầu">{input('startDate', 'datetime-local')}</Field><Field label="Ngày, giờ kết thúc">{input('endDate', 'datetime-local')}</Field>
        <Field label="Số ngày (khi chưa đặt ngày đi/về)">{input('totalDays', 'number', { min: 1, max: 365 })}</Field>
        <Field label="Số người tính chi phí">{input('travelerCount', 'number', { min: 1, max: 10000 })}</Field>
        <Field label="Phương tiện (có thể tự nhập)">{input('transportMode', 'text', { list: 'plan-transport' })}<datalist id="plan-transport"><option value="flight">Máy bay</option><option value="train">Tàu hỏa</option><option value="car">Ô tô</option><option value="motorbike">Xe máy</option><option value="coach">Xe khách</option><option value="walk">Đi bộ</option></datalist></Field>
        <Field label="Trạng thái"><select value={draft.status} onChange={event => change('status', event.target.value)}><option value="draft">Đang lên kế hoạch</option><option value="generated">Sẵn sàng khởi hành</option><option value="completed">Đã hoàn thành</option><option value="cancelled">Đã hủy</option></select></Field>
        <Field label="Sở thích (phân cách bằng dấu phẩy)">{input('preferences')}</Field>
      </div><Field label="Ghi chú riêng cho chuyến đi"><textarea rows={4} value={draft.description} onChange={event => change('description', event.target.value)} /></Field></EditorSection>
      <EditorSection embedded={embedded} title="Lịch trình" visible={tab === 'schedule'}><h2>Tự sắp xếp từng điểm dừng</h2><p className="plan-edit-help">Thêm địa điểm có sẵn hoặc hoạt động riêng, sửa ngày giờ và đổi thứ tự. Điểm mới chưa có giờ sẽ để trống.</p>
        <form className="plan-edit-search" onSubmit={searchPlaces}><input aria-label="Tìm địa điểm" placeholder="Tìm tên địa điểm hoặc thành phố" value={query} onChange={event => setQuery(event.target.value)} /><button className="btn btn-outline" disabled={searching || !query.trim()}>{searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Tìm địa điểm</button></form>
        {results.length > 0 && <div className="plan-edit-results">{results.map(place => <button type="button" key={place.id} onClick={() => addStop(place)}><Plus size={14} /> {place.name}</button>)}</div>}
        <button type="button" className="btn btn-outline" onClick={() => addStop(null)}><Plus size={16} /> Thêm hoạt động riêng</button>
        {!draft.items.length && <p>Chưa có điểm dừng. Thêm địa điểm hoặc hoạt động đầu tiên.</p>}
        {draft.items.map((item, index) => <section key={item.key} className="plan-edit-row"><div className="plan-edit-row-heading"><h3>{index + 1}. {item.customName || item.displayName}</h3><div><button type="button" aria-label="Đưa điểm dừng lên" disabled={index === 0} onClick={() => moveStop(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label="Đưa điểm dừng xuống" disabled={index === draft.items.length - 1} onClick={() => moveStop(index, 1)}><ArrowDown size={16} /></button><button type="button" aria-label="Xóa điểm dừng" onClick={() => removeRow('items', index)}><Trash2 size={16} /></button></div></div>
          <div className="plan-edit-grid"><Field label="Tên riêng cho điểm dừng"><input value={item.customName} placeholder={item.displayName} maxLength={255} onChange={event => updateRow('items', index, 'customName', event.target.value)} /></Field><Field label="Ngày thứ"><input type="number" min={1} max={365} value={item.day} onChange={event => updateRow('items', index, 'day', event.target.value)} /></Field>
          <Field label="Bắt đầu"><input type="datetime-local" value={item.startTime} onChange={event => updateRow('items', index, 'startTime', event.target.value)} /></Field><Field label="Kết thúc"><input type="datetime-local" value={item.endTime} onChange={event => updateRow('items', index, 'endTime', event.target.value)} /></Field>
          <Field label="Thời lượng (phút)"><input type="number" min={0} value={item.durationMinutes} onChange={event => updateRow('items', index, 'durationMinutes', event.target.value)} /></Field><Field label="Di chuyển tới điểm tiếp theo (phút)"><input type="number" min={0} value={item.travelMinutes} onChange={event => updateRow('items', index, 'travelMinutes', event.target.value)} /></Field>
          <Field label="Khoảng cách tới điểm tiếp theo (km)"><input type="number" min={0} step="0.01" value={item.travelDistanceKm} onChange={event => updateRow('items', index, 'travelDistanceKm', event.target.value)} /></Field></div>
          <Field label="Ghi chú hoạt động"><textarea maxLength={470} rows={2} value={item.note} onChange={event => updateRow('items', index, 'note', event.target.value)} /></Field>
        </section>)}
      </EditorSection>
      <EditorSection embedded={embedded} title="Chi phí" visible={tab === 'costs'}><h2>Ngân sách do bạn quyết định</h2><div className="plan-edit-grid"><Field label="Ngân sách mục tiêu (VNĐ)">{input('budget', 'number', { min: 0 })}</Field><Field label="Các khoản dưới đây tính cho"><select value={draft.costScope} onChange={event => change('costScope', event.target.value)}><option value="PERSON">Một người</option><option value="GROUP">Cả nhóm</option></select></Field>{COSTS.map(([key, label]) => <Field key={key} label={`${label} (VNĐ)`}>{input(key, 'number', { min: 0 })}</Field>)}</div><div className="plan-edit-estimate"><span>Dự toán cả nhóm ({draft.travelerCount} người)</span><strong>{total.toLocaleString('vi-VN')} đ</strong>{Number(draft.budget) > 0 && total > Number(draft.budget) && <p>Vượt ngân sách {(total - Number(draft.budget)).toLocaleString('vi-VN')} đ. Bạn vẫn có thể lưu.</p>}</div></EditorSection>
      <EditorSection embedded={embedded} title="Đồ mang theo" visible={tab === 'packing'}><h2>Mang những gì bạn cần</h2><div className="plan-edit-search"><select aria-label="Thêm vật dụng từ danh mục" defaultValue="" onChange={event => { const item = catalog.find(value => String(value.id) === event.target.value); if (item) addPacking(item); event.target.value = ''; }}><option value="">Chọn từ danh mục vật dụng…</option>{catalog.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button type="button" className="btn btn-outline" onClick={() => addPacking(null)}><Plus size={16} /> Thêm đồ riêng</button></div>
        {!draft.packingItems.length && <p>Danh sách đang trống. Thêm đồ riêng hoặc chọn từ danh mục.</p>}
        {draft.packingItems.map((item, index) => <section key={item.key} className="plan-edit-row"><div className="plan-edit-row-heading"><label className="plan-edit-check"><input type="checkbox" checked={item.isPacked} onChange={event => updateRow('packingItems', index, 'isPacked', event.target.checked)} /> Đã chuẩn bị</label><button type="button" aria-label="Xóa vật dụng" onClick={() => removeRow('packingItems', index)}><Trash2 size={16} /></button></div><div className="plan-edit-grid"><Field label="Tên vật dụng"><input maxLength={200} value={item.itemName} onChange={event => updateRow('packingItems', index, 'itemName', event.target.value)} /></Field><Field label="Số lượng"><input type="number" min={1} max={10000} value={item.quantity} onChange={event => updateRow('packingItems', index, 'quantity', event.target.value)} /></Field><Field label="Nhóm (có thể tự nhập)"><input maxLength={100} value={item.category} onChange={event => updateRow('packingItems', index, 'category', event.target.value)} /></Field><Field label="Ghi chú"><input maxLength={500} value={item.notes} onChange={event => updateRow('packingItems', index, 'notes', event.target.value)} /></Field></div></section>)}
      </EditorSection>
      <EditorSection embedded={embedded} title="Thành viên" visible={tab === 'members'}><h2>Cùng lên kế hoạch</h2><p className="plan-edit-help">{isOwner ? 'Bạn là chủ kế hoạch. Thêm, gỡ thành viên và chọn quyền cho từng người.' : 'Chỉ chủ kế hoạch được quản lý thành viên và chế độ chia sẻ.'}</p><p>{trip.owner?.name || (isOwner ? user.fullName : 'Chủ kế hoạch')} — Chủ kế hoạch</p>
        {isOwner && <><div className="plan-edit-grid"><Field label="Thêm từ bạn bè"><select value={friendId} onChange={event => setFriendId(event.target.value)}><option value="">Chọn bạn bè…</option>{friends.filter(friend => !draft.collaborators.some(member => String(member.userId) === String(friend.id))).map(friend => <option key={friend.id} value={friend.id}>{friend.fullName || friend.name}</option>)}</select></Field><Field label="Hoặc email tài khoản"><input type="email" value={memberEmail} onChange={event => setMemberEmail(event.target.value)} disabled={!!friendId} /></Field></div><button type="button" className="btn btn-outline" disabled={!friendId && !memberEmail.trim()} onClick={addMember}><Plus size={16} /> Thêm vào danh sách</button></>}
        {draft.collaborators.map((member, index) => <div className="plan-edit-member" key={member.userId || member.email}><span>{member.name || member.email}<small>{member.email}</small></span><select aria-label={`Quyền của ${member.name || member.email}`} disabled={!isOwner} value={member.permission} onChange={event => updateRow('collaborators', index, 'permission', event.target.value)}><option value="view">Chỉ xem</option><option value="edit">Chỉnh sửa kế hoạch</option></select>{isOwner && <button type="button" aria-label="Gỡ thành viên" onClick={() => removeRow('collaborators', index)}><Trash2 size={16} /></button>}</div>)}
        {isOwner && <Field label="Chia sẻ kế hoạch"><select value={draft.visibility} onChange={event => change('visibility', event.target.value)}><option value="private">Riêng tư / thành viên đã mời</option><option value="shared">Chia sẻ với nhóm</option><option value="public_view">Ai có liên kết đều được xem</option><option value="public_edit">Ai có liên kết và đăng nhập được sửa</option></select></Field>}
      </EditorSection>
    </fieldset>
    <footer className="plan-edit-savebar"><span>{dirty ? 'Thay đổi chưa được lưu' : <><Check size={16} /> Chưa có thay đổi</>}</span><div><button type="button" className="btn btn-outline" onClick={cancel} disabled={saving}>Hủy chỉnh sửa</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving || !dirty}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu toàn bộ thay đổi</button></div></footer>
  </div></EditorFrame>;
}
