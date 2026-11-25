import { useState } from 'react';
import { Plane, BedDouble, Car, TrainFront, Utensils, Wine, Landmark, Ticket, ShoppingBag, Fuel, ShoppingCart, ReceiptText, ChevronRight, MapPin } from 'lucide-react';
import PlanDialog from './PlanDialog';
import { EXPENSE_CATEGORIES } from '../../utils/tripExpenses';

const ICONS = [Plane, BedDouble, Car, TrainFront, Utensils, Wine, Landmark, Ticket, ShoppingBag, Fuel, ShoppingCart, ReceiptText];

export default function ExpenseDialog({ expense, participants, currentUserId, stops = [], onSave, onClose }) {
  const [form, setForm] = useState(expense || { id: crypto.randomUUID(), amount: '', title: '', category: '', payerId: currentUserId || participants[0]?.id || '', splitWith: [], date: '' });
  const [choosing, setChoosing] = useState(false);
  const [sharing, setSharing] = useState(expense?.splitWith.length ? 'custom' : 'none');
  const [error, setError] = useState('');
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = event => {
    event.preventDefault();
    if (!Number.isSafeInteger(Number(form.amount)) || Number(form.amount) <= 0 || Number(form.amount) > 999999999999) { setError('Nhập số tiền nguyên dương bằng VNĐ.'); return; }
    if (!form.category || !form.title.trim()) { setError('Hãy chọn mục hoặc danh mục cho khoản chi.'); return; }
    const splitWith = sharing === 'group' ? participants.map(member => member.id) : sharing === 'custom' ? form.splitWith : [];
    if (sharing !== 'none' && !splitWith.length) { setError('Hãy chọn ít nhất một người cùng chia.'); return; }
    onSave({ ...form, title: form.title.trim(), amount: Number(form.amount), payerId: form.payerId || null, splitWith });
  };
  return <PlanDialog title={choosing ? 'Chọn mục' : expense ? 'Sửa chi phí' : 'Thêm chi phí'} onClose={onClose} onBack={choosing ? () => setChoosing(false) : undefined}>
    {choosing ? <div className="expense-picker"><h3>Chọn từ kế hoạch chuyến đi</h3>{stops.length ? <div className="expense-stop-list">{stops.map((stop, index) => { const name = stop.customName || stop.location?.name || stop.displayName; return name ? <button type="button" key={stop.id || stop.key || index} onClick={() => { setForm(previous => ({ ...previous, title: name, category: 'activities' })); setChoosing(false); }}><MapPin size={17} />{name}</button> : null; })}</div> : <p>Bạn chưa thêm bất kỳ địa điểm nào</p>}
      <hr /><h3>Hoặc chọn từ một danh mục</h3><div className="expense-category-grid">{EXPENSE_CATEGORIES.map(([value, label], index) => { const Icon = ICONS[index]; return <button type="button" key={value} onClick={() => { setForm(previous => ({ ...previous, category: value, title: label })); setChoosing(false); }}><Icon size={22} /><span>{label}</span></button>; })}</div>
    </div> : <form onSubmit={submit}>
      <label className="expense-amount"><span>₫</span><input autoFocus aria-label="Số tiền chi phí" type="number" min={1} max={999999999999} step={1} required placeholder="0" value={form.amount} onChange={event => change('amount', event.target.value)} /></label>
      <button type="button" className="expense-dialog-row" onClick={() => setChoosing(true)}><ReceiptText size={20} /><span>{form.category ? EXPENSE_CATEGORIES.find(([key]) => key === form.category)?.[1] : 'Chọn mục'}</span><ChevronRight size={20} /></button>
      {form.category && <label className="expense-title">Tên khoản chi<input aria-label="Tên khoản chi" required maxLength={255} value={form.title} onChange={event => change('title', event.target.value)} /></label>}
      <label className="expense-dialog-row"><strong>Người trả</strong><select aria-label="Người trả" required value={form.payerId || ''} onChange={event => change('payerId', event.target.value)}><option value="" disabled>Chọn người trả</option>{participants.map(member => <option key={member.id} value={member.id}>{member.id === currentUserId ? `Bạn (${member.name})` : member.name}</option>)}</select></label>
      <label className="expense-dialog-row"><strong>Chia sẻ</strong><select aria-label="Chia sẻ chi phí" value={sharing} onChange={event => setSharing(event.target.value)}><option value="none">Không chia sẻ</option><option value="group">Chia đều cả nhóm</option><option value="custom">Chọn người cùng chia</option></select></label>
      {sharing === 'custom' && <div className="expense-share-members">{participants.map(member => <label key={member.id}><input type="checkbox" checked={form.splitWith.includes(member.id)} onChange={event => change('splitWith', event.target.checked ? [...form.splitWith, member.id] : form.splitWith.filter(id => id !== member.id))} />{member.name}</label>)}</div>}
      <label className="expense-date">Ngày <span>(tùy chọn)</span><input aria-label="Ngày chi phí" type="date" value={form.date} onChange={event => change('date', event.target.value)} /></label>
      {error && <p role="alert" className="plan-dialog-error">{error}</p>}
      <footer><button type="submit" className="btn btn-primary">Lưu</button></footer><p className="expense-draft-hint">Khoản chi được thêm vào bản nháp. Lưu kế hoạch để giữ thay đổi.</p>
    </form>}
  </PlanDialog>;
}
