import { MapPin } from 'lucide-react';

const date = value => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const clock = value => new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
const modes = { flight: 'Máy bay', coach: 'Xe khách', train: 'Tàu hỏa', motorbike: 'Xe máy', car: 'Ô tô', other: 'Đi bộ / Khác' };

export default function CommunityPlan({ plan }) {
  const days = new Map();
  if (plan.startDate) {
    const firstDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(plan.startDate));
    const count = Math.min(365, Math.max(1, Number(plan.totalDays) || 1));
    for (let index = 0; index < count; index++) {
      const day = new Date(`${firstDay}T00:00:00Z`);
      day.setUTCDate(day.getUTCDate() + index);
      days.set(day.toISOString().slice(0, 10), []);
    }
  }
  for (const item of plan.items || []) {
    const key = item.startTime ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(item.startTime)) : '';
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(item);
  }
  return <section className="community-plan">
    <h3>Kế hoạch đã trải nghiệm</h3><h4 className="community-plan-name">{plan.name || plan.title}</h4>
    <dl className="community-plan-meta">
      <div><dt>Điểm đến</dt><dd>{plan.destination || 'Chưa có điểm đến'}</dd></div>
      <div><dt>Thời gian</dt><dd>{plan.startDate ? date(plan.startDate) : 'Chưa chọn ngày'}{plan.endDate && ` – ${date(plan.endDate)}`}{plan.totalDays > 0 && ` · ${plan.totalDays} ngày`}</dd></div>
      <div><dt>Người đi & phương tiện</dt><dd>{plan.travelerCount || 1} người{plan.transportMode && ` · ${modes[plan.transportMode] || 'Theo kế hoạch'}`}</dd></div>
      {plan.budget != null && <div><dt>Ngân sách dự kiến cả chuyến</dt><dd>{Number(plan.budget).toLocaleString('vi-VN')} VNĐ</dd></div>}
    </dl>
    {!days.size && <p>Kế hoạch này chưa có điểm dừng.</p>}
    {[...days].sort(([a], [b]) => a ? b ? a.localeCompare(b) : -1 : 1).map(([day, items], index) => <div className="community-plan-day" key={day}>
      <h4>{day ? `Ngày ${index + 1} · ${date(`${day}T00:00:00+07:00`)}` : 'Các điểm chưa xếp ngày'}</h4>
      {!items.length && <p>Chưa có điểm dừng được lưu cho ngày này.</p>}
      <ol>{items.map((stop, index) => <li key={index}>
        <time>{stop.startTime ? clock(stop.startTime) : 'Chưa xếp giờ'}{stop.endTime && <span>– {clock(stop.endTime)}</span>}</time>
        <div><strong>{stop.name}</strong>{stop.address && <p>{stop.address}</p>}<div className="community-stop-meta">{stop.durationMinutes > 0 && <span>Tham quan {stop.durationMinutes} phút</span>}{stop.travelMinutes > 0 && <span>Di chuyển tiếp {stop.travelMinutes} phút</span>}</div>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.latitude != null && stop.longitude != null ? `${stop.latitude},${stop.longitude}` : [stop.name, stop.address, plan.destination, 'Việt Nam'].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer" aria-label={`Xem ${stop.name} trên bản đồ`}><MapPin size={15} aria-hidden="true" /> Xem bản đồ</a>
        </div>
      </li>)}</ol>
    </div>)}
  </section>;
}
