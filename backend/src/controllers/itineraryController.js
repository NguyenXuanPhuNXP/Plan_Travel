import * as itineraryService from "../services/itineraryService.js";

export async function createItinerary(req, res) {
    const result = await itineraryService.createItinerary(req.user.id, req.body);
    res.status(201).json(result);
}

export async function getUserItineraries(req, res) {
    const result = await itineraryService.getUserItineraries(req.user.id);
    res.json(result);
}

export async function getItineraryById(req, res) {
    const result = await itineraryService.getItineraryById(req.params.id, req.user.id);
    if (!result) {
        throw { status: 404, message: "Không tìm thấy." };
    }

    res.json(result);
}

export async function updateItinerary(req, res) {
    const result = await itineraryService.updateItinerary(req.params.id, req.user.id, req.body);
    res.json(result);
}

export async function deleteItinerary(req, res) {
    await itineraryService.deleteItinerary(req.params.id, req.user.id);
    res.json({ message: "Đã xóa lịch trình." });
}

export async function addItem(req, res) {
    const result = await itineraryService.addItem(req.params.id, req.user.id, req.body);
    res.status(201).json(result);
}

export async function updateItem(req, res) {
    const result = await itineraryService.updateItem(req.params.id, req.params.itemId, req.user.id, req.body);
    res.json(result);
}

export async function removeItem(req, res) {
    await itineraryService.removeItem(req.params.id, req.params.itemId, req.user.id);
    res.json({ message: "Đã xóa địa điểm." });
}

export async function reorderItems(req, res) {
    await itineraryService.reorderItems(req.params.id, req.user.id, req.body.orderedItemIds);
    res.json({ message: "Đã sắp xếp lại." });
}

export async function getPackingCatalog(req, res) {
    const result = await itineraryService.getPackingCatalog();
    res.json(result);
}

export async function addPackingItem(req, res) {
    const result = await itineraryService.addPackingItem(req.params.id, req.user.id, req.body);
    res.status(201).json(result);
}

export async function updatePackingItem(req, res) {
    const result = await itineraryService.updatePackingItem(req.params.id, req.params.packingId, req.user.id, req.body);
    res.json(result);
}

export async function removePackingItem(req, res) {
    await itineraryService.removePackingItem(req.params.id, req.params.packingId, req.user.id);
    res.json({ message: "Đã xóa món đồ." });
}
