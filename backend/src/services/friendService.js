import prisma from "../config/db.js";

function serializeUser(user, isFriend = false, requestStatus = null) {
    return {
        id: user.id?.toString(),
        fullName: user.full_name,
        name: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        avatar: user.avatar_url,
        isFriend,
        requestStatus
    };
}

export async function getFriends(userId) {
    const friendRelations = await prisma.user_friends.findMany({
        where: {
            OR: [
                { user_id: BigInt(userId), status: "accepted" },
                { friend_id: BigInt(userId), status: "accepted" }
            ]
        },
        include: {
            user: true,
            friend: true
        }
    });

    return friendRelations.map(rel => {
        const isUserRequester = rel.user_id === BigInt(userId);
        const friendUser = isUserRequester ? rel.friend : rel.user;
        return serializeUser(friendUser, true, "accepted");
    });
}

export async function searchUsers(userId, query) {
    const search = String(query || "").trim();
    if (search.length < 2) return [];

    const likeQuery = `%${search.toLowerCase()}%`;
    const users = await prisma.$queryRaw`
        SELECT id, full_name, email, avatar_url
        FROM users
        WHERE id <> ${BigInt(userId)}
          AND is_active = 1
          AND (LOWER(email) LIKE ${likeQuery} OR LOWER(full_name) LIKE ${likeQuery})
        LIMIT 12
    `;

    const relations = await prisma.user_friends.findMany({
        where: {
            OR: [
                { user_id: BigInt(userId) },
                { friend_id: BigInt(userId) }
            ]
        }
    });

    return users.map(u => {
        const rel = relations.find(r => r.user_id === u.id || r.friend_id === u.id);
        let status = null;
        if (rel) {
            if (rel.status === "accepted") status = "accepted";
            else if (rel.user_id === BigInt(userId)) status = "sent";
            else status = "received";
        }
        return serializeUser(u, status === "accepted", status);
    });
}

export async function sendFriendRequest(userId, { email, userId: targetUserId }) {
    const requesterId = BigInt(userId);
    const target = targetUserId
        ? await prisma.users.findUnique({ where: { id: BigInt(targetUserId) } })
        : await prisma.users.findUnique({ where: { email: String(email || "").trim().toLowerCase() } });

    if (!target || !target.is_active) {
        throw { status: 404, message: "Không tìm thấy người dùng này." };
    }

    if (target.id === requesterId) {
        throw { status: 400, message: "Không thể tự kết bạn với chính mình." };
    }

    // Check existing relation
    const existing = await prisma.user_friends.findFirst({
        where: {
            OR: [
                { user_id: requesterId, friend_id: target.id },
                { user_id: target.id, friend_id: requesterId }
            ]
        }
    });

    if (existing) {
        if (existing.status === "accepted") throw { status: 400, message: "Đã là bạn bè." };
        if (existing.user_id === requesterId) throw { status: 400, message: "Đã gửi lời mời trước đó." };
        // If they sent us a request, accept it
        return acceptFriendRequest(userId, existing.user_id.toString());
    }

    await prisma.user_friends.create({
        data: {
            user_id: requesterId,
            friend_id: target.id,
            status: "pending"
        }
    });

    const requester = await prisma.users.findUnique({ where: { id: requesterId } });

    // Create notification
    await prisma.user_notifications.create({
        data: {
            user_id: target.id,
            type: "friend_request",
            title: "Lời mời kết bạn",
            message: `${requester.full_name} đã gửi cho bạn một lời mời kết bạn.`
        }
    });

    return { message: "Đã gửi lời mời kết bạn." };
}

export async function acceptFriendRequest(userId, friendId) {
    const targetId = BigInt(friendId);
    const receiverId = BigInt(userId);

    const relation = await prisma.user_friends.findFirst({
        where: { user_id: targetId, friend_id: receiverId, status: "pending" }
    });

    if (!relation) throw { status: 404, message: "Không tìm thấy lời mời." };

    await prisma.user_friends.update({
        where: { id: relation.id },
        data: { status: "accepted" }
    });

    const receiver = await prisma.users.findUnique({ where: { id: receiverId } });

    // Create notification
    await prisma.user_notifications.create({
        data: {
            user_id: targetId,
            type: "friend_accept",
            title: "Đã chấp nhận kết bạn",
            message: `${receiver.full_name} đã chấp nhận lời mời kết bạn của bạn.`
        }
    });

    return getFriends(userId);
}

export async function rejectFriendRequest(userId, friendId) {
    const targetId = BigInt(friendId);
    const receiverId = BigInt(userId);

    await prisma.user_friends.deleteMany({
        where: { user_id: targetId, friend_id: receiverId, status: "pending" }
    });

    return { message: "Đã từ chối." };
}

export async function removeFriend(userId, friendId) {
    const requesterId = BigInt(userId);
    const targetId = BigInt(friendId);

    await prisma.user_friends.deleteMany({
        where: {
            OR: [
                { user_id: requesterId, friend_id: targetId },
                { user_id: targetId, friend_id: requesterId }
            ]
        }
    });

    return getFriends(userId);
}

export async function getNotifications(userId) {
    // Get db notifications
    const dbNotifs = await prisma.user_notifications.findMany({
        where: { user_id: BigInt(userId) },
        orderBy: { created_at: "desc" },
        take: 30
    });

    // Also get pending friend requests to show in UI
    const pendingRequests = await prisma.user_friends.findMany({
        where: { friend_id: BigInt(userId), status: "pending" },
        include: { user: true },
        orderBy: { created_at: "desc" }
    });

    return {
        notifications: dbNotifs.map(n => ({
            id: n.id.toString(),
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: n.is_read,
            createdAt: n.created_at
        })),
        friendRequests: pendingRequests.map(r => ({
            id: r.user.id.toString(),
            user: serializeUser(r.user),
            createdAt: r.created_at
        }))
    };
}

export async function markNotificationsRead(userId) {
    await prisma.user_notifications.updateMany({
        where: { user_id: BigInt(userId), is_read: false },
        data: { is_read: true }
    });
}
