import prisma from '../config/db.js';
import { formatStopNote, getItineraryById, notifyItineraryParticipants } from './itineraryService.js';
import { resolveManualPlanLocation } from './manualPlanLocation.js';
import { normalizeTripExpenses } from './tripExpenseInput.js';
import { createNotification } from './notificationService.js';

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
const coordinate = (value, label, min, max) => { if (value == null || value === '') return null; const number = Number(value); if (!Number.isFinite(number) || number < min || number > max) fail(`${label} không hợp lệ.`); return number; };
const clock = value => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) fail('Giờ khởi hành không hợp lệ.'); return String(value); };
const boundedNumber = (value, label, max, integer = false) => { const number = Number(value); if (!Number.isFinite(number) || (integer && !Number.isInteger(number)) || number < 1 || number > max) fail(`${label} không hợp lệ.`); return number; };

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
        let ledger = null;
        if (draft.expenses != null || Array.isArray(existing.expenses)) {
            const members = [String(existing.user_id)];
            if (draft.collaborators !== undefined) {
                if (!Array.isArray(draft.collaborators) || draft.collaborators.length > 100) fail('Danh sách thành viên không hợp lệ.');
                for (const member of draft.collaborators) {
                    const target = member.userId ? await tx.users.findUnique({ where: { id: id(member.userId) } }) : await tx.users.findUnique({ where: { email: String(member.email || '').trim().toLowerCase() } });
                    if (target?.is_active) members.push(String(target.id));
                }
            } else members.push(...existing.collaborators.map(member => String(member.user_id)));
            ledger = normalizeTripExpenses(draft.expenses ?? existing.expenses, members);
        }
        const costEstimates = draft.costEstimates === undefined ? existing.cost_estimates : draft.costEstimates;
        const costFields = [['Transport', 'transport'], ['Meals', 'meals'], ['Attractions', 'attractions'], ['Accommodation', 'accommodation'], ['Contingency', 'contingency']];
        const costs = ledger?.costs || Object.fromEntries(costFields.map(([key, category]) => {
            const value = draft[`cost${key}`];
            return [key, value === '' || (costEstimates?.unknownCategories?.includes(category) && value == null) ? null : number(value, `Chi phí ${category}`)];
        }));
        let nextCostEstimates = !ledger ? (() => {
            const unknown = new Set(costEstimates?.unknownCategories || []);
            for (const [key, category] of costFields) costs[key] == null ? unknown.add(category) : unknown.delete(category);
            if (!costEstimates && !unknown.size) return null;
            return { ...(costEstimates || {}), isEstimated: Boolean(costEstimates?.isEstimated), currency: costEstimates?.currency || 'VND', unknownCategories: [...unknown] };
        })() : costEstimates;
        if (draft.preferences !== undefined && (!Array.isArray(draft.preferences) || draft.preferences.length > 30 || draft.preferences.some(value => typeof value !== 'string' || value.length > 80))) fail('Sở thích không hợp lệ.');
        let total = null;
        if (draft.startLocationId) {
            const startLocationId = id(draft.startLocationId);
            const startLocation = await tx.locations.findUnique({ where: { id: startLocationId }, select: { id: true } });
            if (!startLocation) fail('Không tìm thấy địa điểm khởi hành.');
        }
        const update = {
            name: text(draft.name, 200, 'Tên kế hoạch', true), destination: text(draft.destination, 200, 'Điểm đến'),
            start_location: text(draft.startLocation, 255, 'Điểm khởi hành'), end_location: text(draft.endLocation, 255, 'Điểm kết thúc'),
            start_location_id: draft.startLocationId ? id(draft.startLocationId) : null,
            start_latitude: coordinate(draft.startLocationLatitude, 'Vĩ độ vị trí khởi hành', -90, 90), start_longitude: coordinate(draft.startLocationLongitude, 'Kinh độ vị trí khởi hành', -180, 180),
            departure_time: clock(draft.departureTime || '08:00'), max_stops_per_day: boundedNumber(draft.maxStopsPerDay || 8, 'Số địa điểm tối đa mỗi ngày', 20, true),
            start_time: start, end_time: end, trip_date: calendarStart,
            total_days: calendarStart && calendarEnd ? Math.round((Date.UTC(calendarEnd.getUTCFullYear(), calendarEnd.getUTCMonth(), calendarEnd.getUTCDate()) - Date.UTC(calendarStart.getUTCFullYear(), calendarStart.getUTCMonth(), calendarStart.getUTCDate())) / 86400000) + 1 : Math.max(1, number(draft.totalDays || 1, 'Số ngày', 365, true)),
            traveler_count: travelerCount, transport_mode: text(draft.transportMode, 100, 'Phương tiện'),
            description: text(draft.description, 20000, 'Ghi chú'), status: draft.status,
            ...(draft.preferences !== undefined ? { preferences: draft.preferences } : {}),
            budget: number(draft.budget, 'Ngân sách'), cost_scope: ledger ? 'GROUP' : draft.costScope, cost_estimates: nextCostEstimates || null,
            ...(ledger ? { expenses: ledger.expenses } : {}),
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
            let locationId = item.locationId ? id(item.locationId) : null;
            if (!locationId && item.manualLocation) {
                locationId = await resolveManualPlanLocation(tx, item.manualLocation, item.customName);
            }
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
                travel_is_estimated: Boolean(item.travelIsEstimated),
                travel_minutes_from_previous: item.travelMinutesFromPrevious === '' || item.travelMinutesFromPrevious == null ? null : number(item.travelMinutesFromPrevious, 'Thời gian di chuyển từ điểm trước', 525600, true),
                travel_distance_from_previous_km: item.travelDistanceFromPreviousKm === '' || item.travelDistanceFromPreviousKm == null ? null : number(item.travelDistanceFromPreviousKm, 'Khoảng cách từ điểm trước', 999999.99),
                travel_is_estimated_from_previous: Boolean(item.travelIsEstimatedFromPrevious),
                schedule_conflict: text(item.scheduleConflict, 255, 'Cảnh báo thời gian điểm dừng'),
                note: formatStopNote(day, note)
            } });
        }
        if (!ledger && nextCostEstimates?.isEstimated) {
            const deletedItems = existing.itinerary_items.filter(item => !keepItems.has(String(item.id)));
            const existingById = new Map(existing.itinerary_items.map(item => [String(item.id), item]));
            const existingOrderedItems = [...existing.itinerary_items].sort((a, b) => a.sort_order - b.sort_order);
            const changedItems = preparedItems.filter(item => {
                if (!item.id) return true;
                const previous = existingById.get(String(item.id));
                const previousIndex = existingOrderedItems.findIndex(existingItem => String(existingItem.id) === String(item.id));
                const previousDay = Number(previous?.note?.match(/\[DAY:(\d+)\]/)?.[1] || 1);
                const nextDay = Number(item.data.note?.match(/\[DAY:(\d+)\]/)?.[1] || 1);
                return previous && (String(previous.location_id || '') !== String(item.data.location_id || '') || String(previous.business_id || '') !== String(item.data.business_id || '') || String(previous.custom_name || '') !== String(item.data.custom_name || '') || previousIndex !== preparedItems.indexOf(item) || previousDay !== nextDay);
            });
            const coordinateChanged = (previous, next) => previous == null || next == null ? previous != null || next != null : Number(previous) !== Number(next);
            const routeSettingsChanged = existing.transport_mode !== update.transport_mode
                || existing.departure_time !== update.departure_time
                || String(existing.start_location_id || '') !== String(update.start_location_id || '')
                || coordinateChanged(existing.start_latitude, update.start_latitude)
                || coordinateChanged(existing.start_longitude, update.start_longitude);
            const routeChanged = routeSettingsChanged || deletedItems.length > 0 || changedItems.length > 0 || preparedItems.some(item => !item.id);
            if (routeChanged) {
                const retainedLocationIds = new Set(preparedItems.map(item => item.data.location_id?.toString()).filter(Boolean));
                const deletedLocationIds = new Set(deletedItems.map(item => item.location_id?.toString()).filter(locationId => locationId && !retainedLocationIds.has(locationId)));
                let activitiesChanged = preparedItems.some(item => !item.id);
                for (const item of changedItems) {
                    const previous = item.id && existingById.get(String(item.id));
                    const oldLocationId = previous?.location_id?.toString();
                    if (oldLocationId && !retainedLocationIds.has(oldLocationId)) deletedLocationIds.add(oldLocationId);
                    if (!previous || String(previous.location_id || '') !== String(item.data.location_id || '') || String(previous.business_id || '') !== String(item.data.business_id || '') || String(previous.custom_name || '') !== String(item.data.custom_name || '')) activitiesChanged = true;
                }
                const originalLines = Array.isArray(nextCostEstimates.costBreakdown) ? nextCostEstimates.costBreakdown : [];
                const affectedCategories = new Set();
                affectedCategories.add('transport');
                if (activitiesChanged || !originalLines.length) affectedCategories.add('attractions');
                for (const line of originalLines) {
                    if (line.locationId && deletedLocationIds.has(String(line.locationId))) affectedCategories.add(line.category);
                    else if (!line.locationId && ['attractions', 'meals', 'accommodation'].includes(line.category)) affectedCategories.add(line.category);
                }
                let remainingLines = originalLines.filter(line => !(line.locationId && deletedLocationIds.has(String(line.locationId))) && !(affectedCategories.has(line.category) && (line.category === 'transport' || !line.locationId || (activitiesChanged && line.category === 'attractions'))));
                const costKeyFor = category => ({ transport: 'Transport', accommodation: 'Accommodation', meals: 'Meals', attractions: 'Attractions', contingency: 'Contingency' })[category];
                const unknown = new Set(nextCostEstimates.unknownCategories || []);
                for (const category of affectedCategories) {
                    const key = costKeyFor(category);
                    if (!key) continue;
                    const categoryLines = remainingLines.filter(line => line.category === category);
                    if (categoryLines.length && categoryLines.every(line => line.totalCost != null)) {
                        costs[key] = categoryLines.reduce((sum, line) => sum + Number(line.totalCost), 0);
                        unknown.delete(category);
                    } else {
                        costs[key] = null;
                        unknown.add(category);
                        remainingLines = remainingLines.filter(line => line.category !== category);
                    }
                }
                nextCostEstimates = { ...nextCostEstimates, costBreakdown: remainingLines, unknownCategories: [...unknown] };
            }
            const dayByLocation = new Map(draft.items.filter(item => item.locationId).map(item => [String(item.locationId), Number(item.day || 1)]));
            if (Array.isArray(nextCostEstimates?.costBreakdown)) {
                nextCostEstimates = {
                    ...nextCostEstimates,
                    costBreakdown: nextCostEstimates.costBreakdown.map(line => dayByLocation.has(String(line.locationId)) ? { ...line, dayNumber: dayByLocation.get(String(line.locationId)) } : line)
                };
            }
        }
        const sum = Object.values(costs).reduce((value, amount) => value + (amount ?? 0), 0);
        const hasUnknownCosts = Boolean(nextCostEstimates?.unknownCategories?.length) || Object.values(costs).some(value => value == null);
        total = hasUnknownCosts ? null : ledger?.total ?? number(sum * (draft.costScope === 'PERSON' ? travelerCount : 1), 'Tổng chi phí');
        update.cost_transport = costs.Transport;
        update.cost_meals = costs.Meals;
        update.cost_attractions = costs.Attractions;
        update.cost_accommodation = costs.Accommodation;
        update.cost_contingency = costs.Contingency;
        update.cost_estimates = nextCostEstimates || null;
        update.total_cost = total;
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
                    await createNotification({ db: tx, userId: target.id, type: 'group_invite', title: `Tham gia kế hoạch — ${update.name}`, message: `Bạn đã được thêm vào kế hoạch "${update.name}".` });
                    await tx.itinerary_messages.create({ data: { itinerary_id: planId, sender_id: actorId, content: `[Hệ thống] ${target.full_name} đã được thêm vào kế hoạch.` } });
                }
            }
            await tx.itinerary_collaborators.deleteMany({ where: { itinerary_id: planId, user_id: { notIn: [...keep].map(id) } } });
            if (keep.size && (update.visibility || existing.visibility) === 'private') update.visibility = 'shared';
        }
        await tx.itineraries.update({ where: { id: planId }, data: update });
    }, { timeout: 20000 });
    await notifyItineraryParticipants(planId, actorId, {
        title: 'Lịch trình đã được chỉnh sửa',
        message: `Lịch trình "${draft.name}" hoặc các điểm dừng vừa được cập nhật. Hãy mở PlanTravel để xem thay đổi.`
    });
    return getItineraryById(planId, actorId);
}
