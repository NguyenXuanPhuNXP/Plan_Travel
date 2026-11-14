import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

export default function TripStopFields({ item, startDate, onChange, onRemove, onMove }) {
  const currentDate = item.startTime?.slice(0, 10) || (startDate ? (() => {
    const date = new Date(startDate); date.setDate(date.getDate() + Number(item.day || 1) - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })() : '');
  const clock = item.startTime?.includes('T') ? item.startTime.split('T')[1].slice(0, 5) : '';
  const changeDay = value => {
    const update = { day: value };
    if (startDate && item.startTime) {
      const date = new Date(startDate); date.setDate(date.getDate() + Math.max(1, Number(value) || 1) - 1);
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      update.startTime = `${day}T${clock || '08:00'}`;
      if (item.endTime) update.endTime = `${day}T${item.endTime.split('T')[1]}`;
    }
    onChange(update);
  };
  return <div className="trip-stop-fields" onClick={event => event.stopPropagation()}>
    <div className="trip-stop-inputs">
      <label>Ngày thứ<input aria-label="Ngày của điểm dừng" type="number" min={1} max={365} value={item.day || 1} onChange={event => changeDay(event.target.value)} /></label>
      {!currentDate && <label>Ngày hoạt động<input aria-label="Ngày hoạt động" type="date" onChange={event => onChange({ startTime: event.target.value ? `${event.target.value}T08:00` : '' })} /></label>}
      <label>Bắt đầu<input aria-label="Giờ bắt đầu" type="time" disabled={!currentDate} value={clock} onChange={event => onChange({ startTime: event.target.value ? `${currentDate}T${event.target.value}` : '' })} /></label>
      <label>Thời lượng (phút)<input aria-label="Thời lượng hoạt động" type="number" min={0} value={item.durationMinutes ?? ''} onChange={event => onChange({ durationMinutes: event.target.value })} /></label>
      <label>Di chuyển (phút)<input aria-label="Thời gian di chuyển" type="number" min={0} value={item.travelMinutes ?? ''} onChange={event => onChange({ travelMinutes: event.target.value })} /></label>
      <label>Kết thúc (tùy chọn)<input aria-label="Thời điểm kết thúc" type="datetime-local" value={item.endTime || ''} onChange={event => onChange({ endTime: event.target.value })} /></label>
    </div>
    <input className="trip-stop-note" aria-label="Ghi chú điểm dừng" placeholder="Ghi chú cho hoạt động…" value={item.note || ''} maxLength={470} onChange={event => onChange({ note: event.target.value })} />
    <div className="trip-stop-actions"><button type="button" className="btn btn-outline" onClick={() => onMove(-1)}><ArrowUp size={14} /> Lên</button><button type="button" className="btn btn-outline" onClick={() => onMove(1)}><ArrowDown size={14} /> Xuống</button><button type="button" className="btn btn-outline" onClick={onRemove}><Trash2 size={14} /> Xóa điểm</button></div>
  </div>;
}
