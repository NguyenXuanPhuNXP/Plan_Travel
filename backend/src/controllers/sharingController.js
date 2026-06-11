import * as sharingService from "../services/sharingService.js";

export async function getSharedItinerary(req, res) {
    const result = req.user?.id
        ? await sharingService.getSharedItineraryWithPermission(req.params.token, req.user.id)
        : await sharingService.getSharedItinerary(req.params.token);

    if (!result) {
        throw { status: 404, message: "Lịch trình không tồn tại hoặc là riêng tư." };
    }

    res.json(result);
}

export async function updateSharedItinerary(req, res) {
    const result = await sharingService.updateSharedItinerary(req.params.token, req.user.id, req.body);
    res.json(result);
}

export async function addSharedItem(req, res) {
    const result = await sharingService.addSharedItem(req.params.token, req.user.id, req.body);
    res.json(result);
}

export async function removeSharedItem(req, res) {
    await sharingService.removeSharedItem(req.params.token, req.user.id, req.params.itemId);
    res.json({ message: "Đã xóa." });
}

export async function shareItinerary(req, res) {
    const result = await sharingService.shareItinerary(req.params.id, req.user.id, req.body);
    res.json(result);
}

export async function addCollaborator(req, res) {
    const result = await sharingService.addCollaborator(req.params.id, req.user.id, req.body);
    res.json(result);
}

export async function removeCollaborator(req, res) {
    await sharingService.removeCollaborator(req.params.id, req.user.id, req.params.userId);
    res.json({ message: "Đã xóa." });
}

export async function getSharedWithMe(req, res) {
    const result = await sharingService.getSharedWithMe(req.user.id);
    res.json(result);
}
