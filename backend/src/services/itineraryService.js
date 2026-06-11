import prisma from "../config/db.js";

/**
 * Tạo itinerary mới
 */
export async function createItinerary(userId, data) {
    const items = Array.isArray(data.items) ? data.items : [];

    const itinerary = await prisma.$transaction(async (tx) => {
        const created = await tx.itineraries.create({
            data: buildItineraryData(userId, data)
        });

        for (let index = 0; index < items.length; index++) {
            const itemData = buildItemData(created.id, items[index], index + 1);
            if (itemData) {
                await tx.itinerary_items.create({ data: itemData });
            }
        }

        return tx.itineraries.findUnique({
            where: { id: created.id },
            include: {
                itinerary_items: {
                    include: { locations: true, businesses: true },
                    orderBy: { sort_order: "asc" }
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
 * Lấy chi tiết 1 itinerary (kèm items + locations)
 */
export async function getItineraryById(itineraryId, userId = null) {
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) },
        include: {
            itinerary_items: {
                include: { locations: true, businesses: true },
                orderBy: { sort_order: "asc" }
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
    if (itinerary.visibility === "private") {
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
 * Cập nhật itinerary
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
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.preferences !== undefined) updateData.preferences = data.preferences;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    updateData.updated_at = new Date();

    const updated = await prisma.itineraries.update({
        where: { id: BigInt(itineraryId) },
        data: updateData,
        include: {
            itinerary_items: {
                include: { locations: true, businesses: true },
                orderBy: { sort_order: "asc" }
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
            location_id: data.locationId ? BigInt(data.locationId) : null,
            business_id: data.businessId ? BigInt(data.businessId) : null,
            sort_order: nextOrder,
            planned_start_time: data.startTime ? new Date(data.startTime) : null,
            planned_end_time: data.endTime ? new Date(data.endTime) : null,
            travel_minutes: data.travelMinutes || null,
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

    const updateData = {};
    if (data.note !== undefined) updateData.note = data.note;
    if (data.startTime !== undefined) updateData.planned_start_time = data.startTime ? new Date(data.startTime) : null;
    if (data.endTime !== undefined) updateData.planned_end_time = data.endTime ? new Date(data.endTime) : null;
    if (data.travelMinutes !== undefined) updateData.travel_minutes = data.travelMinutes;

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
 * Reorder items
 */
export async function reorderItems(itineraryId, userId, orderedItemIds) {
    const canEdit = await checkEditPermission(itineraryId, userId);
    if (!canEdit) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };

    // Use a transaction with temporary high sort_order to avoid unique constraint
    await prisma.$transaction(async (tx) => {
        // First, set all to high temporary values
        for (let i = 0; i < orderedItemIds.length; i++) {
            await tx.itinerary_items.update({
                where: { id: BigInt(orderedItemIds[i]) },
                data: { sort_order: 10000 + i }
            });
        }
        // Then set to final values
        for (let i = 0; i < orderedItemIds.length; i++) {
            await tx.itinerary_items.update({
                where: { id: BigInt(orderedItemIds[i]) },
                data: { sort_order: i + 1 }
            });
        }
    });
}

// ===== HELPERS =====

function buildItineraryData(userId, data) {
    return {
        user_id: BigInt(userId),
        name: data.name,
        destination: data.destination || null,
        start_location: data.startLocation || null,
        end_location: data.endLocation || null,
        trip_date: data.tripDate ? new Date(data.tripDate) : null,
        start_time: data.startDate ? new Date(data.startDate) : null,
        end_time: data.endDate ? new Date(data.endDate) : null,
        total_days: data.totalDays || null,
        budget: data.budget || null,
        preferences: data.preferences || null,
        description: data.description || null,
        status: "draft",
        visibility: "private"
    };
}

function buildItemData(itineraryId, item, sortOrder) {
    const locationId = toBigIntId(item?.locationId);
    const businessId = toBigIntId(item?.businessId);

    if (!locationId && !businessId) return null;

    return {
        itinerary_id: itineraryId,
        location_id: locationId,
        business_id: businessId,
        sort_order: sortOrder,
        planned_start_time: item.startTime ? new Date(item.startTime) : null,
        planned_end_time: item.endTime ? new Date(item.endTime) : null,
        travel_minutes: toPositiveInt(item.travelMinutes),
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
    return {
        id: it.id?.toString(),
        userId: it.user_id?.toString(),
        name: it.name,
        destination: it.destination,
        startLocation: it.start_location,
        endLocation: it.end_location,
        tripDate: it.trip_date,
        startDate: it.start_time,
        endDate: it.end_time,
        totalDays: it.total_days,
        budget: it.budget ? Number(it.budget) : null,
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
        items: it.itinerary_items?.map(serializeItem) || [],
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
        sortOrder: item.sort_order,
        startTime: item.planned_start_time,
        endTime: item.planned_end_time,
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
        } : null
    };
}
