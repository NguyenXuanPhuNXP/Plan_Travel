export function parseAiPlannerInput(body = {}) {
    const invalid = message => { throw { status: 400, message }; };
    const region = String(body.region || '').trim();
    if (!region || region.length > 200) invalid('Địa điểm cần từ 1 đến 200 ký tự.');
    const days = body.days == null || body.days === '' ? 3 : Number(body.days);
    if (!Number.isInteger(days) || days < 1 || days > 30) invalid('Kế hoạch AI hỗ trợ từ 1 đến 30 ngày.');
    const budget = body.budget == null || body.budget === '' ? null : Number(body.budget);
    if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 999999999999)) invalid('Ngân sách không hợp lệ.');
    const preferences = body.preferences ?? [];
    if (!Array.isArray(preferences) || preferences.length > 30 || preferences.some(value => typeof value !== 'string' || value.length > 100)) invalid('Sở thích không hợp lệ.');
    const selectedLocationIds = body.selectedLocationIds ?? [];
    if (!Array.isArray(selectedLocationIds) || selectedLocationIds.length > 100 || selectedLocationIds.some(value => !/^\d+$/.test(String(value)))) invalid('Danh sách địa điểm không hợp lệ.');
    const focusLocationId = body.focusLocationId || null;
    if (focusLocationId && !/^\d+$/.test(String(focusLocationId))) invalid('Địa điểm ưu tiên không hợp lệ.');
    const travelerCount = Number(body.travelerCount ?? 1);
    if (!Number.isInteger(travelerCount) || travelerCount < 1 || travelerCount > 100) invalid('Số người phải từ 1 đến 100.');
    const startDate = body.startDate || null;
    const endDate = body.endDate || null;
    for (const date of [startDate, endDate]) {
        if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) invalid('Ngày đi không hợp lệ.');
    }
    if (startDate && endDate && startDate > endDate) invalid('Ngày kết thúc phải sau ngày bắt đầu.');
    const transportMode = body.transportMode || 'other';
    if (!['flight', 'coach', 'train', 'motorbike', 'car', 'other'].includes(transportMode)) invalid('Phương tiện không hợp lệ.');
    return { region, days, budget, preferences, selectedLocationIds: [...new Set(selectedLocationIds.map(String))], focusLocationId, travelerCount, startDate, endDate, transportMode };
}
