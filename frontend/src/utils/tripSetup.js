import { differenceInCalendarDays, parseISO } from 'date-fns';

export function tripSetupPayload(info, collaboratorIds = []) {
  if (!info.destination.trim()) throw new Error('Hãy nhập địa điểm muốn đi.');
  if (!info.startDate || !info.endDate) throw new Error('Hãy chọn ngày xuất phát và ngày kết thúc.');
  const start = parseISO(info.startDate);
  const end = parseISO(info.endDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;
  if (!Number.isFinite(totalDays) || totalDays < 1 || totalDays > 365) throw new Error('Ngày kết thúc phải từ ngày xuất phát, trong tối đa 365 ngày.');
  const travelerCount = Math.max(Number(info.travelerCount) || 1, collaboratorIds.length + 1);
  if (!Number.isInteger(travelerCount) || travelerCount > 10000) throw new Error('Số người đi phải là số nguyên từ 1 đến 10000.');
  return {
    ...info, name: info.name.trim() || `Chuyến đi ${info.destination.trim()}`,
    destination: info.destination.trim(), endLocation: info.destination.trim(),
    startDate: start.toISOString(), endDate: end.toISOString(), totalDays,
    travelerCount,
    collaboratorIds, status: 'draft', budget: 0, costScope: 'GROUP',
    costTransport: 0, costMeals: 0, costAttractions: 0, costAccommodation: 0, costContingency: 0,
    items: [], packingItems: []
  };
}
