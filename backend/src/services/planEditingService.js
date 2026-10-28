import prisma from '../config/db.js';
import { getItineraryById } from './itineraryService.js';

const fail = message => { throw { status: 400, message }; };
const text = (value, limit, label, required = false) => {
    const result = String(value ?? '').trim();
    if ((required && !result) || result.length > limit) fail(`${label} không hợp lệ (tối đa ${limit} ký tự).`);
    return result || null;
};
const number = (value, label, max = 999999999999, integer = false) => {
    const result = Number(value || 0);
    if (!Number.isFinite(result) || result < 0 || result > max || (integer && !Number.isInteger(result))) fail(`${label} không hợp lệ.`);
    return result;
};
const date = (value, label) => {
    if (!value) return null;
    const result = new Date(value);
    if (Number.isNaN(result.getTime())) fail(`${label} không hợp lệ.`);
    return result;
};
const id = value => {
    if (!/^\d+$/.test(String(value))) fail('Mã dữ liệu không hợp lệ.');
    return BigInt(value);
};

// One save either persists the complete draft or leaves the existing plan intact.
export async function savePlan(itineraryId, userId, draft) {
    const planId = id(itineraryId);
    const actorId = id(userId);
    if (!Array.isArray(draft.items) || !Array.isArray(draft.packingItems)) fail('Thiếu lịch trình hoặc danh sách đồ dùng.');
    if (draft.items.length > 500 || draft.packingItems.length > 500) fail('Tối đa 500 điểm dừng hoặc vật dụng.');
    await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM itineraries WHERE id = ${planId} FOR UPDATE`;
        const existing = await tx.itineraries.findUnique({ where: { id: planId }, include: { collaborators: true, itinerary_items: true, packing_items: true } });
        if (!existing) throw { status: 404, message: 'Không tìm thấy kế hoạch.' };
        const isOwner = existing.user_id === actorId;
        if (!isOwner && !existing.collaborators.some(member => member.user_id === actorId && member.permission === 'edit')) {
            throw { status: 403, message: 'Bạn chỉ có quyền xem kế hoạch này.' };
        }
        if (!isOwner && (draft.collaborators !== undefined || draft.visibility !== undefined)) {
            throw { status: 403, message: 'Chỉ chủ kế hoạch được quản lý thành viên và chia sẻ.' };
        }
        if (draft.expectedUpdatedAt && new Date(draft.expectedUpdatedAt).getTime() !== existing.updated_at.getTime()) {
            throw { status: 409, message: 'Kế hoạch đã thay đổi. Hãy tải lại trước khi chỉnh sửa tiếp.' };
        }
        const start = date(draft.startDate, 'Ngày bắt đầu');
        const end = date(draft.endDate, 'Ngày kết thúc');
        const calendarStart = draft.startCalendarDate ? date(draft.startCalendarDate, 'Ngày khởi hành') : start;
        const calendarEnd = draft.endCalendarDate ? date(draft.endCalendarDate, 'Ngày về') : end;
        if (start && end && end < start) fail('Ngày kết thúc phải sau ngày bắt đầu.');
        const travelerCount = number(draft.travelerCount, 'Số người', 10000, true);
        if (travelerCount < 1) fail('Cần ít nhất một người tham gia.');
        if (!['PERSON', 'GROUP'].includes(draft.costScope)) fail('Phạm vi chi phí không hợp lệ.');
        if (!['draft', 'generated', 'completed', 'cancelled'].includes(draft.status)) fail('Trạng thái kế hoạch không hợp lệ.');
        const costs = Object.fromEntries(['Transport', 'Meals', 'Attractions', 'Accommodation', 'Contingency'].map(key => [key, number(draft[`cost${key}`], 'Chi phí')]));
        if (draft.preferences !== undefined && (!Array.isArray(draft.preferences) || draft.preferences.length > 30 || draft.preferences.some(value => typeof value !== 'string' || value.length > 80))) fail('Sở thích không hợp lệ.');
        const sum = Object.values(costs).reduce((total, value) => total + value, 0);
        const total = number(sum * (draft.costScope === 'PERSON' ? travelerCount : 1), 'Tổng chi phí');
        const update = {
            name: text(draft.name, 200, 'Tên kế hoạch', true), destination: text(draft.destination, 200, 'Điểm đến'),
            start_location: text(draft.startLocation, 255, 'Điểm khởi hành'), end_location: text(draft.endLocation, 255, 'Điểm kết thúc'),
            start_time: start, end_time: end, trip_date: calendarStart,
            total_days: calendarStart && calendarEnd ? Math.round((Date.UTC(calendarEnd.getUTCFullYear(), calendarEnd.getUTCMonth(), calendarEnd.getUTCDate()) - Date.UTC(calendarStart.getUTCFullYear(), calendarStart.getUTCMonth(), calendarStart.getUTCDate())) / 86400000) + 1 : Math.max(1, number(draft.totalDays || 1, 'Số ngày', 365, true)),
            traveler_count: travelerCount, transport_mode: text(draft.transportMode, 100, 'Phương tiện'),
            description: text(draft.description, 20000, 'Ghi chú'), status: draft.status,
            ...(draft.preferences !== undefined ? { preferences: draft.preferences } : {}),
            budget: number(draft.budget, 'Ngân sách'), cost_scope: draft.costScope,
            cost_transport: costs.Transport, cost_meals: costs.Meals, cost_attractions: costs.Attractions,
            cost_accommodation: costs.Accommodation, cost_contingency: costs.Contingency, total_cost: total, updated_at: new Date()
        };
        if (update.total_days < 1 || update.total_days > 365) fail('Kế hoạch hỗ trợ từ 1 đến 365 ngày.');
        if (draft.visibility !== undefined) {
            if (!['private', 'shared', 'public_view', 'public_edit'].includes(draft.visibility)) fail('Chế độ chia sẻ không hợp lệ.');
            update.visibility = draft.visibility;
        }

        const itemIds = new Set(existing.itinerary_items.map(item => String(item.id)));
        const keepItems = new Set();
        const preparedItems = [];
        for (const item of draft.items) {
            if (item.id && (!itemIds.has(String(item.id)) || keepItems.has(String(item.id)))) fail('Điểm dừng không thuộc kế hoạch hoặc bị trùng.');
            if (item.id) keepItems.add(String(item.id));
            const locationId = item.locationId ? id(item.locationId) : null;
            const businessId = item.businessId ? id(item.businessId) : null;
            const customName = text(item.customName, 255, 'Tên điểm dừng');
            if (!locationId && !businessId && !customName) fail('Mỗi điểm dừng cần có tên hoặc địa điểm.');
            const itemStart = date(item.startTime, 'Giờ bắt đầu điểm dừng');
            const itemEnd = date(item.endTime, 'Giờ kết thúc điểm dừng');
            if (itemStart && itemEnd && itemEnd < itemStart) fail('Giờ kết thúc điểm dừng phải sau giờ bắt đầu.');
            const day = number(item.day || 1, 'Ngày của điểm dừng', update.total_days, true);
            if (day < 1) fail('Ngày của điểm dừng phải từ 1.');
            const note = text(item.note, 470, 'Ghi chú điểm dừng') || '';
            preparedItems.push({ id: item.id, data: {
                location_id: locationId, business_id: businessId, custom_name: customName,
                planned_start_time: itemStart, planned_end_time: itemEnd,
                duration_minutes: item.durationMinutes === '' || item.durationMinutes == null ? null : number(item.durationMinutes, 'Thời lượng', 525600, true),
                travel_minutes: item.travelMinutes === '' || item.travelMinutes == null ? null : number(item.travelMinutes, 'Thời gian di chuyển', 525600, true),
                travel_distance_km: item.travelDistanceKm === '' || item.travelDistanceKm == null ? null : number(item.travelDistanceKm, 'Khoảng cách', 999999.99),
                note: `[DAY:${day}] ${note.replace(/\[DAY:\d+\]\s*/g, '')}`.trim()
            } });
        }
        // Validate all ownership and input before deleting any rows.
        const packingIds = new Set(existing.packing_items.map(item => String(item.id)));
        const keepPacking = new Set();
        const preparedPacking = draft.packingItems.map(item => {
            if (item.id && (!packingIds.has(String(item.id)) || keepPacking.has(String(item.id)))) fail('Vật dụng không thuộc kế hoạch hoặc bị trùng.');
            if (item.id) keepPacking.add(String(item.id));
            const quantity = number(item.quantity, 'Số lượng vật dụng', 10000, true);
            if (quantity < 1) fail('Số lượng vật dụng phải từ 1.');
            return { id: item.id, data: { item_name: text(item.itemName, 200, 'Tên vật dụng', true), category: text(item.category || 'other', 100, 'Nhóm vật dụng'), quantity, notes: text(item.notes, 500, 'Ghi chú vật dụng'), is_packed: Boolean(item.isPacked) } };
        });
        // Move retained rows out of the unique sort-order range before reordering.
        if (existing.itinerary_items.length) {
            const offset = Math.max(...existing.itinerary_items.map(item => item.sort_order)) + draft.items.length + 1;
            await tx.itinerary_items.updateMany({ where: { itinerary_id: planId }, data: { sort_order: { increment: offset } } });
        }
        await tx.itinerary_items.deleteMany({ where: { itinerary_id: planId, id: { notIn: [...keepItems].map(id) } } });
        for (const [index, item] of preparedItems.entries()) {
            if (item.id) await tx.itinerary_items.update({ where: { id: id(item.id) }, data: { ...item.data, sort_order: index + 1 } });
            else await tx.itinerary_items.create({ data: { ...item.data, itinerary_id: planId, sort_order: index + 1 } });
        }
        await tx.itinerary_packing_items.deleteMany({ where: { itinerary_id: planId, id: { notIn: [...keepPacking].map(id) } } });
        for (const item of preparedPacking) {
            if (item.id) await tx.itinerary_packing_items.update({ where: { id: id(item.id) }, data: item.data });
            else await tx.itinerary_packing_items.create({ data: { ...item.data, itinerary_id: planId } });
        }
        if (draft.collaborators !== undefined) {
            if (!Array.isArray(draft.collaborators) || draft.collaborators.length > 100) fail('Danh sách thành viên không hợp lệ.');
            const keep = new Set();
            for (const member of draft.collaborators) {
                const target = member.userId
                    ? await tx.users.findUnique({ where: { id: id(member.userId) } })
                    : await tx.users.findUnique({ where: { email: String(member.email || '').trim().toLowerCase() } });
                if (!target?.is_active) fail('Không tìm thấy thành viên đang hoạt động.');
                if (target.id === actorId || keep.has(String(target.id))) fail('Thành viên bị trùng hoặc là chủ kế hoạch.');
                if (!['view', 'edit'].includes(member.permission)) fail('Quyền thành viên không hợp lệ.');
                keep.add(String(target.id));
                const current = existing.collaborators.find(item => item.user_id === target.id);
                if (current) await tx.itinerary_collaborators.update({ where: { id: current.id }, data: { permission: member.permission } });
                else {
                    await tx.itinerary_collaborators.create({ data: { itinerary_id: planId, user_id: target.id, permission: member.permission } });
                    await tx.user_notifications.create({ data: { user_id: target.id, type: 'group_invite', title: 'Tham gia kế hoạch', message: `Bạn đã được thêm vào kế hoạch "${update.name}".` } });
                    await tx.itinerary_messages.create({ data: { itinerary_id: planId, sender_id: actorId, content: `[Hệ thống] ${target.full_name} đã được thêm vào kế hoạch.` } });
                }
            }
            await tx.itinerary_collaborators.deleteMany({ where: { itinerary_id: planId, user_id: { notIn: [...keep].map(id) } } });
            if (keep.size && (update.visibility || existing.visibility) === 'private') update.visibility = 'shared';
        }
        await tx.itineraries.update({ where: { id: planId }, data: update });
    }, { timeout: 20000 });
    return getItineraryById(planId, actorId);
}
