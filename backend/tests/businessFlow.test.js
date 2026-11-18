import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import prisma from '../src/config/db.js';
import businessRoutes from '../src/routes/business.js';
import adminRoutes from '../src/routes/businessAdmin.js';
import { errorHandler } from '../src/middleware/errorMiddleware.js';
import { generateAccessToken } from '../src/services/jwtService.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('Business application, approval, per-place rights, GPS visit and verified review', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const users = [];
  let appId, businessId, locationId, privateTripId;
  const app = express(); app.use(express.json({ limit: '15mb' }));
  app.use('/business', businessRoutes); app.use('/admin/business', adminRoutes); app.use(errorHandler);
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (method, route, token, body) => {
    const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  try {
    for (const [name, role] of [['Owner', 'user'], ['Outsider', 'user'], ['Admin', 'admin']]) {
      users.push(await prisma.users.create({ data: { full_name: name, email: `${name.toLowerCase()}-${suffix}@example.com`, role, is_active: true } }));
    }
    const [owner, outsider, admin] = users.map(generateAccessToken);
    const profile = { kind: 'new', legalName: 'Test Travel', taxCode: '1234567890', name: `Test place ${suffix}`, address: 'Hà Nội',
      latitude: 21.028511, longitude: 105.804817, type: 'food', contact: '0900000000', representativeProof: 'Tôi là chủ hộ',
      description: 'Quán ăn', openingHours: '08:00-22:00', priceMin: 50000, priceMax: 100000, attributes: { cuisine: 'Việt', vegetarian: true, amenities: ['wifi'] } };
    const draft = await request('POST', '/business/applications', owner, profile);
    assert.equal(draft.status, 201, JSON.stringify(draft.data)); appId = draft.data.id;
    const deniedSubmit = await request('POST', `/business/applications/${appId}/submit`, owner);
    assert.equal(deniedSubmit.status, 400);
    assert.equal((await request('POST', `/business/applications/${appId}/evidence`, owner, { kind: 'legal', filename: 'fake.png', data: 'data:image/png;base64,SGVsbG8=' })).status, 400);
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/xj8AAAAASUVORK5CYII=';
    for (const kind of ['legal', 'operation', 'representative']) {
      assert.equal((await request('POST', `/business/applications/${appId}/evidence`, owner, { kind, filename: `${kind}.png`, data: png })).status, 201);
    }
    const privateEvidence = await prisma.business_evidence.findFirst({ where: { application_id: BigInt(appId) } });
    assert.equal((await fetch(`${base}/business/applications/${appId}/evidence/${privateEvidence.id}`, { headers: { Authorization: `Bearer ${generateAccessToken(users[1])}` } })).status, 404);
    assert.equal((await request('POST', `/business/applications/${appId}/submit`, owner)).status, 200);
    assert.equal((await request('POST', `/business/applications/${appId}/submit`, owner)).status, 200);
    if (!process.env.GEMINI_API_KEY) {
      assert.equal((await request('POST', `/admin/business/applications/${appId}/analyze`, admin)).status, 503);
      assert.equal((await prisma.business_applications.findUnique({ where: { id: BigInt(appId) } })).status, 'pending');
    }
    assert.equal((await request('POST', `/admin/business/applications/${appId}/decision`, owner, { action: 'approve' })).status, 403);
    const needs = await request('POST', `/admin/business/applications/${appId}/decision`, admin, { action: 'needs_info', reason: 'Cần xác minh thêm' });
    assert.equal(needs.status, 200, JSON.stringify(needs.data));
    assert.equal((await request('POST', `/business/applications/${appId}/submit`, owner)).status, 200);
    const approved = await request('POST', `/admin/business/applications/${appId}/decision`, admin, { action: 'approve' });
    assert.equal(approved.status, 200, JSON.stringify(approved.data)); businessId = approved.data.businessId; locationId = approved.data.locationId;
    assert.equal((await request('POST', `/admin/business/applications/${appId}/decision`, admin, { action: 'approve' })).status, 200);
    assert.equal((await prisma.business_managers.count({ where: { business_id: BigInt(businessId), user_id: users[0].id } })), 1);
    assert.equal((await prisma.users.findUnique({ where: { id: users[0].id } })).role, 'business');
    assert.equal((await request('PATCH', `/business/${businessId}`, outsider, { description: 'Hacked' })).status, 403);
    assert.equal((await request('GET', `/business/${businessId}/dashboard`, outsider)).status, 403);
    assert.equal((await request('PATCH', `/business/${businessId}`, owner, { name: 'Rename without approval' })).status, 409);
    assert.equal((await request('PATCH', `/business/${businessId}`, owner, { description: 'Updated public description', priceMin: 60000, priceMax: 110000 })).status, 200);
    const change = await request('POST', '/business/applications', owner, { ...profile, kind: 'change', businessId, name: 'Renamed after review' });
    assert.equal(change.status, 201, JSON.stringify(change.data));
    const changeId = change.data.id;
    assert.equal((await request('GET', `/business/${businessId}`, owner)).data.name, profile.name, 'public version stays approved until decision');
    for (const kind of ['legal', 'operation', 'representative']) assert.equal((await request('POST', `/business/applications/${changeId}/evidence`, owner, { kind, filename: `${kind}.png`, data: png })).status, 201);
    assert.equal((await request('POST', `/business/applications/${changeId}/submit`, owner)).status, 200);
    assert.equal((await request('POST', `/admin/business/applications/${changeId}/decision`, admin, { action: 'approve' })).status, 200);
    assert.equal((await request('GET', `/business/${businessId}`, owner)).data.name, 'Renamed after review');
    const noVisit = await request('PUT', `/business/${businessId}/reviews/999999999`, outsider, { rating: 5, content: 'Unverified' });
    assert.equal(noVisit.status, 403);
    assert.equal((await request('POST', `/business/${businessId}/checkins`, outsider, { latitude: 21.028511, longitude: 105.804817, accuracyMeters: 99, capturedAt: new Date().toISOString() })).status, 400);
    assert.equal((await request('POST', `/business/${businessId}/checkins`, outsider, { latitude: 21.028511, longitude: 105.804817, accuracyMeters: 15, capturedAt: new Date(Date.now() - 360000).toISOString() })).status, 400);
    const checkin = await request('POST', `/business/${businessId}/checkins`, outsider, { latitude: 21.028511, longitude: 105.804817, accuracyMeters: 15, capturedAt: new Date().toISOString() });
    assert.equal(checkin.status, 201, JSON.stringify(checkin.data));
    const duplicate = await request('POST', `/business/${businessId}/checkins`, outsider, { latitude: 21.028511, longitude: 105.804817, accuracyMeters: 15, capturedAt: new Date().toISOString() });
    assert.equal(duplicate.data.id, checkin.data.id);
    assert.equal((await request('PUT', `/business/${businessId}/reviews/${checkin.data.id}`, outsider, { rating: 5, content: 'Good' })).status, 200);
    const privateTrip = await prisma.itineraries.create({ data: { user_id: users[1].id, name: `Private itinerary ${suffix}`, visibility: 'private', status: 'completed' } });
    privateTripId = privateTrip.id;
    await prisma.itinerary_items.create({ data: { itinerary_id: privateTrip.id, location_id: BigInt(locationId), sort_order: 0 } });
    const reviewed = await request('GET', `/business/${businessId}`, outsider);
    assert.equal(reviewed.data.reviews[0].verifiedVisit, true);
    const dashboard = await request('GET', `/business/${businessId}/dashboard`, owner);
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.data.stats.checkinCount, 1);
    assert.equal(dashboard.data.stats.itineraryCount, 1);
    assert.equal(dashboard.data.stats.completedTripCount, 1);
    assert.equal(JSON.stringify(dashboard.data).includes('itinerary_id'), false);
    assert.equal(JSON.stringify(dashboard.data).includes(`Private itinerary ${suffix}`), false);
    const reviewId = reviewed.data.reviews[0].id;
    assert.equal((await request('PUT', `/business/${businessId}/reviews/${reviewId}/reply`, owner, { content: 'Cảm ơn bạn' })).status, 200);
    assert.equal((await request('POST', `/business/${businessId}/reviews/${reviewId}/report`, owner, { reason: 'Nội dung vi phạm' })).status, 200);
    const report = await prisma.business_review_reports.findFirst({ where: { review_id: BigInt(reviewId) } });
    assert.equal((await request('POST', `/admin/business/reports/${report.id}/decision`, admin, { action: 'hide' })).status, 200);
    assert.equal((await request('GET', `/business/${businessId}`, owner)).data.reviewCount, 0);
    assert.equal((await request('POST', `/admin/business/businesses/${businessId}/suspend`, admin, { userId: String(users[0].id), reason: 'Kiểm tra vi phạm' })).status, 200);
    assert.equal((await request('PATCH', `/business/${businessId}`, owner, { description: 'After suspension' })).status, 403);
  } finally {
    if (privateTripId) await prisma.itineraries.delete({ where: { id: privateTripId } });
    const evidence = users.length ? await prisma.business_evidence.findMany({ where: { application: { applicant_id: users[0].id } }, select: { storage_key: true } }) : [];
    if (businessId) {
      await prisma.business_review_reports.deleteMany({ where: { business_id: BigInt(businessId) } });
      await prisma.reviews.deleteMany({ where: { business_id: BigInt(businessId) } });
      await prisma.visit_history.deleteMany({ where: { business_id: BigInt(businessId) } });
      await prisma.business_applications.deleteMany({ where: { applicant_id: users[0].id } });
      await prisma.business_managers.deleteMany({ where: { business_id: BigInt(businessId) } });
      await prisma.businesses.delete({ where: { id: BigInt(businessId) } });
      if (locationId) await prisma.locations.delete({ where: { id: BigInt(locationId) } });
    } else if (appId) await prisma.business_applications.deleteMany({ where: { id: BigInt(appId) } });
    const directory = fileURLToPath(new URL('../private-evidence/', import.meta.url));
    for (const e of evidence) await fs.unlink(path.join(directory, e.storage_key)).catch(() => {});
    if (users.length) await prisma.users.deleteMany({ where: { id: { in: users.map(u => u.id) } } });
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});
