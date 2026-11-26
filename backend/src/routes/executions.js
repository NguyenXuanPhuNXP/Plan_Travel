import express from 'express';
import { authenticate, userOnly } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { executionService as service } from '../services/executionService.js';
import { verifyLocationToken } from '../services/jwtService.js';
import prisma from '../config/db.js';

const router = express.Router();
const uploadAuth = asyncHandler(async (req, res, next) => {
    let claims;
    try { claims = verifyLocationToken((req.headers.authorization || '').replace(/^Bearer /, '')); }
    catch { return res.status(401).json({ code: 'UPLOAD_TOKEN_EXPIRED', message: 'Hãy mở app để bật lại chia sẻ vị trí.' }); }
    if (claims.purpose !== 'location-upload' || claims.executionId !== req.params.id || !Number.isInteger(claims.sharingVersion)) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Token không thuộc phiên chia sẻ này.' });
    }
    const user = await prisma.users.findUnique({ where: { id: BigInt(claims.sub) }, select: { is_active: true, role: true } });
    if (!user?.is_active || user.role !== 'user') return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Tài khoản không hoạt động.' });
    req.user = { id: claims.sub };
    req.sharingVersion = claims.sharingVersion;
    next();
});
router.put('/:id/location-upload', uploadAuth, rateLimit({ limit: 10, windowMs: 60000 }), asyncHandler(async (req, res) => {
    await service.updateLocation(req.params.id, req.user.id, { ...req.body, sharingVersion: req.sharingVersion });
    res.json({ ok: true });
}));
router.post('/:id/location-stop', uploadAuth, asyncHandler(async (req, res) => {
    await service.stopUpload(req.params.id, req.user.id, req.sharingVersion);
    res.json({ ok: true });
}));
router.use(authenticate, userOnly);
router.patch('/:id/stops/:stopId', asyncHandler(async (req, res) => res.json(await service.updateStop(req.params.id, req.params.stopId, req.user.id, req.body))));
router.post('/:id/finish', asyncHandler(async (req, res) => res.json(await service.finish(req.params.id, req.user.id, req.body))));
router.put('/:id/location-sharing', asyncHandler(async (req, res) => res.json(await service.setSharing(req.params.id, req.user.id, req.body))));
router.put('/:id/location', rateLimit({ limit: 10, windowMs: 60000 }), asyncHandler(async (req, res) => {
    await service.updateLocation(req.params.id, req.user.id, req.body);
    res.json({ ok: true });
}));
export default router;
