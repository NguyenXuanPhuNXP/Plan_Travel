import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import './FriendModal.css';

export default function PackingDraftPicker({ catalog, selected, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const names = new Set(selected.map(item => item.itemName?.toLowerCase()));
  const submit = event => {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd({ itemName: name.trim(), quantity: Math.max(1, Number(quantity) || 1), category: 'other' });
    setName(''); setQuantity(1);
  };
  return <div className="friend-modal-overlay" onClick={onClose}><div className="friend-modal-card" role="dialog" aria-modal="true" aria-label="Thêm đồ mang theo" onClick={event => event.stopPropagation()}>
    <div className="friend-modal-header"><h2 className="friend-modal-title">Thêm đồ mang theo</h2><button type="button" className="friend-modal-close" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>
    <div className="friend-modal-body">
      <p className="trip-details-timeline-subtitle">Đồ được thêm vào bản nháp. Bấm lưu kế hoạch để giữ thay đổi.</p>
      <form onSubmit={submit} className="trip-draft-packing-form"><input aria-label="Tên đồ riêng" placeholder="Tên đồ dùng riêng…" value={name} onChange={event => setName(event.target.value)} maxLength={200} required /><input aria-label="Số lượng đồ riêng" type="number" min={1} max={10000} value={quantity} onChange={event => setQuantity(event.target.value)} required /><button className="btn btn-primary" type="submit"><Plus size={16} /> Thêm</button></form>
      <input className="friend-search-input" aria-label="Tìm đồ trong danh mục" placeholder="Tìm vật dụng trong danh mục…" value={search} onChange={event => setSearch(event.target.value)} />
      <div className="trip-draft-packing-catalog">{catalog.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase())).map(item => <div className="friend-item" key={item.id}><span>{item.name}</span><button type="button" className="btn btn-outline" disabled={names.has(item.name.toLowerCase())} onClick={() => onAdd(item)}>{names.has(item.name.toLowerCase()) ? 'Đã thêm' : 'Thêm'}</button></div>)}</div>
    </div>
  </div></div>;
}
