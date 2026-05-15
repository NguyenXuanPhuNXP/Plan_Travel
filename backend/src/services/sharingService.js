import crypto from "crypto";
import prisma from "../config/db.js";

/**
 * Tạo/cập nhật share link cho itinerary
 */
export async function shareItinerary(itineraryId, userId, { visibility, permission }) {
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };
    if (itinerary.user_id !== BigInt(userId)) {
        throw { status: 403, message: "Chỉ chủ sở hữu mới có thể chia sẻ." };
    }

    // Generate share token if not exists
    let shareToken = itinerary.share_token;
    if (!shareToken) {
        shareToken = crypto.randomBytes(16).toString("hex");
    }

    const requestedVisibility = visibility || "public";
    // Store link-level edit capability in visibility without schema change.
    const effectiveVisibility = permission === "edit" && requestedVisibility !== "private"
        ? "public_edit"
        : requestedVisibility;

    await prisma.itineraries.update({
        where: { id: BigInt(itineraryId) },
        data: {
            visibility: effectiveVisibility,
            share_token: shareToken,
            updated_at: new Date()
        }
    });

    return {
        shareToken,
        shareUrl: `/shared/${shareToken}`,
        visibility: effectiveVisibility,
        permission: permission || "view"
    };
}

/**
 * Xem plan qua share token (public access)
 */
export async function getSharedItinerary(shareToken) {
    const itinerary = await prisma.itineraries.findFirst({
        where: { share_token: shareToken },
        include: {
            itinerary_items: {
                include: { locations: true },
                orderBy: { sort_order: "asc" }
            },
            users: {
                select: { id: true, full_name: true, avatar_url: true }
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
    if (itinerary.visibility === "private") return null;

    const serialized = serializeSharedItinerary(itinerary);
    // Public link can optionally carry edit permission.
    serialized.sharePermission = itinerary.visibility === "public_edit" ? "edit" : "view";
    return serialized;
}

/**
 * Thêm collaborator vào itinerary
 */
export async function addCollaborator(itineraryId, ownerId, { email, permission }) {
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };
    if (itinerary.user_id !== BigInt(ownerId)) {
        throw { status: 403, message: "Chỉ chủ sở hữu mới có thể mời." };
    }

    const targetUser = await prisma.users.findUnique({ where: { email } });
    if (!targetUser) throw { status: 404, message: "Không tìm thấy người dùng với email này." };
    if (targetUser.id === BigInt(ownerId)) {
        throw { status: 400, message: "Không thể mời chính mình." };
    }

    const existing = await prisma.itinerary_collaborators.findFirst({
        where: {
            itinerary_id: BigInt(itineraryId),
            user_id: targetUser.id
        }
    });

    if (existing) {
        // Update permission
        await prisma.itinerary_collaborators.update({
            where: { id: existing.id },
            data: { permission: permission || "view" }
        });
    } else {
        await prisma.itinerary_collaborators.create({
            data: {
                itinerary_id: BigInt(itineraryId),
                user_id: targetUser.id,
                permission: permission || "view"
            }
        });
    }

    // Ensure visibility is at least "shared"
    if (itinerary.visibility === "private") {
        await prisma.itineraries.update({
            where: { id: BigInt(itineraryId) },
            data: { visibility: "shared" }
        });
    }

    return { message: "Đã mời thành công.", email, permission: permission || "view" };
}

/**
 * Xóa collaborator
 */
export async function removeCollaborator(itineraryId, ownerId, targetUserId) {
    const itinerary = await prisma.itineraries.findUnique({
        where: { id: BigInt(itineraryId) }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };
    if (itinerary.user_id !== BigInt(ownerId)) {
        throw { status: 403, message: "Chỉ chủ sở hữu mới có thể xóa." };
    }

    await prisma.itinerary_collaborators.deleteMany({
        where: {
            itinerary_id: BigInt(itineraryId),
            user_id: BigInt(targetUserId)
        }
    });
}

/**
 * Lấy plans được chia sẻ với user
 */
export async function getSharedWithMe(userId) {
    const collaborations = await prisma.itinerary_collaborators.findMany({
        where: { user_id: BigInt(userId) },
        include: {
            itineraries: {
                include: {
                    users: {
                        select: { id: true, full_name: true, avatar_url: true }
                    },
                    itinerary_items: {
                        include: { locations: true },
                        orderBy: { sort_order: "asc" }
                    }
                }
            }
        }
    });

    return collaborations.map(c => ({
        permission: c.permission,
        invitedAt: c.invited_at,
        itinerary: serializeSharedItinerary(c.itineraries)
    }));
}

// ===== HELPERS =====

function serializeSharedItinerary(it) {
    return {
        id: it.id?.toString(),
        name: it.name,
        destination: it.destination,
        startLocation: it.start_location,
        endLocation: it.end_location,
        tripDate: it.trip_date,
        startDate: it.start_time,
        endDate: it.end_time,
        totalDays: it.total_days,
        budget: it.budget ? Number(it.budget) : null,
        description: it.description,
        status: it.status,
        visibility: it.visibility,
        shareToken: it.share_token,
        createdAt: it.created_at,
        owner: it.users ? {
            id: it.users.id?.toString(),
            name: it.users.full_name,
            avatar: it.users.avatar_url
        } : undefined,
        items: it.itinerary_items?.map(item => ({
            id: item.id?.toString(),
            sortOrder: item.sort_order,
            startTime: item.planned_start_time,
            endTime: item.planned_end_time,
            note: item.note,
            travelMinutes: item.travel_minutes,
            location: item.locations ? {
                id: item.locations.id?.toString(),
                name: item.locations.name,
                address: item.locations.address,
                latitude: Number(item.locations.latitude),
                longitude: Number(item.locations.longitude),
                category: item.locations.category,
                imageUrl: item.locations.image_url,
                estimatedCost: item.locations.estimated_cost,
                suggestedDuration: item.locations.suggested_duration
            } : null
        })) || [],
        collaborators: it.collaborators?.map(c => ({
            userId: c.user_id?.toString(),
            permission: c.permission,
            user: c.users ? {
                id: c.users.id?.toString(),
                name: c.users.full_name,
                email: c.users.email,
                avatar: c.users.avatar_url
            } : undefined
        })) || []
    };
}

/**
 * Lấy shared itinerary với permission từ collaborator
 */
export async function getSharedItineraryWithPermission(shareToken, userId) {
    const itinerary = await prisma.itineraries.findFirst({
        where: { share_token: shareToken },
        include: {
            itinerary_items: {
                include: { locations: true },
                orderBy: { sort_order: "asc" }
            },
            users: {
                select: { id: true, full_name: true, avatar_url: true }
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
    if (itinerary.visibility === "private") return null;

    const serialized = serializeSharedItinerary(itinerary);

    // Xác định permission
    if (userId) {
        if (itinerary.user_id === BigInt(userId)) {
            serialized.sharePermission = "edit";
        } else {
            const collab = itinerary.collaborators.find(
                c => c.user_id === BigInt(userId)
            );
            serialized.sharePermission = collab?.permission || (itinerary.visibility === "public_edit" ? "edit" : "view");
        }
    } else {
        serialized.sharePermission = itinerary.visibility === "public_edit" ? "edit" : "view";
    }

    return serialized;
}

/**
 * Cập nhật itinerary qua share token (cần permission edit)
 */
export async function updateSharedItinerary(shareToken, userId, data) {
    const itinerary = await prisma.itineraries.findFirst({
        where: { share_token: shareToken }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };
    if (itinerary.visibility === "private") throw { status: 403, message: "Lịch trình này là riêng tư." };

    // Kiểm tra quyền edit
    const hasEditPerm = await checkSharedEditPermission(itinerary, userId);
    if (!hasEditPerm) throw { status: 403, message: "Bạn không có quyền chỉnh sửa lịch trình này." };

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.startLocation !== undefined) updateData.start_location = data.startLocation;
    if (data.endLocation !== undefined) updateData.end_location = data.endLocation;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.start_time = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.end_time = data.endDate ? new Date(data.endDate) : null;
    if (data.budget !== undefined) updateData.budget = data.budget;
    updateData.updated_at = new Date();

    const updated = await prisma.itineraries.update({
        where: { id: itinerary.id },
        data: updateData,
        include: {
            itinerary_items: {
                include: { locations: true },
                orderBy: { sort_order: "asc" }
            },
            users: {
                select: { id: true, full_name: true, avatar_url: true }
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

    return serializeSharedItinerary(updated);
}

/**
 * Thêm item vào shared itinerary
 */
export async function addSharedItem(shareToken, userId, data) {
    const itinerary = await prisma.itineraries.findFirst({
        where: { share_token: shareToken }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };

    const hasEditPerm = await checkSharedEditPermission(itinerary, userId);
    if (!hasEditPerm) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };

    const maxOrder = await prisma.itinerary_items.aggregate({
        where: { itinerary_id: itinerary.id },
        _max: { sort_order: true }
    });

    const item = await prisma.itinerary_items.create({
        data: {
            itinerary_id: itinerary.id,
            location_id: data.locationId ? BigInt(data.locationId) : null,
            sort_order: (maxOrder._max.sort_order || 0) + 1,
            planned_start_time: data.startTime ? new Date(data.startTime) : null,
            planned_end_time: data.endTime ? new Date(data.endTime) : null,
            note: data.note || null
        },
        include: { locations: true }
    });

    return {
        id: item.id?.toString(),
        sortOrder: item.sort_order,
        note: item.note,
        location: item.locations ? {
            id: item.locations.id?.toString(),
            name: item.locations.name,
            address: item.locations.address
        } : null
    };
}

/**
 * Xóa item từ shared itinerary
 */
export async function removeSharedItem(shareToken, userId, itemId) {
    const itinerary = await prisma.itineraries.findFirst({
        where: { share_token: shareToken }
    });

    if (!itinerary) throw { status: 404, message: "Không tìm thấy lịch trình." };

    const hasEditPerm = await checkSharedEditPermission(itinerary, userId);
    if (!hasEditPerm) throw { status: 403, message: "Bạn không có quyền chỉnh sửa." };

    await prisma.itinerary_items.delete({
        where: { id: BigInt(itemId) }
    });
}

/**
 * Helper: kiểm tra quyền edit cho shared itinerary
 */
async function checkSharedEditPermission(itinerary, userId) {
    if (!userId) return false;
    if (itinerary.user_id === BigInt(userId)) return true;
    if (itinerary.visibility === "public_edit") return true;

    const collab = await prisma.itinerary_collaborators.findFirst({
        where: {
            itinerary_id: itinerary.id,
            user_id: BigInt(userId),
            permission: "edit"
        }
    });
    return !!collab;
}
