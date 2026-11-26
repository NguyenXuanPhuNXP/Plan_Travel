const DAY_START = 8 * 60;
const DAY_END = 21 * 60 + 30;
const MAX_STOPS_PER_DAY = 8;
const OVERNIGHT_REST_MINUTES = 8 * 60;
const SPEED_KMH = { auto: 30, flight: 750, coach: 35, train: 60, motorbike: 32, car: 40, other: 25 };
const ROAD_DISTANCE_FACTOR = { auto: 1.3, flight: 1, coach: 1.25, train: 1.15, motorbike: 1.3, car: 1.3, other: 1.15 };

export function haversineDistanceKm(a, b) {
    if (!validPoint(a) || !validPoint(b)) return null;
    const toRad = value => value * Math.PI / 180;
    const dLat = toRad(Number(b.latitude ?? b.lat) - Number(a.latitude ?? a.lat));
    const dLon = toRad(Number(b.longitude ?? b.lng) - Number(a.longitude ?? a.lng));
    const lat1 = toRad(Number(a.latitude ?? a.lat));
    const lat2 = toRad(Number(b.latitude ?? b.lat));
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function estimateTravel(distanceKm, transportMode = 'other') {
    if (distanceKm == null || distanceKm === '' || !Number.isFinite(Number(distanceKm))) return { minutes: null, distanceKm: null, isEstimated: true };
    if (transportMode === 'flight') {
        const distance = Number(distanceKm);
        if (distance < 100) return estimateTravel(distance, 'auto');
        return { distanceKm: Number(distance.toFixed(2)), minutes: Math.ceil(distance / SPEED_KMH.flight * 60) + 120, isEstimated: true };
    }
    const speed = SPEED_KMH[transportMode] || SPEED_KMH.other;
    const adjustedDistance = Number(distanceKm) * (ROAD_DISTANCE_FACTOR[transportMode] || ROAD_DISTANCE_FACTOR.other);
    return { distanceKm: Number(adjustedDistance.toFixed(2)), minutes: Math.max(5, Math.ceil(adjustedDistance / speed * 60)), isEstimated: true };
}

export function calculateTripCosts({ items = [], travelerCount = 1, costAllocation = null, costScope = 'PERSON', fixedCosts = 0, costBreakdown = [], dayCount = 1 } = {}) {
    const people = Math.max(1, Number(travelerCount) || 1);
    const allocation = costAllocation && typeof costAllocation === 'object' ? costAllocation : {};
    const categories = ['transport', 'accommodation', 'meals', 'attractions', 'contingency'];
    const lineRows = (Array.isArray(costBreakdown) ? costBreakdown : []).filter(line => categories.includes(line?.category)).map(line => {
        const category = line.category;
        const costType = ['PERSON', 'GROUP', 'ROOM', 'FIXED'].includes(line.costType) ? line.costType : 'PERSON';
        const unitPrice = finiteCost(line.unitPrice);
        const quantity = finiteCost(line.quantity) ?? 1;
        const rawNights = finiteCost(line.nights);
        const nights = Number.isInteger(rawNights) ? rawNights : null;
        const capacity = Number(line.capacity);
        let multiplier = quantity;
        if (costType === 'PERSON') multiplier *= people;
        if (costType === 'GROUP' && Number.isInteger(capacity) && capacity > 0) multiplier = Math.ceil(people / capacity) * quantity;
        if (costType === 'ROOM') multiplier = Number.isInteger(capacity) && capacity > 0 && nights != null ? Math.ceil(people / capacity) * nights * quantity : null;
        return { ...line, category, costType, unitPrice, quantity, capacity: Number.isInteger(capacity) && capacity > 0 ? capacity : null, nights, totalCost: unitPrice == null || multiplier == null ? null : Math.round(unitPrice * multiplier) };
    });
    const group = {};
    const unknownCategories = [];
    const categoriesWithBreakdown = new Set(lineRows.map(line => line.category));
    for (const category of categories) {
        const supplied = finiteCost(allocation[category]);
        let amount = supplied;
        if (categoriesWithBreakdown.has(category)) {
            const lines = lineRows.filter(line => line.category === category);
            amount = lines.every(line => line.totalCost != null) ? lines.reduce((sum, line) => sum + line.totalCost, 0) : null;
        } else if (amount == null && category === 'attractions' && items.length) {
            const itemCosts = items.filter(item => !isAccommodationItem(item)).map(item => finiteCost(item.location?.estimatedCost ?? item.estimatedCost));
            if (itemCosts.every(value => value != null)) amount = itemCosts.reduce((sum, value) => sum + value, 0);
        }
        if (amount == null) {
            group[category] = null;
            unknownCategories.push(category);
        } else {
            group[category] = categoriesWithBreakdown.has(category) || (costScope === 'GROUP' && supplied != null) ? amount : amount * people;
        }
    }
    const unallocatedFixed = finiteCost(fixedCosts) ?? 0;
    const fixedLines = lineRows.filter(line => line.costType === 'FIXED');
    group.fixed = fixedLines.some(line => line.totalCost == null) ? null : fixedLines.reduce((sum, line) => sum + line.totalCost, unallocatedFixed);
    group.knownSubtotal = categories.reduce((sum, category) => sum + (group[category] ?? 0), unallocatedFixed);
    group.total = unknownCategories.length ? null : group.knownSubtotal;
    group.perPerson = group.total == null ? null : Math.round(group.total / people);
    const perPerson = Object.fromEntries(categories.map(category => [category, group[category] == null ? null : Math.round(group[category] / people)]));
    const daily = Array.from({ length: dayCount }, (_, index) => {
        const dayNumber = index + 1;
        const dailyCategories = {};
        const dailyUnknown = [];
        for (const category of categories) {
            if (categoriesWithBreakdown.has(category)) {
                const lines = lineRows.filter(line => line.category === category);
                if (lines.some(line => line.totalCost == null || line.dayNumber == null)) {
                    dailyCategories[category] = null;
                    dailyUnknown.push(category);
                    continue;
                }
                let dayTotal = 0;
                for (const line of lines) {
                    if (line.costType === 'ROOM') {
                        const rooms = Math.ceil(people / line.capacity);
                        const nightlyCost = Math.round(line.unitPrice * rooms * line.quantity);
                        if (dayNumber >= Number(line.dayNumber) && dayNumber < Number(line.dayNumber) + line.nights) dayTotal += nightlyCost;
                    } else if (Number(line.dayNumber) === dayNumber) {
                        dayTotal += line.totalCost;
                    }
                }
                dailyCategories[category] = dayTotal;
            } else if (category === 'attractions' && allocation[category] == null) {
                const day = items.filter(item => Number(item.dayNumber ?? item.day ?? 1) === dayNumber && !isAccommodationItem(item));
                const values = day.map(item => finiteCost(item.location?.estimatedCost ?? item.estimatedCost));
                dailyCategories[category] = values.length && values.every(value => value != null) ? values.reduce((sum, value) => sum + value, 0) * people : null;
                if (dailyCategories[category] == null) dailyUnknown.push(category);
            } else if (finiteCost(allocation[category]) === 0) {
                dailyCategories[category] = 0;
            } else {
                dailyCategories[category] = null;
                dailyUnknown.push(category);
            }
        }
        return {
            dayNumber,
            categories: dailyCategories,
            total: dailyUnknown.length ? null : Object.values(dailyCategories).reduce((sum, value) => sum + value, 0),
            unknownCategories: dailyUnknown,
            isEstimated: true
        };
    });
    group.knownSubtotal = categories.reduce((sum, category) => sum + (group[category] ?? 0), unallocatedFixed);
    group.total = unknownCategories.length ? null : group.knownSubtotal;
    group.perPerson = group.total == null ? null : Math.round(group.total / people);
    return { perPerson, group, unknownCategories, breakdown: lineRows, daily, isEstimated: true };
}

export function schedulePlan(plan, {
    days = Array.isArray(plan?.days) && plan.days.length ? plan.days.length : 3,
    travelerCount = plan?.travelerCount ?? 1,
    departureTime = plan?.departureTime ?? '08:00',
    startLocation = plan?.startLocation ?? null,
    maxStopsPerDay = plan?.maxStopsPerDay ?? 8,
    transportMode = plan?.transportMode ?? 'other',
    routeEstimates = {},
    budget = plan?.budget ?? null,
    selectedLocationOrder = plan?.selectedLocationOrder || [],
    focusLocationId = null,
    costAllocation = plan?.costAllocation,
    costScope = plan?.costScope || 'GROUP',
    costBreakdown = plan?.costBreakdown || plan?.costEstimates?.costBreakdown || []
} = {}) {
    const warnings = [];
    const dailyLimit = Math.min(MAX_STOPS_PER_DAY, Math.max(1, Number(maxStopsPerDay) || 8));
    const addWarning = (entry) => {
        if (!warnings.some(item => item.day === entry.day && item.locationId === entry.locationId && item.location === entry.location && item.reason === entry.reason)) warnings.push(entry);
    };
    const inputDays = Array.isArray(plan?.days) ? plan.days : [];
    const normalizedDays = [];
    let deferredItems = [];
    for (let index = 0; index < days; index += 1) {
        const source = inputDays.find(day => Number(day.dayNumber) === index + 1) || inputDays[index] || {};
        const carriedItems = deferredItems;
        deferredItems = [];
        const allItems = [
            ...carriedItems,
            ...(Array.isArray(source.items) ? source.items : []),
            ...(Array.isArray(source.unassignedItems) ? source.unassignedItems : [])
        ].filter(Boolean);
        const activities = allItems.filter(item => !isAccommodationItem(item));
        const priorityActivities = [...activities].sort((a, b) => {
            const aFocus = focusLocationId != null && String(a.locationId || a.location?.id || a.id) === String(focusLocationId);
            const bFocus = focusLocationId != null && String(b.locationId || b.location?.id || b.id) === String(focusLocationId);
            return Number(bFocus) - Number(aFocus);
        });
        const retainedActivities = new Set(priorityActivities.slice(0, dailyLimit));
        const overflowItems = activities.filter(item => !retainedActivities.has(item)).map(item => ({
            ...item,
            scheduleConflict: `Chưa xếp vào Ngày ${index + 1} vì đã đạt giới hạn ${dailyLimit} điểm hoạt động/ngày`
        }));
        const retainedItems = allItems.filter(item => isAccommodationItem(item) || retainedActivities.has(item));
        const unscheduledItems = [];
        if (overflowItems.length) addWarning(warning(index + 1, null, `Vượt giới hạn ${dailyLimit} điểm hoạt động/ngày: đã xếp tối đa ${dailyLimit}; ${overflowItems.length} điểm còn lại được giữ trong danh sách gợi ý để bạn chọn ngày phù hợp (không tính nơi lưu trú).`, 'high'));
        let cursor = index === 0 ? parseClock(departureTime) : DAY_START;
        const previousDayItems = index > 0 ? normalizedDays[index - 1]?.items || [] : [];
        const previousDayStay = [...previousDayItems].reverse().find(isAccommodationItem) || null;
        const previousDayEnd = previousDayStay ? (previousDayStay.location || previousDayStay) : [...previousDayItems].reverse().find(item => !item.scheduleConflict && item.startTime)?.location || null;
        let previous = index === 0 ? startLocation : validPoint(previousDayEnd) ? previousDayEnd : null;
        const items = index === 0 && selectedLocationOrder.length
            ? preserveDayOneOrder(retainedItems, selectedLocationOrder)
            : optimizeDayOrder(retainedItems, previous, cursor, routeEstimates, transportMode, focusLocationId);
        const scheduled = items.map((item) => {
            const location = item.location || item;
            const routeKey = previous && location ? routeEstimateKey(previous, location) : null;
            const travel = routeKey && routeEstimates[routeKey]
                ? routeEstimates[routeKey]
                : estimateTravel(haversineDistanceKm(previous, location), transportMode);
            const travelMinutes = travel.minutes ?? 0;
            if (!validPoint(location)) {
                addWarning(warning(index + 1, location?.name || item.locationName || 'Địa điểm', 'Thiếu tọa độ hợp lệ; không thể tính tuyến và thời gian di chuyển cho điểm này', 'medium', item.locationId || location?.id || null));
            } else if (previous && !validPoint(previous)) {
                addWarning(warning(index + 1, location?.name || item.locationName || 'Địa điểm', 'Điểm xuất phát của chặng trước thiếu tọa độ; thời gian di chuyển chưa được xác định', 'medium', item.locationId || location?.id || null));
            }
            if ((travel.distanceKm ?? 0) > 200 || travelMinutes > 240) {
                const longTravel = travelMinutes > 12 * 60;
                const veryLongTravel = travelMinutes > 24 * 60;
                const reason = veryLongTravel
                    ? 'Thời gian di chuyển dài hơn một ngày; hãy đổi ngày, đổi địa điểm hoặc xác nhận tiếp tục'
                    : longTravel
                        ? 'Thời gian di chuyển dài hơn nửa ngày; hãy cân nhắc máy bay/tàu, đổi ngày hoặc đổi địa điểm'
                        : 'Quãng đường hoặc thời gian di chuyển giữa hai điểm quá dài cho một chặng trong ngày; cần xác nhận phương tiện hoặc đổi điểm';
                const travelWarning = warning(index + 1, location?.name || item.locationName, reason, 'high', item.locationId || location?.id || null);
                if (longTravel) Object.assign(travelWarning, {
                    longTravel: true,
                    travelMinutes,
                    travelDistanceKm: travel.distanceKm ?? null,
                    suggestedTransport: suggestLongTravelTransport(travel.distanceKm, transportMode)
                });
                addWarning(travelWarning);
            }
            const isOvernightStay = isAccommodationItem(item);
            const duration = isOvernightStay
                ? Math.max(OVERNIGHT_REST_MINUTES, Number(item.durationMinutes) || 0)
                : Math.max(15, Number(item.durationMinutes) || parseSuggestedDuration(location?.suggestedDuration) || 90);
            const arrival = cursor + travelMinutes;
            const opening = getOpeningMinutes(location);
            const start = Math.max(arrival, opening ?? arrival, isOvernightStay ? 18 * 60 : arrival);
            const waitingMinutes = Math.max(0, start - arrival);
            const closing = getClosingMinutes(location);
            const routeConflictReason = !validPoint(location)
                ? 'Địa điểm thiếu tọa độ nên chưa tính được thời gian di chuyển'
                : !validPoint(previous)
                    ? 'Chưa xác định được tọa độ điểm xuất phát của chặng nên chưa thể xếp giờ đến'
                    : null;
            const conflictReason = routeConflictReason || (closing != null && start >= closing
                ? 'Ngoài giờ mở cửa tại thời điểm dự kiến đến'
                : closing != null && start + duration > closing
                    ? 'Không đủ thời gian tham quan trước giờ đóng cửa'
                    : !isOvernightStay && start + duration > DAY_END
                    ? 'Thời lượng hoạt động vượt quá 21:30 của ngày'
                    : null);
            const exceedsDayEnd = !isOvernightStay && start + duration > DAY_END;
            if (exceedsDayEnd && index + 1 < days) {
                deferredItems.push({
                    ...item,
                    location,
                    movedFromDay: index + 1,
                    movedToDay: index + 2,
                    scheduleConflict: null
                });
                return null;
            }
            if (conflictReason || duration < 30) {
                const reason = conflictReason || 'Thời lượng hoạt động không đủ tối thiểu 30 phút';
                const locationName = location?.name || item.locationName || 'Địa điểm';
                addWarning(warning(index + 1, locationName, `${reason}; điểm được giữ lại để bạn xác nhận điều chỉnh`, 'high', item.locationId || location?.id || null));
                unscheduledItems.push({
                    ...item, location, startTime: null, endTime: null, durationMinutes: duration,
                    waitingMinutes, travelMinutesFromPrevious: travel.minutes,
                    travelDistanceFromPreviousKm: travel.distanceKm,
                    travelMinutesFromStart: index === 0 && startLocation ? travel.minutes : null,
                    travelDistanceFromStartKm: index === 0 && startLocation ? travel.distanceKm : null,
                    travelMinutesToNext: null, travelDistanceKm: null,
                    travelIsEstimatedToNext: true, travelIsEstimated: travel.isEstimated,
                    scheduleConflict: reason
                });
                return null;
            }
            const end = start + duration;
            const endConflict = !isOvernightStay && end > DAY_END;
            if (endConflict) addWarning(warning(index + 1, location?.name || item.locationName, 'Tổng thời gian di chuyển và tham quan vượt khung giờ khả dụng', 'high', item.locationId || location?.id || null));
            cursor = isOvernightStay ? DAY_END : end;
            previous = location;
            return {
                ...item,
                location,
                startTime: formatClock(start),
                endTime: isOvernightStay ? formatClock(DAY_END) : formatClock(end),
                durationMinutes: duration,
                isOvernightStay,
                overnightRestMinutes: isOvernightStay ? duration : null,
                overnightRestContinuesNextDay: isOvernightStay,
                waitingMinutes,
                travelMinutesFromPrevious: travel.minutes,
                travelDistanceFromPreviousKm: travel.distanceKm,
                travelMinutesFromStart: index === 0 && startLocation ? travel.minutes : null,
                travelDistanceFromStartKm: index === 0 && startLocation ? travel.distanceKm : null,
                travelMinutesToNext: null,
                travelDistanceKm: null,
                travelIsEstimatedToNext: true,
                travelIsEstimated: travel.isEstimated,
                scheduleConflict: endConflict ? 'Tổng thời gian vượt khung giờ khả dụng; cần xác nhận giờ kết thúc hoặc điều chỉnh lịch' : null
            };
        }).filter(Boolean);
        scheduled.forEach((item, itemIndex) => {
            const next = scheduled[itemIndex + 1]?.location;
            const routeKey = next ? routeEstimateKey(item.location, next) : null;
            const travelToNext = routeKey && routeEstimates[routeKey]
                ? routeEstimates[routeKey]
                : next ? estimateTravel(haversineDistanceKm(item.location, next), transportMode) : { minutes: null, distanceKm: null };
            item.travelMinutesToNext = travelToNext.minutes ?? (Number(item.travelMinutesToNext) || null);
            item.travelDistanceKm = travelToNext.distanceKm ?? item.travelDistanceKm ?? null;
            item.travelIsEstimatedToNext = travelToNext.isEstimated ?? true;
        });
        scheduled.push(...unscheduledItems);
        if (index === 0 && !startLocation && (scheduled.length || unscheduledItems.length)) addWarning(warning(1, null, 'Chưa có vị trí khởi hành; ngày đầu tạm tính giờ khởi hành tại điểm đầu', 'medium'));
        if (index > 0 && (scheduled.length || unscheduledItems.length)) {
            const previousDayHadStay = Boolean(previousDayStay);
            const assumption = previousDayHadStay
                ? (validPoint(previousDayEnd) ? null : 'Nơi lưu trú ngày trước chưa có tọa độ; ngày này tạm tính từ 08:00 và cần xác nhận điểm xuất phát')
                : (validPoint(previousDayEnd) ? 'Chưa có nơi lưu trú; tạm tính xuất phát từ điểm cuối ngày trước và cần xác nhận' : 'Chưa có nơi lưu trú hoặc tọa độ điểm xuất phát; ngày này được tính từ 08:00 và cần xác nhận điểm xuất phát');
            if (assumption) addWarning(warning(index + 1, null, assumption, 'medium'));
        }
        normalizedDays.push({ ...source, dayNumber: index + 1, title: source.title || `Ngày ${index + 1}`, items: scheduled, unassignedItems: overflowItems });
    }
    const scheduledCostItems = normalizedDays.flatMap(day => day.items.map(item => ({ ...item, dayNumber: day.dayNumber })));
    const costs = calculateTripCosts({
        items: scheduledCostItems,
        travelerCount,
        costAllocation,
        costScope,
        costBreakdown,
        dayCount: normalizedDays.length
    });
    costs.group.daily = costs.daily;
    if (budget != null && costs.group.total != null && costs.group.total > Number(budget)) {
        addWarning(warning(null, null, 'Chi phí ước tính vượt ngân sách', 'high'));
    } else if (budget != null && costs.unknownCategories.length) {
        addWarning(warning(null, null, 'Chưa đủ dữ liệu giá để xác nhận tổng chi phí so với ngân sách', 'medium'));
    }
    const explicitRecommendation = Number(plan?.recommendedStopsPerDay);
    const recommendedStopsPerDay = Number.isInteger(explicitRecommendation) && explicitRecommendation >= 1
        ? Math.min(dailyLimit, explicitRecommendation)
        : recommendStopsPerDay(normalizedDays, dailyLimit);
    return {
        ...plan,
        days: normalizedDays,
        warnings,
        feasibilityStatus: warnings.some(item => item.severity === 'high') ? 'needs_adjustment' : warnings.length ? 'warning' : 'valid',
        costSummary: costs.group,
        costEstimates: { isEstimated: costs.isEstimated, unknownCategories: costs.unknownCategories, currency: 'VND', costBreakdown: costs.breakdown },
        costScope,
        travelerCount,
        departureTime,
        startLocation,
        maxStopsPerDay: dailyLimit,
        selectedLocationOrder,
        recommendedStopsPerDay,
        budget,
        transportMode,
        costBreakdown: costs.breakdown,
        costAllocation: Object.fromEntries(['transport', 'accommodation', 'meals', 'attractions', 'contingency'].map(category => [category, costs.group[category]]))
    };
}

export function applyPlanAdjustment(plan, { action, dayNumber, locationId = null, locationName = null, maxStopsPerDay = 8 } = {}) {
    if (!['remove_item', 'move_item_next_day'].includes(action)) throw new Error('Phương án điều chỉnh không được hỗ trợ.');
    const days = Array.isArray(plan?.days) ? plan.days.map(day => ({ ...day, items: [...(day.items || [])] })) : [];
    const dayIndex = days.findIndex(day => Number(day.dayNumber) === Number(dayNumber));
    if (dayIndex < 0) throw new Error('Không tìm thấy ngày cần điều chỉnh.');
    const itemIndex = days[dayIndex].items.findIndex(item => {
        const id = item.locationId || item.location?.id;
        const name = item.locationName || item.location?.name || item.customName;
        return locationId != null ? String(id) === String(locationId) : String(name || '').trim() === String(locationName || '').trim();
    });
    if (itemIndex < 0) throw new Error('Không tìm thấy địa điểm cần điều chỉnh trong lịch trình hiện tại.');
    const [item] = days[dayIndex].items.splice(itemIndex, 1);
    const itemId = item.locationId || item.location?.id;
    const category = costCategoryForItem(item);
    const breakdown = [...(plan.costBreakdown || plan.costEstimates?.costBreakdown || [])];
    const linkedBreakdown = itemId != null && breakdown.some(line => String(line.locationId || '') === String(itemId));
    let nextBreakdown = breakdown;
    const costAllocation = { ...(plan.costAllocation || {}) };
    if (action === 'move_item_next_day') {
        if (dayIndex + 1 >= days.length) throw new Error('Không có ngày tiếp theo để chuyển địa điểm.');
        const destinationActivityCount = days[dayIndex + 1].items.filter(item => !isAccommodationItem(item)).length;
        if (!isAccommodationItem(item) && destinationActivityCount >= Math.min(MAX_STOPS_PER_DAY, Number(maxStopsPerDay) || 8)) throw new Error('Ngày tiếp theo đã đủ số địa điểm tối đa.');
        days[dayIndex + 1].items.push(item);
        if (linkedBreakdown) nextBreakdown = breakdown.map(line => String(line.locationId || '') === String(itemId) ? { ...line, dayNumber: Number(days[dayIndex + 1].dayNumber) } : line);
    } else {
        nextBreakdown = linkedBreakdown
            ? breakdown.filter(line => String(line.locationId || '') !== String(itemId))
            : breakdown.filter(line => line.category !== category);
        // Invalidate the cached category total; the scheduler recomputes from remaining linked lines or item prices.
        costAllocation[category] = null;
    }
    const costEstimates = { ...(plan.costEstimates || {}), costBreakdown: nextBreakdown };
    return { ...plan, days, costAllocation, costBreakdown: nextBreakdown, costEstimates };
}

function validPoint(point) {
    const rawLat = point?.latitude ?? point?.lat;
    const rawLng = point?.longitude ?? point?.lng;
    if (rawLat == null || rawLat === '' || rawLng == null || rawLng === '') return false;
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}
export function isAccommodationItem(item) {
    if (item?.isAccommodation === true || item?.kind === 'accommodation') return true;
    const text = [item?.locationName, item?.location?.name, item?.location?.category, item?.location?.subcategory, item?.category]
        .filter(Boolean).join(' ').toLowerCase();
    return /khách sạn|khach san|hotel|hostel|resort|homestay|guest.?house|accommodation|nhà nghỉ|nha nghi|lưu trú|luu tru/.test(text);
}
function optimizeDayOrder(items, startLocation, startMinutes, routeEstimates, transportMode, focusLocationId) {
    const remaining = items.filter(item => !isAccommodationItem(item)).map((item, originalIndex) => ({ item, originalIndex }));
    const stays = items.filter(isAccommodationItem);
    const ordered = [];
    let previous = startLocation;
    let cursor = startMinutes;
    while (remaining.length) {
        let bestIndex = 0;
        let bestScore = Number.POSITIVE_INFINITY;
        remaining.forEach(({ item, originalIndex }, index) => {
            const location = item.location || item;
            const key = previous && location ? routeEstimateKey(previous, location) : null;
            const leg = key && routeEstimates[key] ? routeEstimates[key] : estimateTravel(haversineDistanceKm(previous, location), transportMode);
            const arrival = cursor + (leg.minutes ?? 0);
            const start = Math.max(arrival, getOpeningMinutes(location) ?? arrival);
            const duration = Math.max(15, Number(item.durationMinutes) || parseSuggestedDuration(location?.suggestedDuration) || 90);
            const closing = getClosingMinutes(location);
            let score = (leg.minutes ?? 0) + Math.max(0, start - arrival) * 0.15 + originalIndex * 0.001;
            if (closing != null && (start >= closing || start + duration > closing)) score += 1000 + Math.max(0, start + duration - closing);
            if (start + duration > DAY_END) score += 500 + start + duration - DAY_END;
            if (isMealItem(item, location)) score += mealTimingPenalty(start);
            const id = item.locationId || location?.id;
            if (focusLocationId != null && String(id) === String(focusLocationId) && ordered.length === 0) score -= 200;
            if (score < bestScore) { bestScore = score; bestIndex = index; }
        });
        const [chosen] = remaining.splice(bestIndex, 1);
        ordered.push(chosen.item);
        const location = chosen.item.location || chosen.item;
        const key = previous && location ? routeEstimateKey(previous, location) : null;
        const leg = key && routeEstimates[key] ? routeEstimates[key] : estimateTravel(haversineDistanceKm(previous, location), transportMode);
        const arrival = cursor + (leg.minutes ?? 0);
        cursor = Math.max(arrival, getOpeningMinutes(location) ?? arrival) + Math.max(15, Number(chosen.item.durationMinutes) || parseSuggestedDuration(location?.suggestedDuration) || 90);
        previous = location;
    }
    return [...ordered, ...stays];
}
function preserveDayOneOrder(items, selectedLocationOrder = []) {
    const orderIndex = new Map((Array.isArray(selectedLocationOrder) ? selectedLocationOrder : []).map((id, index) => [String(id), index]));
    const activities = items.filter(item => !isAccommodationItem(item));
    const stays = items.filter(isAccommodationItem);
    return [...activities].sort((a, b) => {
        const aId = a.locationId || a.location?.id;
        const bId = b.locationId || b.location?.id;
        const aIndex = orderIndex.get(String(aId)) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = orderIndex.get(String(bId)) ?? Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
    }).concat(stays);
}
function isMealItem(item, location) {
    const text = `${item?.locationName || ''} ${location?.name || ''} ${location?.category || ''} ${location?.subcategory || ''}`.toLowerCase();
    return /restaurant|food|cafe|coffee|quán ăn|quan an|nhà hàng|nha hang|ẩm thực|am thuc|ăn uống|an uong/.test(text);
}
function costCategoryForItem(item) {
    if (isAccommodationItem(item)) return 'accommodation';
    const text = `${item?.locationName || ''} ${item?.location?.name || ''} ${item?.location?.category || ''} ${item?.location?.subcategory || ''}`.toLowerCase();
    return /restaurant|food|cafe|coffee|quán ăn|quan an|nhà hàng|nha hang|ẩm thực|am thuc|ăn uống|an uong/.test(text) ? 'meals' : 'attractions';
}
function mealTimingPenalty(startMinutes) {
    const hour = startMinutes / 60;
    if ((hour >= 7 && hour <= 10) || (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 20)) return 0;
    if (hour < 7) return 60;
    if (hour < 11) return 30;
    if (hour < 17) return 60;
    return 180;
}
export function routeEstimateKey(from, to) {
    if (!validPoint(from) || !validPoint(to)) return null;
    return `${Number(from.latitude ?? from.lat).toFixed(6)},${Number(from.longitude ?? from.lng).toFixed(6)}>${Number(to.latitude ?? to.lat).toFixed(6)},${Number(to.longitude ?? to.lng).toFixed(6)}`;
}
function parseClock(value) { const [hours, minutes] = String(value || '08:00').split(':').map(Number); return (hours * 60) + minutes; }
function formatClock(value) { const minutes = Math.max(0, value); return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
function parseSuggestedDuration(value) { const match = String(value || '').match(/(\d+)/); return match ? Number(match[1]) * 60 : null; }
function getClosingMinutes(location) {
    const raw = location?.openingHours;
    const text = typeof raw === 'string' ? raw : '';
    const match = text.match(/(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?/i);
    if (match) return Number(match[1]) * 60 + Number(match[2] || 0);
    const name = `${location?.name || ''} ${location?.category || ''}`.toLowerCase();
    if (/nhà lưu niệm|bảo tàng|di tích|lăng|đền|chùa|museum|memorial|monument/.test(name)) return 17 * 60;
    return null;
}
function getOpeningMinutes(location) {
    const text = typeof location?.openingHours === 'string' ? location.openingHours : '';
    const match = text.match(/\b(\d{1,2}):(\d{2})\s*(?:-|–|to)\s*\d{1,2}:\d{2}/i);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
function warning(day, location, reason, severity, locationId = null) { return { day, location, locationId, reason, severity, suggestions: ['Bỏ điểm ít ưu tiên', 'Chuyển điểm sang ngày khác', 'Điều chỉnh giờ khởi hành'] }; }
function suggestLongTravelTransport(distanceKm, currentMode) {
    if (currentMode === 'flight' || currentMode === 'train') return currentMode;
    if (Number(distanceKm) >= 500) return 'flight';
    if (Number(distanceKm) >= 150) return 'train';
    return 'car';
}
function recommendStopsPerDay(days, limit) {
    const activityCounts = days.map(day => day.items.filter(item => !isAccommodationItem(item)).length);
    const total = activityCounts.reduce((sum, count) => sum + count, 0);
    return Math.min(limit, Math.max(1, Math.ceil(total / Math.max(1, days.length))));
}
function finiteCost(value) { if (value == null || value === '') return null; const amount = Number(value); return Number.isFinite(amount) && amount >= 0 ? amount : null; }
