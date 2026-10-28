import prisma from "../config/db.js";

/**
 * Lấy danh mục đồ cần chuẩn bị mặc định (dùng chung cho tất cả)
 */
export async function getPackingCatalog() {
    const items = await prisma.packing_items.findMany({
        orderBy: [{ category: "asc" }, { id: "asc" }]
    });
    return items.map(it => ({
        id: it.id.toString(),
        name: it.name,
        category: it.category,
        defaultQuantity: it.default_quantity,
        notes: it.notes
    }));
}

/**
 * Tạo itinerary mới kèm items và danh sách đồ mang theo
 */
export async function createItinerary(userId, data) {
    const items = Array.isArray(data.items) ? data.items : [];
    const packingItems = Array.isArray(data.packingItems) ? data.packingItems : [];
    const collaboratorIds = Array.isArray(data.collaboratorIds) ? data.collaboratorIds : [];

    const itinerary = await prisma.$transaction(async (tx) => {
        const created = await tx.itineraries.create({
            data: {
                ...buildItineraryData(userId, data),
                visibility: collaboratorIds.length > 0 ? "shared" : (data.visibility || "private")
            }
        });

        for (let index = 0; index < items.length; index++) {
            const itemData = buildItemData(created.id, items[index], index + 1);
            if (itemData) {
                await tx.itinerary_items.create({ data: itemData });
            }
        }

        // Lưu danh sách đồ cần mang theo
        for (const p of packingItems) {
            const name = p.itemName || p.name;
            if (name) {
                await tx.itinerary_packing_items.create({
                    data: {
                        itinerary_id: created.id,
                        item_name: String(name).trim(),
                        category: p.category || "other",
                        quantity: Math.max(1, Number(p.quantity) || 1),
                        notes: p.notes || null,
                        is_packed: Boolean(p.isPacked)
                    }
                });
            }
        }

        // Thêm bạn bè làm cộng tác viên
        for (const cId of collaboratorIds) {
            if (cId && String(cId) !== String(userId)) {
                await tx.itinerary_collaborators.create({
                    data: {
                        itinerary_id: created.id,
                        user_id: BigInt(cId),
                        permission: "edit"
                    }
                });
            }
        }

        // Khởi tạo tin nhắn chào mừng trong nhóm chat chuyến đi
        await tx.itinerary_messages.create({
            data: {
                itinerary_id: created.id,
                sender_id: BigInt(userId),
                content: `[Hệ thống] Nhóm chat cho chuyến đi "${created.name}" đã được tạo. Hãy cùng các thành viên thảo luận và lên lịch trình nhé!`
            }
        });

        return tx.itineraries.findUnique({
            where: { id: created.id },
            include: {
                itinerary_items: {
                    include: { locations: true, businesses: true },
                    orderBy: { sort_order: "asc" }
                },
                packing_items: {
                    orderBy: { id: "asc" }
                },
                collaborators: {
                    include: {
                        users: {
                            select: { id: true, full_name: true, email: true, avatar_url: true }
                        }
                    }
                }
            }
        });
    });

    return serializeItinerary(itinerary);
}

/**
 * Lấy tất cả itineraries của user (bao gồm cả shared)
 */
export async function getUserItineraries(userId) {
    const userIdBigInt = BigInt(userId);
    const itineraries = await prisma.itineraries.findMany({
        where: {
            OR: [
                { user_id: userIdBigInt },
                { collaborators: { some: { user_id: userIdBigInt } } }
            ]
        },
        include: {
            itinerary_items: {
                include: { locations: true, businesses: true },
                orderBy: { sort_order: "asc" }
            },
            packing_items: {
                orderBy: { id: "asc" }
            },
            users: {
                select: { id: true, full_name: true, email: true, avatar_url: true }
            },
            collaborators: {
                include: {
                    users: {
                        select: { id: true, full_name: true, email: true, avatar_url: true }
                    }
                },
                orderBy: { invited_at: "asc" }
            }
        },
        orderBy: { created_at: "desc" }
    });

    return itineraries.map(serializeItinerary);
}

/**
 * Lấy chi tiết 1 itinerary (kèm items, locations, packing_items)
 */
export async function getItineraryById(itineraryId, userId = null) {
    if (!/^\d+$/.test(String(itineraryId))) return null;
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) },
        include: {
            itinerary_items: {
                include: { locations: true, businesses: true },
                orderBy: { sort_order: "asc" }
            },
            packing_items: {
                orderBy: { id: "asc" }
            },
            users: {
                select: { id: true, full_name: true, email: true, avatar_url: true }
            },
            collaborators: {
                include: {
                    users: {
                        select: { id: true, full_name: true, email: true, avatar_url: true }
                    }
                }
            }
        }
    });

    if (!itinerary) return null;

    // Check access permission
    if (["private", "shared"].includes(itinerary.visibility)) {
        if (!userId) return null;
        const isOwner = itinerary.user_id === BigInt(userId);
        const isCollaborator = itinerary.collaborators.some(
            c => c.user_id === BigInt(userId)
        );
        if (!isOwner && !isCollaborator) return null;
    }

    return serializeItinerary(itinerary);
}

/**
 * Cập nhật itinerary (kèm chi phí, thông tin và packing checklist)
 */
export async function updateItinerary(itineraryId, userId, data) {
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };
    
    // Check ownership or edit permission
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.startLocation !== undefined) updateData.start_location = data.startLocation;
    if (data.endLocation !== undefined) updateData.end_location = data.endLocation;
    if (data.tripDate !== undefined) updateData.trip_date = data.tripDate ? new Date(data.tripDate) : null;
    if (data.startDate !== undefined) updateData.start_time = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.end_time = data.endDate ? new Date(data.endDate) : null;
    if (data.totalDays !== undefined) updateData.total_days = data.totalDays;
    if (data.preferences !== undefined) updateData.preferences = data.preferences;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    // Các trường mới: số người, phương tiện, chi tiết chi phí
    const currentTravelerCount = data.travelerCount !== undefined ? Math.max(1, Number(data.travelerCount) || 1) : itinerary.traveler_count;
    if (data.travelerCount !== undefined) updateData.traveler_count = currentTravelerCount;
    if (data.transportMode !== undefined) updateData.transport_mode = data.transportMode;
    if (data.costScope !== undefined) updateData.cost_scope = data.costScope;

    const costTransport = data.costTransport !== undefined ? toDecimalNumber(data.costTransport) : Number(itinerary.cost_transport || 0);
    const costMeals = data.costMeals !== undefined ? toDecimalNumber(data.costMeals) : Number(itinerary.cost_meals || 0);
    const costAttractions = data.costAttractions !== undefined ? toDecimalNumber(data.costAttractions) : Number(itinerary.cost_attractions || 0);
    const costAccommodation = data.costAccommodation !== undefined ? toDecimalNumber(data.costAccommodation) : Number(itinerary.cost_accommodation || 0);
    const costContingency = data.costContingency !== undefined ? toDecimalNumber(data.costContingency) : Number(itinerary.cost_contingency || 0);

    if (data.costTransport !== undefined) updateData.cost_transport = costTransport;
    if (data.costMeals !== undefined) updateData.cost_meals = costMeals;
    if (data.costAttractions !== undefined) updateData.cost_attractions = costAttractions;
    if (data.costAccommodation !== undefined) updateData.cost_accommodation = costAccommodation;
    if (data.costContingency !== undefined) updateData.cost_contingency = costContingency;

    const perPersonSum = costTransport + costMeals + costAttractions + costAccommodation + costContingency;
    const scope = (data.costScope || itinerary.cost_scope || 'PERSON').toUpperCase();
    const computedTotal = scope === 'GROUP' ? perPersonSum : (perPersonSum * currentTravelerCount);
    updateData.total_cost = computedTotal;

    if (data.budget !== undefined) {
        updateData.budget = Number(data.budget) || computedTotal;
    } else if (computedTotal > 0) {
        updateData.budget = computedTotal;
    }

    updateData.updated_at = new Date();

    const updated = await prisma.itineraries.update({
        where: { id: BigInt(itineraryId) },
        data: updateData,
        include: {
            itinerary_items: {
                include: { locations: true, businesses: true },
                orderBy: { sort_order: "asc" }
            },
            packing_items: {
                orderBy: { id: "asc" }
            }
        }
    });

    return serializeItinerary(updated);
}

/**
 * Xóa itinerary
 */
export async function deleteItinerary(itineraryId, userId) {
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };
    if (itinerary.user_id !== BigInt(userId)) {
        throw { status: 403, message: "Bạn không có quyền xóa." };
    }

    await prisma.itineraries.delete({
        where: { id: BigInt(itineraryId) }
    });
}

/**
 * Thêm item vào itinerary
 */
export async function addItem(itineraryId, userId, data) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };

    // Get max sort_order
    const maxOrder = await prisma.itinerary_items.aggregate({
        where: { itinerary_id: BigInt(itineraryId) },
        _max: { sort_order: true }
    });

    const nextOrder = (maxOrder._max.sort_order || 0) + 1;

    const item = await prisma.itinerary_items.create({
        data: {
            itinerary_id: BigInt(itineraryId),
            location_id: toBigIntId(data.locationId),
            business_id: toBigIntId(data.businessId),
            custom_name: data.customName || null,
            sort_order: nextOrder,
            planned_start_time: data.startTime ? new Date(data.startTime) : null,
            planned_end_time: data.endTime ? new Date(data.endTime) : null,
            duration_minutes: toPositiveInt(data.durationMinutes),
            travel_minutes: toPositiveInt(data.travelMinutes),
            travel_distance_km: data.travelDistanceKm || null,
            note: data.note || null
        },
        include: { locations: true }
    });

    // Update itinerary timestamp
    await prisma.itineraries.update({
        where: { id: BigInt(itineraryId) },
        data: { updated_at: new Date() }
    });

    return serializeItem(item);
}

/**
 * Cập nhật item
 */
export async function updateItem(itineraryId, itemId, userId, data) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };
    const belongsToPlan = await prisma.itinerary_items.findFirst({ where: { id: BigInt(itemId), itinerary_id: BigInt(itineraryId) } });
    if (!belongsToPlan) throw { status: 404, message: 'Điểm dừng không thuộc kế hoạch này.' };

    const updateData = {};
    if (data.customName !== undefined) updateData.custom_name = data.customName;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.startTime !== undefined) updateData.planned_start_time = data.startTime ? new Date(data.startTime) : null;
    if (data.endTime !== undefined) updateData.planned_end_time = data.endTime ? new Date(data.endTime) : null;
    if (data.durationMinutes !== undefined) updateData.duration_minutes = toPositiveInt(data.durationMinutes);
    if (data.travelMinutes !== undefined) updateData.travel_minutes = toPositiveInt(data.travelMinutes);

    const item = await prisma.itinerary_items.update({
        where: { id: BigInt(itemId) },
        data: updateData,
        include: { locations: true }
    });

    return serializeItem(item);
}

/**
 * Xóa item
 */
export async function removeItem(itineraryId, itemId, userId) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };
    const belongsToPlan = await prisma.itinerary_items.findFirst({ where: { id: BigInt(itemId), itinerary_id: BigInt(itineraryId) } });
    if (!belongsToPlan) throw { status: 404, message: 'Điểm dừng không thuộc kế hoạch này.' };

    await prisma.itinerary_items.delete({
        where: { id: BigInt(itemId) }
    });

    // Re-order remaining items
    const remaining = await prisma.itinerary_items.findMany({
        where: { itinerary_id: BigInt(itineraryId) },
        orderBy: { sort_order: "asc" }
    });

    for (let i = 0; i < remaining.length; i++) {
        await prisma.itinerary_items.update({
            where: { id: remaining[i].id },
            data: { sort_order: i + 1 }
        });
    }
}

/**
 * Sắp xếp lại thứ tự items
 */
export async function reorderItems(itineraryId, userId, orderedItemIds) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };
    const planItems = await prisma.itinerary_items.findMany({ where: { itinerary_id: BigInt(itineraryId) }, select: { id: true } });
    const allowed = new Set(planItems.map(item => String(item.id)));
    if (!Array.isArray(orderedItemIds) || orderedItemIds.length !== allowed.size || new Set(orderedItemIds.map(String)).size !== allowed.size || orderedItemIds.some(itemId => !allowed.has(String(itemId)))) {
        throw { status: 400, message: 'Thứ tự điểm dừng không hợp lệ hoặc có điểm thuộc kế hoạch khác.' };
    }

    await prisma.$transaction(async (tx) => {
        for (let i = 0; i < orderedItemIds.length; i++) {
            await tx.itinerary_items.update({
                where: { id: BigInt(orderedItemIds[i]) },
                data: { sort_order: 10000 + i }
            });
        }
        for (let i = 0; i < orderedItemIds.length; i++) {
            await tx.itinerary_items.update({
                where: { id: BigInt(orderedItemIds[i]) },
                data: { sort_order: i + 1 }
            });
        }
    });
}

// ===== PACKING ITEMS SERVICE =====

export async function addPackingItem(itineraryId, userId, data) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };

    const item = await prisma.itinerary_packing_items.create({
        data: {
            itinerary_id: BigInt(itineraryId),
            item_name: String(data.itemName || data.name || "").trim(),
            category: data.category || "other",
            quantity: Math.max(1, Number(data.quantity) || 1),
            notes: data.notes || null,
            is_packed: Boolean(data.isPacked)
        }
    });

    return {
        id: item.id.toString(),
        itineraryId: item.itinerary_id.toString(),
        itemName: item.item_name,
        category: item.category,
        quantity: item.quantity,
        notes: item.notes,
        isPacked: item.is_packed
    };
}

export async function updatePackingItem(itineraryId, packingItemId, userId, data) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };
    const belongsToPlan = await prisma.itinerary_packing_items.findFirst({ where: { id: BigInt(packingItemId), itinerary_id: BigInt(itineraryId) } });
    if (!belongsToPlan) throw { status: 404, message: 'Vật dụng không thuộc kế hoạch này.' };

    const updateData = {};
    if (data.isPacked !== undefined) updateData.is_packed = Boolean(data.isPacked);
    if (data.quantity !== undefined) updateData.quantity = Math.max(1, Number(data.quantity) || 1);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.itemName !== undefined) updateData.item_name = data.itemName;
    if (data.category !== undefined) updateData.category = data.category;

    const updated = await prisma.itinerary_packing_items.update({
        where: { id: BigInt(packingItemId) },
        data: updateData
    });

    return {
        id: updated.id.toString(),
        itineraryId: updated.itinerary_id.toString(),
        itemName: updated.item_name,
        category: updated.category,
        quantity: updated.quantity,
        notes: updated.notes,
        isPacked: updated.is_packed
    };
}

export async function removePackingItem(itineraryId, packingItemId, userId) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };
    const belongsToPlan = await prisma.itinerary_packing_items.findFirst({ where: { id: BigInt(packingItemId), itinerary_id: BigInt(itineraryId) } });
    if (!belongsToPlan) throw { status: 404, message: 'Vật dụng không thuộc kế hoạch này.' };

    await prisma.itinerary_packing_items.delete({
        where: { id: BigInt(packingItemId) }
    });
}

// ===== HELPERS =====

function toDecimalNumber(val) {
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? num : 0;
}

function buildItineraryData(userId, data) {
    const travelerCount = Math.max(1, Number(data.travelerCount) || 1);
    const costTransport = toDecimalNumber(data.costTransport);
    const costMeals = toDecimalNumber(data.costMeals);
    const costAttractions = toDecimalNumber(data.costAttractions);
    const costAccommodation = toDecimalNumber(data.costAccommodation);
    const costContingency = toDecimalNumber(data.costContingency);
    const costScope = String(data.costScope || 'PERSON').toUpperCase() === 'GROUP' ? 'GROUP' : 'PERSON';

    // Tổng chi phí = theo người * số người (nếu scope là PERSON), hoặc tổng nếu scope là GROUP
    const perPersonSum = costTransport + costMeals + costAttractions + costAccommodation + costContingency;
    const computedTotal = costScope === 'GROUP' ? perPersonSum : (perPersonSum * travelerCount);
    
    const rawBudget = Number(data.budget);
    const finalBudget = Number.isFinite(rawBudget) && rawBudget > 0 ? rawBudget : (computedTotal > 0 ? computedTotal : null);

    return {
        user_id: BigInt(userId),
        name: data.name || data.title,
        destination: data.destination || null,
        start_location: data.startLocation || null,
        end_location: data.endLocation || null,
        trip_date: data.tripDate ? new Date(data.tripDate) : null,
        start_time: data.startDate ? new Date(data.startDate) : null,
        end_time: data.endDate ? new Date(data.endDate) : null,
        total_days: data.totalDays || null,
        traveler_count: travelerCount,
        transport_mode: data.transportMode || null,
        cost_scope: costScope,
        cost_transport: costTransport,
        cost_meals: costMeals,
        cost_attractions: costAttractions,
        cost_accommodation: costAccommodation,
        cost_contingency: costContingency,
        total_cost: computedTotal,
        budget: finalBudget,
        preferences: data.preferences || null,
        description: data.description || data.notes || null,
        status: data.status || "draft",
        visibility: data.visibility || "private"
    };
}

function buildItemData(itineraryId, item, sortOrder) {
    const locationId = toBigIntId(item?.locationId);
    const businessId = toBigIntId(item?.businessId);
    const customName = item?.customName || item?.name || item?.title || null;

    if (!locationId && !businessId && !customName) return null;

    return {
        itinerary_id: itineraryId,
        location_id: locationId,
        business_id: businessId,
        custom_name: customName,
        sort_order: sortOrder,
        planned_start_time: item.startTime ? new Date(item.startTime) : null,
        planned_end_time: item.endTime ? new Date(item.endTime) : null,
        duration_minutes: toPositiveInt(item.durationMinutes),
        travel_minutes: toPositiveInt(item.travelMinutes ?? item.travelMinutesToNext),
        travel_distance_km: item.travelDistanceKm || null,
        note: item.note || null
    };
}

function toBigIntId(value) {
    const text = String(value ?? "").trim();
    return /^\d+$/.test(text) ? BigInt(text) : null;
}

function toPositiveInt(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : null;
}

async function checkEditPermission(itineraryId, userId) {
    if (!/^\d+$/.test(String(itineraryId))) return false;
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) },
        include: { collaborators: true }
    });

    if (!itinerary) return false;
    if (itinerary.user_id === BigInt(userId)) return true;

    const collab = itinerary.collaborators.find(
        c => c.user_id === BigInt(userId) && c.permission === "edit"
    );
    return !!collab;
}

function serializeItinerary(it) {
    const rawTotalCost = Number(it.total_cost || 0);
    const rawBudget = it.budget ? Number(it.budget) : 0;
    const resolvedTotalCost = it.total_cost != null ? rawTotalCost : rawBudget;
    const items = it.itinerary_items?.map(serializeItem) || [];

    return {
        id: it.id?.toString(),
        userId: it.user_id?.toString(),
        name: it.name,
        title: it.name,
        destination: it.destination,
        startLocation: it.start_location,
        endLocation: it.end_location,
        tripDate: it.trip_date,
        startDate: it.start_time,
        endDate: it.end_time,
        totalDays: it.total_days,
        budget: it.budget != null ? Number(it.budget) : (resolvedTotalCost || 0),
        travelerCount: it.traveler_count ?? 1,
        transportMode: it.transport_mode ?? null,
        costScope: it.cost_scope ?? "PERSON",
        costTransport: it.cost_transport ? Number(it.cost_transport) : 0,
        costMeals: it.cost_meals ? Number(it.cost_meals) : 0,
        costAttractions: it.cost_attractions ? Number(it.cost_attractions) : 0,
        costAccommodation: it.cost_accommodation ? Number(it.cost_accommodation) : 0,
        costContingency: it.cost_contingency ? Number(it.cost_contingency) : 0,
        totalCost: resolvedTotalCost,
        preferences: it.preferences,
        description: it.description,
        status: it.status,
        visibility: it.visibility,
        shareToken: it.share_token,
        createdAt: it.created_at,
        updatedAt: it.updated_at,
        owner: it.users ? {
            id: it.users.id?.toString(),
            name: it.users.full_name,
            email: it.users.email,
            avatar: it.users.avatar_url
        } : undefined,
        items,
        locations: items,
        packingItems: it.packing_items?.map(p => ({
            id: p.id?.toString(),
            itemName: p.item_name,
            category: p.category,
            quantity: p.quantity,
            notes: p.notes,
            isPacked: p.is_packed
        })) || [],
        collaborators: it.collaborators?.map(c => ({
            userId: c.user_id?.toString(),
            permission: c.permission,
            invitedAt: c.invited_at,
            acceptedAt: c.accepted_at,
            user: c.users ? {
                id: c.users.id?.toString(),
                name: c.users.full_name,
                email: c.users.email,
                avatar: c.users.avatar_url
            } : undefined
        })) || []
    };
}

function serializeItem(item) {
    const loc = item.locations || item.businesses;
    return {
        id: item.id?.toString(),
        itineraryId: item.itinerary_id?.toString(),
        locationId: item.location_id?.toString(),
        businessId: item.business_id?.toString(),
        customName: item.custom_name,
        sortOrder: item.sort_order,
        startTime: item.planned_start_time,
        endTime: item.planned_end_time,
        durationMinutes: item.duration_minutes,
        travelMinutes: item.travel_minutes,
        travelDistanceKm: item.travel_distance_km ? Number(item.travel_distance_km) : null,
        note: item.note,
        createdAt: item.created_at,
        location: loc ? {
            id: loc.id?.toString(),
            name: loc.name,
            address: loc.address,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            category: loc.category,
            imageUrl: loc.image_url,
            estimatedCost: loc.estimated_cost,
            suggestedDuration: loc.suggested_duration,
            rating: loc.rating ? Number(loc.rating) : null,
            tags: loc.tags
        } : (item.custom_name ? {
            id: `custom_${item.id}`,
            name: item.custom_name,
            address: '',
            latitude: null,
            longitude: null,
            category: 'custom',
            imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
            estimatedCost: 0,
            suggestedDuration: item.duration_minutes ? `${item.duration_minutes} phút` : null,
            rating: null,
            tags: null
        } : null)
    };
}
