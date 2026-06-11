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
    
    // Get latest message for each friend
    // Since Prisma doesn't have a simple DISTINCT ON, we'll do this in raw SQL or JS.
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
