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

    await prisma.itineraries.update({
        where: { id: BigInt(itineraryId) },
        data: {
            visibility: visibility || "public",
            share_token: shareToken,
            updated_at: new Date()
        }
    });

    return {
        shareToken,
        shareUrl: `/shared/${shareToken}`,
        visibility: visibility || "public"
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

    return serializeSharedItinerary(itinerary);
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
