import * as friendService from "../services/friendService.js";
import { createScheduleReminder } from "../services/notificationService.js";

export async function getFriends(req, res) {
    const result = await friendService.getFriends(req.user.id);
    res.json(result);
}

export async function searchUsers(req, res) {
    const result = await friendService.searchUsers(req.user.id, req.query.q);
    res.json(result);
}

export async function sendFriendRequest(req, res) {
    const result = await friendService.sendFriendRequest(req.user.id, req.body);
    res.json(result);
}

export async function acceptFriendRequest(req, res) {
    const result = await friendService.acceptFriendRequest(req.user.id, req.params.id);
    res.json(result);
}

export async function rejectFriendRequest(req, res) {
    const result = await friendService.rejectFriendRequest(req.user.id, req.params.id);
    res.json(result);
}

export async function removeFriend(req, res) {
    const result = await friendService.removeFriend(req.user.id, req.params.id);
    res.json(result);
}

export async function getNotifications(req, res) {
    const result = await friendService.getNotifications(req.user.id);
    res.json(result);
}

export async function markNotificationsRead(req, res) {
    await friendService.markNotificationsRead(req.user.id);
    res.json({ message: "OK" });
}

export async function createScheduleReminderNotification(req, res) {
    const { reminderKey, title, message } = req.body || {};
    if (!reminderKey || !title || !message) throw { status: 400, message: 'Thiếu nội dung nhắc lịch trình.' };
    const notification = await createScheduleReminder({ userId: req.user.id, reminderKey, title, message });
    res.status(201).json({ id: notification.id.toString() });
}
