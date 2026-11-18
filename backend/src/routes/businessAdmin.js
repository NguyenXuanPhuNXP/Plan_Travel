import express from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { idOf, applicationView, publicBusiness, readEvidence, applyApproval, analyzeApplication } from '../services/businessService.js';

const router = express.Router();
router.use(authenticate, adminOnly);
const fail = (status, message) => { throw { status, message }; };
const include = { evidence: true, events: { orderBy: { created_at: 'asc' } } };

router.get('/stats', asyncHandler(async (_req, res) => {
  const [total, pending, active, checkins, reviews] = await Promise.all([
    prisma.businesses.count(), prisma.business_applications.count({ where: { status: 'pending' } }),
    prisma.businesses.count({ where: { is_active: true } }), prisma.visit_history.count({ where: { visit_key: { not: null } } }),
    prisma.reviews.count({ where: { business_id: { not: null } } })
  ]);
  res.json({ total, pending, active, checkins, reviews });
}));
router.get('/applications', asyncHandler(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const rows = await prisma.business_applications.findMany({ where: status ? { status } : {}, orderBy: { created_at: 'desc' }, take: 100, include });
  res.json(rows.map(applicationView));
}));
router.get('/applications/:id', asyncHandler(async (req, res) => {
  const app = await prisma.business_applications.findUnique({ where: { id: idOf(req.params.id) }, include });
  if (!app) fail(404, 'Không tìm thấy hồ sơ.');
  res.json(applicationView(app));
}));
router.get('/applications/:id/evidence/:evidenceId', asyncHandler(async (req, res) => {
  const e = await prisma.business_evidence.findUnique({ where: { id: idOf(req.params.evidenceId) } });
  if (!e || e.application_id !== idOf(req.params.id)) fail(404, 'Không tìm thấy bằng chứng.');
  res.set({ 'Content-Type': e.mime_type, 'Content-Disposition': `attachment; filename="evidence-${e.id}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.send(await readEvidence(e.storage_key));
}));
router.post('/applications/:id/analyze', asyncHandler(async (req, res) => res.json(await analyzeApplication(idOf(req.params.id)))));
router.post('/applications/:id/decision', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id), actorId = idOf(req.user.id), action = req.body.action;
  if (!['approve', 'reject', 'needs_info'].includes(action)) fail(400, 'Quyết định không hợp lệ.');
  const reason = String(req.body.reason || '').trim();
  if (action !== 'approve' && !reason) fail(400, 'Hãy ghi lý do.');
  if (reason.length > 2000) fail(400, 'Lý do quá dài.');
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM business_applications WHERE id = ${id} FOR UPDATE`;
    const app = await tx.business_applications.findUnique({ where: { id } });
    if (!app) fail(404, 'Không tìm thấy hồ sơ.');
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_info';
    if (app.status === status) return app;
    if (app.status !== 'pending') fail(409, 'Hồ sơ không còn chờ duyệt.');
    let ids = {};
    if (action === 'approve') ids = await applyApproval(tx, app);
    if (action === 'approve' && app.kind !== 'change') {
      await tx.users.updateMany({ where: { id: app.applicant_id, role: 'user' }, data: { role: 'business' } });
    }
    const updated = await tx.business_applications.update({ where: { id }, data: { status, decision_reason: reason || null,
      ...(ids.businessId ? { business_id: ids.businessId, location_id: ids.locationId } : {}) } });
    await tx.business_application_events.create({ data: { application_id: id, actor_id: actorId, action, reason: reason || null } });
    await tx.user_notifications.create({ data: { user_id: app.applicant_id, type: 'business_application',
      title: action === 'approve' ? 'Hồ sơ Business đã được duyệt' : action === 'reject' ? 'Hồ sơ Business bị từ chối' : 'Hồ sơ Business cần bổ sung',
      message: reason || 'Bạn đã được cấp quyền quản lý cơ sở. Mở Quản lý cơ sở để tiếp tục.' } });
    return updated;
  }, { isolationLevel: 'Serializable', timeout: 15000 });
  res.json(applicationView(result));
}));
router.get('/businesses', asyncHandler(async (_req, res) => {
  const rows = await prisma.businesses.findMany({ include: { managers: { include: { user: { select: { id: true, full_name: true, email: true } } } } }, orderBy: { created_at: 'desc' }, take: 200 });
  res.json(rows.map(b => ({ ...publicBusiness(b), managers: b.managers.map(m => ({ id: String(m.user_id), name: m.user.full_name, email: m.user.email, status: m.status })) })));
}));
router.post('/businesses/:id/suspend', asyncHandler(async (req, res) => {
  const businessId = idOf(req.params.id), userId = idOf(req.body.userId), reason = String(req.body.reason || '').trim();
  if (!reason) fail(400, 'Hãy ghi lý do đình chỉ.');
  await prisma.$transaction(async tx => {
    const changed = await tx.business_managers.updateMany({ where: { business_id: businessId, user_id: userId, status: 'active' }, data: { status: 'suspended' } });
    if (!changed.count) fail(404, 'Không tìm thấy quyền quản lý đang hoạt động.');
    const app = await tx.business_applications.findFirst({ where: { business_id: businessId, applicant_id: userId, status: 'approved' }, orderBy: { id: 'desc' } });
    if (app) {
      await tx.business_applications.update({ where: { id: app.id }, data: { status: 'suspended', decision_reason: reason } });
      await tx.business_application_events.create({ data: { application_id: app.id, actor_id: idOf(req.user.id), action: 'suspended', reason } });
    }
    await tx.user_notifications.create({ data: { user_id: userId, type: 'business_application', title: 'Quyền quản lý cơ sở bị đình chỉ', message: reason } });
  });
  res.json({ status: 'suspended' });
}));
router.get('/reports', asyncHandler(async (_req, res) => {
  const rows = await prisma.business_review_reports.findMany({ include: { review: true, business: true }, orderBy: { created_at: 'desc' }, take: 100 });
  res.json(rows.map(r => ({ id: String(r.id), reviewId: String(r.review_id), businessId: String(r.business_id), businessName: r.business.name,
    reason: r.reason, status: r.status, review: { rating: r.review.rating, content: r.review.content, hidden: r.review.is_hidden }, createdAt: r.created_at })));
}));
router.post('/reports/:id/decision', asyncHandler(async (req, res) => {
  const action = req.body.action;
  if (!['hide', 'dismiss'].includes(action)) fail(400, 'Quyết định không hợp lệ.');
  const id = idOf(req.params.id);
  await prisma.$transaction(async tx => {
    const report = await tx.business_review_reports.findUnique({ where: { id } });
    if (!report) fail(404, 'Không tìm thấy báo cáo.');
    if (report.status !== 'pending') return;
    await tx.business_review_reports.update({ where: { id }, data: { status: action } });
    if (action === 'hide') await tx.reviews.update({ where: { id: report.review_id }, data: { is_hidden: true } });
  });
  res.json({ status: action });
}));
export default router;
