import * as chatService from "../services/chatService.js";

export async function getMessages(req, res) {
    const friendId = req.params.friendId;
    const result = await chatService.getMessages(req.user.id, friendId);
    res.json(result);
}

export async function sendMessage(req, res) {
    const friendId = req.params.friendId;
    const { content } = req.body;
    if (!content || !content.trim()) {
        return res.status(400).json({ message: "Content is required" });
    }
    const result = await chatService.sendMessage(req.user.id, friendId, content);
    res.json(result);
}

export async function markAsRead(req, res) {
    const friendId = req.params.friendId;
    await chatService.markAsRead(req.user.id, friendId);
    res.json({ success: true });
}

export async function getRecentChats(req, res) {
    const result = await chatService.getRecentChats(req.user.id);
    res.json(result);
}
