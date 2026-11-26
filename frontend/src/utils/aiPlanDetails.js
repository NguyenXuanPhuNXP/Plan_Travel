export const COST_LABELS = { transport: 'Di chuyển', accommodation: 'Lưu trú', meals: 'Ăn uống', attractions: 'Tham quan, hoạt động', contingency: 'Dự phòng' };

export function getPlanDayWarnings(day, { maxStopsPerDay = 8, dayEnd = '21:30' } = {}) {
  const warnings = [];
  const items = Array.isArray(day?.items) ? day.items : [];
  const activities = items.filter(item => !isAccommodation(item));
  const limit = Math.min(8, Math.max(1, Number(maxStopsPerDay) || 8));
  if (activities.length > limit) warnings.push(`Có ${activities.length} điểm hoạt động, vượt giới hạn ${limit} điểm/ngày.`);

  let previous = null;
  for (const item of items) {
    if (isAccommodation(item)) { previous = null; continue; }
    const start = parseClock(item.startTime);
    const end = parseClock(item.endTime);
    const name = item.locationName || item.location?.name || item.customName || 'Điểm dừng';
    if (start == null || end == null) { previous = null; continue; }
    if (end <= start) warnings.push(`${name}: giờ kết thúc phải sau giờ bắt đầu.`);
    if (end > parseClock(dayEnd)) warnings.push(`${name}: kết thúc sau ${dayEnd}, vượt khung giờ trong ngày.`);
    if (previous) {
      const previousName = previous.item.locationName || previous.item.location?.name || previous.item.customName || 'Điểm trước';
      if (start < previous.end) warnings.push(`${previousName} và ${name}: thời gian hoạt động bị chồng lấn.`);
      else {
        const travelMinutes = Number(previous.item.travelMinutesToNext ?? previous.item.travelMinutes);
        if (Number.isFinite(travelMinutes) && travelMinutes > 0 && start < previous.end + travelMinutes) {
          warnings.push(`${previousName} → ${name}: khoảng trống chưa đủ ${travelMinutes} phút di chuyển.`);
        }
      }
    }
    previous = { item, end };
  }
  return [...new Set(warnings)];
}

function parseClock(value) {
  const match = String(value || '').match(/(?:^|T)(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
}

function isAccommodation(item) {
  return item?.isAccommodation === true || /khách sạn|khach san|hotel|hostel|resort|homestay|guest.?house|accommodation|nhà nghỉ|nha nghi|lưu trú|luu tru/i.test(`${item?.locationName || ''} ${item?.location?.name || ''} ${item?.location?.category || ''} ${item?.category || ''}`);
}

export function aiPlanCosts(plan) {
  if (!plan?.costAllocation) return {};
  const costs = Object.fromEntries(Object.keys(COST_LABELS).map(key => [key, plan.costAllocation[key] == null ? null : Math.max(0, Math.round(Number(plan.costAllocation[key]) || 0))]));
  const unknown = Object.values(costs).some(value => value == null);
  return { costTransport: costs.transport, costAccommodation: costs.accommodation, costMeals: costs.meals, costAttractions: costs.attractions, costContingency: costs.contingency, totalCost: unknown ? null : Object.values(costs).reduce((a, b) => a + b, 0) };
}

export function aiPlanDescription(plan) {
  return [plan?.description, plan?.transport && `Phương tiện: ${plan.transport}`, plan?.accommodation && `Lưu trú: ${plan.accommodation}`,
    plan?.costAllocation && `Chi phí ước tính cho cả nhóm (VNĐ): ${Object.entries(COST_LABELS).map(([key, label]) => `${label}: ${plan.costAllocation[key] == null ? 'chưa có dữ liệu' : Number(plan.costAllocation[key]).toLocaleString('vi-VN')}`).join('; ')}`,
    plan?.costBreakdown?.length && `Chi tiết cách tính chi phí: ${plan.costBreakdown.map(line => `${line.description}: ${line.totalCost == null ? 'chưa xác định' : Number(line.totalCost).toLocaleString('vi-VN') + ' VNĐ'}`).join('; ')}`,
    plan?.weather && `Thời tiết: ${plan.weather}`,
    plan?.risks?.length && `Rủi ro và cách xử lý:\n${plan.risks.join('\n')}`].filter(Boolean).join('\n\n');
}
