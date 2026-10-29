const calendarDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function aiTripDates(startDate, endDate, days, now = new Date()) {
  const start = startDate || calendarDate(now);
  if (!Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 30) throw new Error('Kế hoạch AI hỗ trợ từ 1 đến 30 ngày.');
  const first = new Date(`${start}T00:00:00`);
  if (Number.isNaN(first.getTime())) throw new Error('Ngày khởi hành không hợp lệ.');
  const last = endDate ? new Date(`${endDate}T00:00:00`) : new Date(first);
  if (!endDate) last.setDate(last.getDate() + Number(days) - 1);
  if (Number.isNaN(last.getTime()) || last < first) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
  return { startDate: start, endDate: calendarDate(last) };
}

export function aiPlanItems(plan, startDate) {
  return (plan?.days || []).flatMap((day, index) => (day.items || []).map(item => {
    const dayNumber = Number(day.dayNumber || index + 1);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 30) throw new Error('Ngày trong lịch trình AI không hợp lệ.');
    const clock = value => {
      if (!value) return null;
      const match = String(value).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error('Giờ trong lịch trình không hợp lệ. Hãy kiểm tra trước khi lưu.');
      const date = new Date(`${startDate}T00:00:00`);
      date.setDate(date.getDate() + dayNumber - 1);
      date.setHours(Number(match[1]), Number(match[2]), 0, 0);
      return date;
    };
    const start = clock(item.startTime), end = clock(item.endTime);
    if (start && end && end < start) end.setDate(end.getDate() + 1);
    const candidateId = item.locationId || item.location?.id;
    return {
      locationId: /^\d+$/.test(String(candidateId)) ? String(candidateId) : null,
      customName: item.customName || item.locationName || item.location?.name || item.name || null,
      startTime: start?.toISOString() || null, endTime: end?.toISOString() || null,
      durationMinutes: item.durationMinutes ?? (start && end ? Math.round((end - start) / 60000) : null),
      travelMinutes: item.travelMinutesToNext ?? item.travelMinutes ?? null,
      travelDistanceKm: item.travelDistanceKm ?? null,
      note: `[DAY:${dayNumber}] ${String(item.note || '').replace(/\[DAY:\d+\]\s*/g, '')}`.trim().slice(0, 500)
    };
  })).filter(item => item.locationId || item.customName);
}
