import * as friendService from "../services/friendService.js";

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
