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
    const departureTime = body.departureTime == null || body.departureTime === '' ? '08:00' : String(body.departureTime);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) invalid('Giờ khởi hành phải có định dạng HH:mm.');
    const maxStopsPerDay = body.maxStopsPerDay == null || body.maxStopsPerDay === '' || body.maxStopsPerDay === 'auto'
        ? 8 : Number(body.maxStopsPerDay);
    if (!Number.isInteger(maxStopsPerDay) || maxStopsPerDay < 1 || maxStopsPerDay > 8) invalid('Số địa điểm tối đa mỗi ngày phải từ 1 đến 8.');
    const startLocation = normalizeStartLocation(body.startLocation, invalid);
    const startDate = body.startDate || null;
    const endDate = body.endDate || null;
    for (const date of [startDate, endDate]) {
        if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) invalid('Ngày đi không hợp lệ.');
    }
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (startDate && startDate < todayIso) invalid('Ngày xuất phát không thể trước ngày hiện tại.');
    if (startDate && endDate && startDate > endDate) invalid('Ngày kết thúc phải sau ngày bắt đầu.');
    const transportMode = body.transportMode || 'other';
    if (!['auto', 'flight', 'coach', 'train', 'motorbike', 'car', 'other'].includes(transportMode)) invalid('Phương tiện không hợp lệ.');
    return { region, days, budget, preferences, selectedLocationIds: [...new Set(selectedLocationIds.map(String))], focusLocationId, travelerCount, departureTime, maxStopsPerDay, startLocation, startDate, endDate, transportMode };
}

function normalizeStartLocation(value, invalid) {
    if (value == null || value === '') return null;
    if (typeof value !== 'object' || Array.isArray(value)) invalid('Vị trí khởi hành không hợp lệ.');
    const rawLatitude = value.latitude ?? value.lat;
    const rawLongitude = value.longitude ?? value.lng;
    if (rawLatitude == null || rawLatitude === '' || rawLongitude == null || rawLongitude === '') invalid('Tọa độ vị trí khởi hành không hợp lệ.');
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        invalid('Tọa độ vị trí khởi hành không hợp lệ.');
    }
    const name = String(value.name ?? value.address ?? '').trim();
    if (name.length > 255) invalid('Tên vị trí khởi hành quá dài.');
    return { name, address: String(value.address ?? name).trim().slice(0, 255), latitude, longitude };
}
