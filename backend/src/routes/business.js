import express from 'express';
import prisma from '../config/db.js';
import { authenticate, optionalAuth, requireRoles } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { idOf, validateProfile, publicBusiness, applicationView, requireManager, saveEvidence, readEvidence, normalizePlaceName } from '../services/businessService.js';

const router = express.Router();
const fail = (status, message) => { throw { status, message }; };
const number = value => Number(value);
const distance = (a, b, c, d) => {
  const rad = Math.PI / 180, x = (c - a) * rad, y = (d - b) * rad;
  const q = Math.sin(x / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(y / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
};
const reviewView = r => ({ id: String(r.id), rating: r.rating, content: r.content, createdAt: r.created_at,
  verifiedVisit: Boolean(r.visit_id), ownerReply: r.owner_reply, repliedAt: r.replied_at,
  author: r.users ? { name: r.users.full_name, avatarUrl: r.users.avatar_url } : null });

const parseRange = (query, defaultDays = null) => {
  const until = query.to ? new Date(`${query.to}T23:59:59.999Z`) : (defaultDays ? new Date() : null);
  const since = query.from ? new Date(`${query.from}T00:00:00.000Z`) : (defaultDays ? new Date(Date.now() - defaultDays * 86400000) : null);
  if ((since && Number.isNaN(+since)) || (until && Number.isNaN(+until)) || (since && until && since > until)) fail(400, 'Khoảng thời gian không hợp lệ.');
  if (since && until && (until - since) > 366 * 86400000) fail(400, 'Khoảng thời gian tối đa là 366 ngày.');
  return { since, until, date: { ...(since && { gte: since }), ...(until && { lte: until }) } };
};
const csvCell = value => {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const rows = await prisma.businesses.findMany({ where: { is_active: true }, orderBy: { created_at: 'desc' }, take: 100 });
  res.json(rows.map(publicBusiness));
}));
router.get('/mine', authenticate, requireRoles('user', 'business'), asyncHandler(async (req, res) => {
  const [managers, applications] = await Promise.all([
    prisma.business_managers.findMany({ where: { user_id: idOf(req.user.id) }, include: { business: true } }),
    prisma.business_applications.findMany({ where: { applicant_id: idOf(req.user.id) }, orderBy: { created_at: 'desc' }, include: { evidence: true, events: { orderBy: { created_at: 'asc' } } } })
  ]);
  res.json({ businesses: managers.map(m => ({ ...publicBusiness(m.business), managementStatus: m.status })), applications: applications.map(applicationView) });
}));
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const businessId = idOf(req.params.id);
  const b = await prisma.businesses.findUnique({ where: { id: businessId } });
  if (!b || !b.is_active) fail(404, 'Không tìm thấy cơ sở.');
  const reviewPlace = { OR: [{ business_id: businessId }, ...(b.location_id ? [{ location_id: b.location_id }] : [])] };
  const [reviews, rating] = await Promise.all([
    prisma.reviews.findMany({ where: { ...reviewPlace, is_hidden: false }, include: { users: { select: { full_name: true, avatar_url: true } } }, orderBy: { created_at: 'desc' }, take: 100 }),
    prisma.reviews.aggregate({ where: { ...reviewPlace, is_hidden: false }, _avg: { rating: true }, _count: true })
  ]);
  res.json({ ...publicBusiness(b), averageRating: rating._avg.rating, reviewCount: rating._count,
    reviews: reviews.map(reviewView) });
}));
router.use(authenticate, requireRoles('user', 'business'));
router.post('/applications', asyncHandler(async (req, res) => {
  const kind = req.body.kind;
  if (!['new', 'claim', 'change'].includes(kind)) fail(400, 'Loại hồ sơ không hợp lệ.');
  const payload = validateProfile(req.body);
  const locationId = req.body.locationId ? idOf(req.body.locationId) : null;
  const businessId = req.body.businessId ? idOf(req.body.businessId) : null;
  if (kind === 'claim' && !locationId) fail(400, 'Hãy chọn địa điểm có sẵn.');
  if (kind === 'change' && !businessId) fail(400, 'Hãy chọn cơ sở cần sửa.');
  if (kind === 'new' && (locationId || businessId)) fail(400, 'Cơ sở mới không được gắn ID có sẵn.');
  if (kind === 'claim') {
    const loc = await prisma.locations.findUnique({ where: { id: locationId } });
    if (!loc) fail(404, 'Không tìm thấy địa điểm.');
    const existing = await prisma.businesses.findUnique({ where: { location_id: locationId } });
    if (existing && await prisma.business_managers.findFirst({ where: { business_id: existing.id, status: 'active' } })) fail(409, 'Cơ sở đã có người quản lý.');
  }
  if (kind === 'new') {
    const near = await prisma.locations.findMany({ where: { latitude: { gte: payload.latitude - 0.001, lte: payload.latitude + 0.001 }, longitude: { gte: payload.longitude - 0.001, lte: payload.longitude + 0.001 } }, take: 100, select: { id: true, name: true, latitude: true, longitude: true } });
    if (near.some(loc => normalizePlaceName(loc.name) === normalizePlaceName(payload.name) && distance(payload.latitude, payload.longitude, number(loc.latitude), number(loc.longitude)) < 100)) fail(409, 'Địa điểm có vẻ đã tồn tại. Hãy gửi yêu cầu quản lý cơ sở có sẵn.');
  }
  if (kind === 'change') await requireManager(req.user.id, businessId);
  const created = await prisma.business_applications.create({ data: { applicant_id: idOf(req.user.id), business_id: businessId, location_id: locationId, kind, payload } });
  res.status(201).json(applicationView(created));
}));
router.put('/applications/:id', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id);
  const app = await prisma.business_applications.findUnique({ where: { id } });
  if (!app || app.applicant_id !== idOf(req.user.id)) fail(404, 'Không tìm thấy hồ sơ.');
  if (!['draft', 'needs_info'].includes(app.status)) fail(409, 'Hồ sơ đã nộp không thể sửa.');
  const payload = validateProfile(req.body);
  const updated = await prisma.business_applications.update({ where: { id }, data: { payload } });
  res.json(applicationView(updated));
}));
router.post('/applications/:id/evidence', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id);
  const app = await prisma.business_applications.findUnique({ where: { id }, include: { evidence: true } });
  if (!app || app.applicant_id !== idOf(req.user.id)) fail(404, 'Không tìm thấy hồ sơ.');
  if (!['draft', 'needs_info'].includes(app.status)) fail(409, 'Hồ sơ đã nộp không thể thêm bằng chứng.');
  if (app.evidence.length >= 12) fail(400, 'Mỗi hồ sơ tối đa 12 tệp.');
  const evidence = await saveEvidence(id, req.body);
  res.status(201).json({ id: String(evidence.id), kind: evidence.kind, filename: evidence.filename });
}));
router.get('/applications/:id/evidence/:evidenceId', asyncHandler(async (req, res) => {
  const app = await prisma.business_applications.findUnique({ where: { id: idOf(req.params.id) } });
  const e = await prisma.business_evidence.findUnique({ where: { id: idOf(req.params.evidenceId) } });
  if (!app || app.applicant_id !== idOf(req.user.id) || !e || e.application_id !== app.id) fail(404, 'Không tìm thấy bằng chứng.');
  res.set({ 'Content-Type': e.mime_type, 'Content-Disposition': `attachment; filename="evidence-${e.id}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.send(await readEvidence(e.storage_key));
}));
router.post('/applications/:id/submit', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id), userId = idOf(req.user.id);
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM business_applications WHERE id = ${id} FOR UPDATE`;
    const app = await tx.business_applications.findUnique({ where: { id }, include: { evidence: true } });
    if (!app || app.applicant_id !== userId) fail(404, 'Không tìm thấy hồ sơ.');
    if (app.status === 'pending') return app;
    if (!['draft', 'needs_info'].includes(app.status)) fail(409, 'Trạng thái hồ sơ không cho phép gửi lại.');
    const kinds = new Set(app.evidence.map(e => e.kind));
    if (!kinds.has('operation') || !kinds.has('representative') || !kinds.has('legal')) fail(400, 'Cần giấy tờ pháp lý, ảnh hoạt động và bằng chứng quyền đại diện.');
    const updated = await tx.business_applications.update({ where: { id }, data: { status: 'pending' } });
    await tx.business_application_events.create({ data: { application_id: id, actor_id: userId, action: 'submitted' } });
    return updated;
  });
  res.json(applicationView(result));
}));
router.get('/:id/dashboard', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id);
  await requireManager(req.user.id, id);
  const business = await prisma.businesses.findUnique({ where: { id } });
  const reviewPlace = { OR: [{ business_id: id }, ...(business.location_id ? [{ location_id: business.location_id }] : [])] };
  const { since, until, date } = parseRange(req.query);
  // Only private itineraries are included; each metric deduplicates itinerary IDs.
  const itemWhere = { OR: [{ business_id: id }, ...(business.location_id ? [{ location_id: business.location_id }] : [])], itineraries: { visibility: 'private' }, ...(since || until ? { created_at: date } : {}) };
  const [items, completedItems, checkins, reviews, rating, applications] = await Promise.all([
    prisma.itinerary_items.findMany({ where: itemWhere, select: { itinerary_id: true, created_at: true }, take: 10000 }),
    prisma.itinerary_items.findMany({ where: { ...itemWhere, itineraries: { visibility: 'private', status: 'completed' } }, select: { itinerary_id: true, created_at: true }, take: 10000 }),
    prisma.visit_history.findMany({ where: { business_id: id, ...(since || until ? { check_in_time: date } : {}) }, select: { check_in_time: true }, take: 10000 }),
    prisma.reviews.findMany({ where: { ...reviewPlace, is_hidden: false, ...(since || until ? { created_at: date } : {}) }, include: { users: { select: { full_name: true, avatar_url: true } } }, orderBy: { created_at: 'desc' }, take: 100 }),
    prisma.reviews.aggregate({ where: { ...reviewPlace, is_hidden: false, ...(since || until ? { created_at: date } : {}) }, _avg: { rating: true }, _count: true }),
    prisma.business_applications.findMany({ where: { business_id: id }, orderBy: { created_at: 'desc' }, take: 10 })
  ]);
  const trend = new Map();
  const getTrend = value => { const key = new Date(value).toISOString().slice(0, 10); if (!trend.has(key)) trend.set(key, { date: key, itineraryCount: new Set(), completedTripCount: new Set(), checkinCount: 0, reviewCount: 0 }); return trend.get(key); };
  items.forEach(row => getTrend(row.created_at).itineraryCount.add(String(row.itinerary_id)));
  completedItems.forEach(row => getTrend(row.created_at).completedTripCount.add(String(row.itinerary_id)));
  checkins.forEach(row => getTrend(row.check_in_time).checkinCount++);
  reviews.forEach(row => getTrend(row.created_at).reviewCount++);
  const trendRows = [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)).map(row => ({ ...row, itineraryCount: row.itineraryCount.size, completedTripCount: row.completedTripCount.size }));
  res.json({ business: publicBusiness(business), stats: { itineraryCount: new Set(items.map(x => String(x.itinerary_id))).size,
    completedTripCount: new Set(completedItems.map(x => String(x.itinerary_id))).size, checkinCount: checkins.length,
    averageRating: rating._avg.rating, reviewCount: rating._count, commentCount: reviews.filter(review => review.content).length }, trend: trendRows, reviews: reviews.map(reviewView), definitions: {
      itineraryCount: 'Số lịch trình riêng tư có ít nhất một mục trỏ tới cơ sở trong khoảng thời gian đã chọn.',
      completedTripCount: 'Số lịch trình riêng tư trong các lịch trình trên có trạng thái completed.',
      checkinCount: 'Số check-in GPS hợp lệ tại cơ sở; mỗi lượt được ghi nhận một lần trong cửa sổ 6 giờ.',
      reviewCount: 'Số đánh giá không bị ẩn, theo thời điểm tạo đánh giá.'
    } });
}));

router.get('/:id/report.csv', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id);
  await requireManager(req.user.id, id);
  const business = await prisma.businesses.findUnique({ where: { id } });
  if (!business) fail(404, 'Không tìm thấy cơ sở.');
  const { since, until, date } = parseRange(req.query, 90);
  const itemWhere = { OR: [{ business_id: id }, ...(business.location_id ? [{ location_id: business.location_id }] : [])], itineraries: { visibility: 'private' }, created_at: date };
  const [items, completedItems, checkins, reviews] = await Promise.all([
    prisma.itinerary_items.findMany({ where: itemWhere, select: { itinerary_id: true, created_at: true }, take: 10000 }),
    prisma.itinerary_items.findMany({ where: { ...itemWhere, itineraries: { visibility: 'private', status: 'completed' } }, select: { itinerary_id: true, created_at: true }, take: 10000 }),
    prisma.visit_history.findMany({ where: { business_id: id, check_in_time: date }, select: { check_in_time: true }, take: 10000 }),
    prisma.reviews.findMany({ where: { OR: [{ business_id: id }, ...(business.location_id ? [{ location_id: business.location_id }] : [])], created_at: date, is_hidden: false }, select: { created_at: true, rating: true, content: true }, take: 10000 })
  ]);
  const buckets = new Map();
  const bucket = value => {
    const key = new Date(value).toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, { date: key, itineraryCount: new Set(), completedTripCount: new Set(), checkinCount: 0, reviewCount: 0, commentCount: 0, ratingTotal: 0 });
    return buckets.get(key);
  };
  items.forEach(row => bucket(row.created_at).itineraryCount.add(String(row.itinerary_id)));
  completedItems.forEach(row => bucket(row.created_at).completedTripCount.add(String(row.itinerary_id)));
  checkins.forEach(row => bucket(row.check_in_time).checkinCount++);
  reviews.forEach(row => { const b = bucket(row.created_at); b.reviewCount++; if (row.content) b.commentCount++; b.ratingTotal += Number(row.rating || 0); });
  const header = ['date', 'itinerary_count', 'completed_trip_count', 'checkin_count', 'review_count', 'comment_count', 'average_rating'];
  const rows = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)).map(row => [row.date, row.itineraryCount.size, row.completedTripCount.size, row.checkinCount, row.reviewCount, row.commentCount, row.reviewCount ? (row.ratingTotal / row.reviewCount).toFixed(2) : '']);
  const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="business-${id}-report.csv"`, 'Cache-Control': 'no-store' }).send(`\uFEFF${csv}`);
}));
router.patch('/:id', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id);
  await requireManager(req.user.id, id);
  const current = await prisma.businesses.findUnique({ where: { id } });
  const legalKeys = ['name', 'address', 'latitude', 'longitude', 'type', 'legalName', 'taxCode', 'representativeProof'];
  if (legalKeys.some(key => Object.hasOwn(req.body, key))) fail(409, 'Thay đổi tên, pháp lý, loại hình hoặc vị trí cần tạo hồ sơ xét duyệt lại.');
  const data = {};
  if (req.body.description !== undefined) data.detail = String(req.body.description).slice(0, 5000);
  if (req.body.openingHours !== undefined) data.opening_hours = String(req.body.openingHours).slice(0, 255);
  if (req.body.imageUrl !== undefined) data.image_url = String(req.body.imageUrl).slice(0, 500);
  if (req.body.gallery !== undefined) {
    if (!Array.isArray(req.body.gallery) || req.body.gallery.length > 20) fail(400, 'Danh sách ảnh không hợp lệ.');
    data.gallery = req.body.gallery.map(x => String(x).slice(0, 500));
  }
  if (req.body.attributes !== undefined) {
    data.attributes = validateProfile({ legalName: 'Đã duyệt', taxCode: 'Đã duyệt', name: current.name, address: current.address,
      latitude: current.latitude, longitude: current.longitude, type: current.business_type,
      contact: current.contact || 'Chưa có liên hệ', representativeProof: 'Đã duyệt', attributes: req.body.attributes }).attributes;
  }
  for (const [key, col] of [['priceMin', 'price_min'], ['priceMax', 'price_max']]) {
    if (req.body[key] !== undefined) {
      const n = Number(req.body[key]);
      if (!Number.isSafeInteger(n) || n < 0) fail(400, 'Giá VND không hợp lệ.');
      data[col] = n;
    }
  }
  if ((data.price_min ?? current.price_min) != null && (data.price_max ?? current.price_max) != null &&
      (data.price_min ?? current.price_min) > (data.price_max ?? current.price_max)) fail(400, 'Khoảng giá không hợp lệ.');
  if (!Object.keys(data).length) fail(400, 'Không có thay đổi hợp lệ.');
  const updated = await prisma.$transaction(async tx => {
    const b = await tx.businesses.update({ where: { id }, data });
    await tx.business_application_events.create({ data: { application_id: (await tx.business_applications.findFirst({ where: { business_id: id, status: 'approved' }, orderBy: { id: 'desc' } }))?.id ?? (await tx.business_applications.findFirst({ where: { business_id: id }, orderBy: { id: 'desc' } }))?.id,
      actor_id: idOf(req.user.id), action: 'profile_edit', reason: JSON.stringify({ before: publicBusiness(current), after: data }) } });
    return b;
  });
  res.json(publicBusiness(updated));
}));
router.post('/:id/checkins', asyncHandler(async (req, res) => {
  const id = idOf(req.params.id), userId = idOf(req.user.id);
  const b = await prisma.businesses.findUnique({ where: { id } });
  if (!b || !b.is_active) fail(404, 'Không tìm thấy cơ sở đang hoạt động.');
  const lat = Number(req.body.latitude), lng = Number(req.body.longitude), accuracy = Number(req.body.accuracyMeters);
  const captured = new Date(req.body.capturedAt);
  const now = Date.now();
  const maxAccuracy = Number(process.env.CHECKIN_MAX_ACCURACY_M) || 50;
  const maxAge = Number(process.env.CHECKIN_MAX_AGE_MS) || 120000;
  const radius = Number(process.env.CHECKIN_RADIUS_M) || 50;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) fail(400, 'Vị trí không hợp lệ. Hãy bật định vị và thử lại.');
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > maxAccuracy) fail(400, 'Độ chính xác vị trí chưa đủ. Hãy đứng gần cơ sở và thử lại.');
  if (Number.isNaN(+captured) || now - +captured > maxAge || +captured - now > 10000) fail(400, 'Vị trí đã cũ. Hãy lấy vị trí mới và thử lại.');
  const meters = distance(lat, lng, number(b.latitude), number(b.longitude));
  if (meters > radius) fail(400, `Bạn đang cách cơ sở ${Math.round(meters)} m; cần trong phạm vi ${radius} m.`);
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const recent = await tx.visit_history.findFirst({ where: { user_id: userId, business_id: id, check_in_time: { gte: new Date(Date.now() - 6 * 3600000) } }, orderBy: { check_in_time: 'desc' } });
    if (recent) return { id: String(recent.id), distanceMeters: number(recent.distance_meters), reused: true };
    const key = `${userId}:${id}:${Math.floor(Date.now() / (6 * 3600000))}`;
    await tx.$executeRaw`INSERT INTO visit_history (user_id, business_id, user_latitude, user_longitude, gps_point, distance_meters, check_in_time, accuracy_meters, captured_at, visit_key) VALUES (${userId}, ${id}, ${lat}, ${lng}, ST_SRID(POINT(${lng}, ${lat}), 4326), ${meters}, ${new Date()}, ${accuracy}, ${captured}, ${key})`;
    const visit = await tx.visit_history.findUnique({ where: { visit_key: key } });
    return { id: String(visit.id), distanceMeters: meters, reused: false };
  });
  res.status(result.reused ? 200 : 201).json({ ...result, note: 'GPS chỉ hỗ trợ xác nhận vị trí, không chống giả mạo tuyệt đối.' });
}));
router.put('/:id/reviews/:visitId', asyncHandler(async (req, res) => {
  const businessId = idOf(req.params.id), visitId = idOf(req.params.visitId), userId = idOf(req.user.id);
  const visit = await prisma.visit_history.findUnique({ where: { id: visitId } });
  if (!visit || visit.user_id !== userId || visit.business_id !== businessId || !visit.visit_key) fail(403, 'Cần check-in hợp lệ tại đúng cơ sở trước khi đánh giá.');
  const rating = Number(req.body.rating), content = String(req.body.content || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || content.length > 5000) fail(400, 'Đánh giá không hợp lệ.');
  const review = await prisma.reviews.upsert({ where: { visit_id: visitId }, create: { visit_id: visitId, user_id: userId, business_id: businessId, rating, content }, update: { rating, content } });
  res.json(reviewView(review));
}));
router.put('/:id/reviews/:reviewId/reply', asyncHandler(async (req, res) => {
  const businessId = idOf(req.params.id);
  await requireManager(req.user.id, businessId);
  const review = await prisma.reviews.findUnique({ where: { id: idOf(req.params.reviewId) } });
  const business = await prisma.businesses.findUnique({ where: { id: businessId } });
  if (!review || (review.business_id !== businessId && !(business.location_id && review.location_id === business.location_id))) fail(404, 'Không tìm thấy đánh giá.');
  const content = String(req.body.content || '').trim();
  if (!content || content.length > 3000) fail(400, 'Phản hồi phải có từ 1 đến 3000 ký tự.');
  const updated = await prisma.reviews.update({ where: { id: review.id }, data: { owner_reply: content, replied_at: new Date() } });
  res.json(reviewView(updated));
}));
router.post('/:id/reviews/:reviewId/report', asyncHandler(async (req, res) => {
  const businessId = idOf(req.params.id);
  await requireManager(req.user.id, businessId);
  const reviewId = idOf(req.params.reviewId);
  const review = await prisma.reviews.findUnique({ where: { id: reviewId } });
  const business = await prisma.businesses.findUnique({ where: { id: businessId } });
  if (!review || (review.business_id !== businessId && !(business.location_id && review.location_id === business.location_id))) fail(404, 'Không tìm thấy đánh giá.');
  const reason = String(req.body.reason || '').trim();
  if (!reason || reason.length > 500) fail(400, 'Hãy ghi lý do báo cáo trong 500 ký tự.');
  const report = await prisma.business_review_reports.upsert({ where: { review_id_reporter_id: { review_id: reviewId, reporter_id: idOf(req.user.id) } }, create: { business_id: businessId, review_id: reviewId, reporter_id: idOf(req.user.id), reason }, update: { reason, status: 'pending' } });
  res.json({ id: String(report.id), status: report.status });
}));
export default router;
