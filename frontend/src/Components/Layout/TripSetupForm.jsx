import { MapPin, CalendarDays, Users, Tag, Plane, Bus, TrainFront, Bike, Car, Footprints, Waves, Mountain, Utensils, Landmark, Trees, ShoppingBag, Moon, Tent, Armchair, Camera, Check } from 'lucide-react';
import './TripSetupForm.css';

const TRANSPORT = [['flight', 'Máy bay', Plane], ['coach', 'Xe khách', Bus], ['train', 'Tàu hỏa', TrainFront], ['motorbike', 'Xe máy', Bike], ['car', 'Ô tô', Car], ['other', 'Đi bộ / Khác', Footprints]];
const PREFERENCES = [['beach', 'Biển', Waves], ['mountain', 'Núi rừng', Mountain], ['food', 'Ẩm thực', Utensils], ['culture', 'Văn hóa', Landmark], ['nature', 'Thiên nhiên', Trees], ['shopping', 'Mua sắm', ShoppingBag], ['nightlife', 'Về đêm', Moon], ['adventure', 'Mạo hiểm', Tent], ['relax', 'Nghỉ dưỡng', Armchair], ['photography', 'Chụp ảnh', Camera]];

export default function TripSetupForm({ info, onChange, friends = [], selectedFriendIds = [], onFriendsChange }) {
  const change = (key, value) => onChange({ ...info, [key]: value });
  const toggleFriend = id => {
    const next = selectedFriendIds.includes(id) ? selectedFriendIds.filter(value => value !== id) : [...selectedFriendIds, id];
    onFriendsChange(next);
    change('travelerCount', Math.max(Number(info.travelerCount) || 1, next.length + 1));
  };
  return <div className="trip-setup-form">
    <label className="trip-setup-field"><span><MapPin size={17} /> Địa điểm muốn đi</span><input required maxLength={200} autoComplete="off" placeholder="Ví dụ: Đà Nẵng, Hội An…" value={info.destination} onChange={event => change('destination', event.target.value)} /></label>
    <div className="trip-setup-row">
      <label className="trip-setup-field"><span><CalendarDays size={17} /> Ngày xuất phát</span><input required type="date" value={info.startDate} onChange={event => change('startDate', event.target.value)} /></label>
      <label className="trip-setup-field"><span><CalendarDays size={17} /> Ngày kết thúc</span><input required type="date" min={info.startDate || undefined} value={info.endDate} onChange={event => change('endDate', event.target.value)} /></label>
    </div>
    <section className="trip-setup-companions"><h3><Users size={17} /> Bạn cùng lập kế hoạch</h3><p>Bạn có thể mời thêm người và lập ngân sách chung sau.</p>
      {friends.length ? <div className="trip-setup-choices">{friends.map(friend => { const id = String(friend.id); const selected = selectedFriendIds.includes(id); return <button type="button" key={id} aria-pressed={selected} onClick={() => toggleFriend(id)}><Users size={16} />{friend.fullName || friend.name || friend.email}{selected && <Check size={15} />}</button>; })}</div> : <p className="text-muted">Chưa có bạn bè để mời. Bạn vẫn có thể bắt đầu một mình.</p>}
    </section>
    <details className="trip-setup-more"><summary>Tên chuyến đi, phương tiện & sở thích</summary>
      <div className="trip-setup-row"><label className="trip-setup-field"><span><Tag size={17} /> Tên chuyến đi (tùy chọn)</span><input maxLength={200} value={info.name} placeholder={`Chuyến đi ${info.destination || 'của bạn'}`} onChange={event => change('name', event.target.value)} /></label>
      <label className="trip-setup-field"><span><Users size={17} /> Tổng số người đi</span><input type="number" min={selectedFriendIds.length + 1} max={10000} value={info.travelerCount} onChange={event => change('travelerCount', event.target.value)} /></label></div>
      <fieldset><legend>Phương tiện</legend><div className="trip-setup-choices">{TRANSPORT.map(([value, label, Icon]) => <button type="button" key={value} aria-pressed={info.transportMode === value} onClick={() => change('transportMode', value)}><Icon size={17} />{label}</button>)}</div></fieldset>
      <fieldset><legend>Sở thích</legend><div className="trip-setup-choices">{PREFERENCES.map(([value, label, Icon]) => <button type="button" key={value} aria-pressed={info.preferences.includes(value)} onClick={() => change('preferences', info.preferences.includes(value) ? info.preferences.filter(item => item !== value) : [...info.preferences, value])}><Icon size={17} />{label}</button>)}</div></fieldset>
    </details>
  </div>;
}
