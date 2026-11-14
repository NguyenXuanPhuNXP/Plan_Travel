import prisma from "../config/db.js";

function serializeMessage(msg) {
    return {
        id: msg.id.toString(),
        senderId: msg.sender_id.toString(),
        receiverId: msg.receiver_id.toString(),
        content: msg.content,
        isRead: msg.is_read,
        createdAt: msg.created_at
    };
}

function serializeItineraryMessage(msg) {
    return {
        id: msg.id.toString(),
        itineraryId: msg.itinerary_id.toString(),
        senderId: msg.sender_id.toString(),
        senderName: msg.sender?.full_name || "Thành viên",
        senderAvatar: msg.sender?.avatar_url || null,
        content: msg.content,
        createdAt: msg.created_at
    };
}

export async function getMessages(userId, friendId) {
    const user1 = BigInt(userId);
    const user2 = BigInt(friendId);

    const messages = await prisma.user_messages.findMany({
        where: {
            OR: [
                { sender_id: user1, receiver_id: user2 },
                { sender_id: user2, receiver_id: user1 }
            ]
        },
        orderBy: {
            created_at: "asc"
        },
        take: 100 // limit to last 100 messages for now
    });

    return messages.map(serializeMessage);
}

export async function sendMessage(userId, friendId, content) {
    const sender = BigInt(userId);
    const receiver = BigInt(friendId);

    // Verify they are friends first
    const friendRelation = await prisma.user_friends.findFirst({
        where: {
            OR: [
                { user_id: sender, friend_id: receiver, status: "accepted" },
                { user_id: receiver, friend_id: sender, status: "accepted" }
            ]
        }
    });

    if (!friendRelation) {
        throw { status: 403, message: "Bạn chỉ có thể gửi tin nhắn cho bạn bè." };
    }

    const message = await prisma.user_messages.create({
        data: {
            sender_id: sender,
            receiver_id: receiver,
            content: content
        }
    });

    return serializeMessage(message);
}

export async function markAsRead(userId, friendId) {
    const receiver = BigInt(userId);
    const sender = BigInt(friendId);

    await prisma.user_messages.updateMany({
        where: {
            sender_id: sender,
            receiver_id: receiver,
            is_read: false
        },
        data: {
            is_read: true
        }
    });
}

export async function getRecentChats(userId) {
    const currentUserId = BigInt(userId);
    
    const messages = await prisma.user_messages.findMany({
        where: {
            OR: [
                { sender_id: currentUserId },
                { receiver_id: currentUserId }
            ]
        },
        orderBy: {
            created_at: "desc"
        },
        include: {
            sender: true,
            receiver: true
        }
    });

    const recentChatsMap = new Map();

    for (const msg of messages) {
        const otherUser = msg.sender_id === currentUserId ? msg.receiver : msg.sender;
        const otherUserId = otherUser.id.toString();

        if (!recentChatsMap.has(otherUserId)) {
            let unreadCount = 0;
            if (msg.receiver_id === currentUserId && !msg.is_read) {
                unreadCount = 1;
            }

            recentChatsMap.set(otherUserId, {
                friendId: otherUserId,
                friendName: otherUser.full_name,
                friendAvatar: otherUser.avatar_url,
                lastMessage: msg.content,
                lastMessageAt: msg.created_at,
                isRead: msg.is_read,
                unreadCount: unreadCount,
                senderId: msg.sender_id.toString()
            });
        } else {
            // Count unread
            if (msg.receiver_id === currentUserId && !msg.is_read) {
                recentChatsMap.get(otherUserId).unreadCount += 1;
            }
        }
    }

    return Array.from(recentChatsMap.values());
}

/**
 * Lấy danh sách nhóm chat chuyến đi mà user tham gia (chủ sở hữu hoặc cộng tác viên)
 */
export async function getTripGroups(userId) {
    const currentUserId = BigInt(userId);

    const itineraries = await prisma.itineraries.findMany({
        where: {
            OR: [
                { user_id: currentUserId },
                {
                    collaborators: {
                        some: { user_id: currentUserId }
                    }
                }
            ]
        },
        include: {
            users: {
                select: { id: true, full_name: true, avatar_url: true }
            },
            collaborators: {
                include: {
                    users: {
                        select: { id: true, full_name: true, avatar_url: true }
                    }
                }
            },
            messages: {
                orderBy: { created_at: "desc" },
                take: 1,
                include: {
                    sender: {
                        select: { id: true, full_name: true }
                    }
                }
            }
        },
        orderBy: { updated_at: "desc" }
    });

    return itineraries.map((it) => {
        const owner = {
            id: it.users.id.toString(),
            name: it.users.full_name,
            avatar: it.users.avatar_url,
            isOwner: true
        };
        const collaborators = it.collaborators.map((c) => ({
            id: c.users.id.toString(),
            name: c.users.full_name,
            avatar: c.users.avatar_url,
            permission: c.permission,
            isOwner: false
        }));
        const members = [owner, ...collaborators];
        const lastMsg = it.messages?.[0];

        return {
            id: it.id.toString(),
            tripId: it.id.toString(),
            name: it.name,
            destination: it.destination,
            memberCount: members.length,
            members,
            lastMessage: lastMsg ? lastMsg.content : "Nhóm chat chuyến đi đã được tạo",
            lastMessageSender: lastMsg?.sender?.full_name || null,
            lastMessageAt: lastMsg ? lastMsg.created_at : it.created_at,
            isOwner: it.user_id === currentUserId
        };
    });
}

/**
 * Lấy lịch sử tin nhắn trong nhóm chat chuyến đi
 */
export async function getTripGroupMessages(itineraryId, userId) {
    const itId = BigInt(itineraryId);
    const uId = BigInt(userId);

    const it = await prisma.itineraries.findUnique({
        where: { id: itId },
        include: {
            collaborators: {
                where: { user_id: uId }
            }
        }
    });

    if (!it) {
        throw { status: 404, message: "Không tìm thấy chuyến đi." };
    }

    const isMember = it.user_id === uId || it.collaborators.length > 0;
    if (!isMember) {
        throw { status: 403, message: "Bạn không có quyền truy cập nhóm chat này." };
    }

    const messages = await prisma.itinerary_messages.findMany({
        where: { itinerary_id: itId },
        include: {
            sender: {
                select: { id: true, full_name: true, avatar_url: true }
            }
        },
        orderBy: { created_at: "asc" },
        take: 200
    });

    return messages.map(serializeItineraryMessage);
}

/**
 * Gửi tin nhắn vào nhóm chat chuyến đi
 */
export async function sendTripGroupMessage(itineraryId, userId, content) {
    if (!content || !content.trim()) {
        throw { status: 400, message: "Nội dung tin nhắn không được để trống." };
    }

    const itId = BigInt(itineraryId);
    const uId = BigInt(userId);

    const it = await prisma.itineraries.findUnique({
        where: { id: itId },
        include: {
            collaborators: {
                where: { user_id: uId }
            }
        }
    });

    if (!it) {
        throw { status: 404, message: "Không tìm thấy chuyến đi." };
    }

    const isMember = it.user_id === uId || it.collaborators.length > 0;
    if (!isMember) {
        throw { status: 403, message: "Bạn không có quyền gửi tin nhắn trong nhóm này." };
    }

    const created = await prisma.itinerary_messages.create({
        data: {
            itinerary_id: itId,
            sender_id: uId,
            content: content.trim()
        },
        include: {
            sender: {
                select: { id: true, full_name: true, avatar_url: true }
            }
        }
    });

    return serializeItineraryMessage(created);
}
