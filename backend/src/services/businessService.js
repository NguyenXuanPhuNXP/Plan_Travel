import prisma from '../config/db.js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDir = fileURLToPath(new URL('../../private-evidence/', import.meta.url));
const types = ['food', 'stay', 'activity'];
const units = { food: 'person', stay: 'night', activity: 'ticket' };
const currencies = ['VND', 'USD'];
export const normalizePlaceName = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const fail = (status, message) => { throw { status, message }; };
export const idOf = value => {
  if (!/^[1-9]\d*$/.test(String(value || ''))) fail(400, 'ID không hợp lệ.');
  return BigInt(value);
};
const str = (value, max, required = false) => {
  const result = String(value ?? '').trim();
  if ((required && !result) || result.length > max) fail(400, `Thông tin bắt buộc hoặc vượt quá ${max} ký tự.`);
  return result;
};
const coordinate = (value, max) => {
  const n = Number(value);
  if (value === '' || value == null || !Number.isFinite(n) || Math.abs(n) > max) fail(400, 'Tọa độ không hợp lệ.');
  return n;
};
const money = value => {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000) fail(400, 'Giá VND không hợp lệ.');
  return n;
};
const list = (value, max = 12) => {
  if (!Array.isArray(value) || value.length > max) fail(400, 'Danh sách không hợp lệ.');
  return value.map(item => str(item, 200, true));
};
export function validateProfile(input) {
  const type = str(input.type, 30, true);
  if (!types.includes(type)) fail(400, 'Loại hình không hợp lệ.');
  const currency = str(input.currency || 'VND', 3, true).toUpperCase();
  if (!currencies.includes(currency)) fail(400, 'Tiền tệ chỉ hỗ trợ VND hoặc USD.');
  const min = money(input.priceMin);
  const max = money(input.priceMax);
  if (min != null && max != null && min > max) fail(400, 'Giá tối thiểu vượt quá giá tối đa.');
  const attributes = input.attributes || {};
  if (typeof attributes !== 'object' || Array.isArray(attributes)) fail(400, 'Thuộc tính không hợp lệ.');
  const allowed = type === 'food'
    ? ['restaurantType', 'cuisine', 'vegetarian', 'parking', 'reservation', 'amenities']
    : type === 'stay'
      ? ['stayType', 'roomType', 'capacity', 'checkIn', 'checkOut', 'amenities']
      : ['activityType', 'suggestedMinutes', 'minAge', 'reservation', 'freeEntry', 'amenities'];
  if (Object.keys(attributes).some(key => !allowed.includes(key))) fail(400, 'Thuộc tính không đúng loại hình.');
  const clean = {};
  for (const key of allowed) {
    if (attributes[key] == null) continue;
    clean[key] = key === 'amenities' ? list(attributes[key])
      : ['vegetarian', 'parking', 'reservation', 'freeEntry'].includes(key) ? Boolean(attributes[key])
        : ['suggestedMinutes', 'minAge', 'capacity'].includes(key) ? money(attributes[key])
          : str(attributes[key], 100);
  }
  if (clean.minAge != null && clean.minAge > 120) fail(400, 'Giới hạn tuổi không hợp lệ.');
  if (clean.suggestedMinutes != null && clean.suggestedMinutes > 10080) fail(400, 'Thời lượng gợi ý không hợp lệ.');
  for (const key of ['checkIn', 'checkOut']) if (clean[key] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(clean[key])) fail(400, 'Giờ nhận/trả phòng cần định dạng HH:mm.');
  const taxCode = str(input.taxCode, 30, true);
  if (!/^\d{10}(?:-\d{3})?$/.test(taxCode) && taxCode !== 'Đã duyệt') fail(400, 'Mã số thuế cần 10 chữ số hoặc mã chi nhánh 10-3 chữ số.');
  return {
    legalName: str(input.legalName, 200, true), taxCode,
    name: str(input.name, 200, true), address: str(input.address, 255, true),
    latitude: coordinate(input.latitude, 90), longitude: coordinate(input.longitude, 180),
    type, contact: str(input.contact, 255, true), representativeProof: str(input.representativeProof, 1000, true),
    description: str(input.description, 5000), openingHours: str(input.openingHours, 255),
    imageUrl: str(input.imageUrl, 500), gallery: input.gallery ? list(input.gallery, 20) : [],
    currency, priceMin: min, priceMax: max, priceUnit: `${currency}/${units[type]}`, attributes: clean
  };
}
export function publicBusiness(b) {
  return { id: String(b.id), locationId: b.location_id ? String(b.location_id) : null,
    name: b.name, address: b.address, latitude: Number(b.latitude), longitude: Number(b.longitude),
    type: b.business_type, description: b.detail, contact: b.contact, imageUrl: b.image_url,
    gallery: b.gallery || [], openingHours: b.opening_hours, priceMin: b.price_min,
    priceMax: b.price_max, priceUnit: b.price_unit, currency: String(b.price_unit || 'VND/').split('/')[0] || 'VND', attributes: b.attributes || {}, isActive: b.is_active };
}
export function applicationView(a) {
  return { id: String(a.id), applicantId: String(a.applicant_id), businessId: a.business_id ? String(a.business_id) : null,
    locationId: a.location_id ? String(a.location_id) : null, kind: a.kind, status: a.status,
    payload: a.payload, aiResult: a.ai_result, aiStatus: a.ai_status, aiError: a.ai_error,
    reason: a.decision_reason, createdAt: a.created_at, updatedAt: a.updated_at,
    evidence: a.evidence?.map(e => ({ id: String(e.id), kind: e.kind, filename: e.filename, mimeType: e.mime_type })) || [],
    events: a.events?.map(e => ({ action: e.action, actorId: String(e.actor_id), reason: e.reason, at: e.created_at })) || [] };
}
export async function requireManager(userId, businessId, db = prisma) {
  const user = await db.users.findUnique({ where: { id: idOf(userId) }, select: { is_active: true } });
  if (!user?.is_active) fail(403, 'Tài khoản đã bị vô hiệu hóa.');
  const manager = await db.business_managers.findUnique({ where: { business_id_user_id: { business_id: businessId, user_id: idOf(userId) } } });
  if (!manager || manager.status !== 'active') fail(403, 'Bạn không có quyền quản lý cơ sở này.');
  return manager;
}
export async function saveEvidence(applicationId, body) {
  const kind = str(body.kind, 30, true);
  if (!['operation', 'legal', 'representative'].includes(kind)) fail(400, 'Loại bằng chứng không hợp lệ.');
  const filename = str(body.filename, 255, true);
  const match = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ''));
  if (!match) fail(400, 'Chỉ nhận JPEG, PNG, WebP hoặc PDF.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) fail(400, 'Tệp phải từ 1 byte đến 8 MB.');
  const signatures = { 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/webp': [0x52, 0x49, 0x46, 0x46], 'application/pdf': [0x25, 0x50, 0x44, 0x46] };
  if (!signatures[match[1]].every((byte, i) => bytes[i] === byte) || (match[1] === 'image/webp' && bytes.toString('ascii', 8, 12) !== 'WEBP')) fail(400, 'Nội dung tệp không khớp định dạng.');
  if ((match[1] === 'image/png' && !bytes.includes(Buffer.from('IEND'))) ||
      (match[1] === 'image/jpeg' && bytes.subarray(-2).toString('hex') !== 'ffd9') ||
      (match[1] === 'application/pdf' && !bytes.subarray(-1024).toString('ascii').includes('%%EOF')) ||
      (match[1] === 'image/webp' && bytes.length !== bytes.readUInt32LE(4) + 8)) fail(400, 'Tệp bị lỗi hoặc chưa tải đầy đủ.');
  const key = randomUUID();
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, key), bytes, { flag: 'wx' });
  try {
    return await prisma.business_evidence.create({ data: { application_id: applicationId, kind, filename, mime_type: match[1], storage_key: key } });
  } catch (error) {
    await fs.unlink(path.join(evidenceDir, key)).catch(() => {});
    throw error;
  }
}
export async function readEvidence(key) { return fs.readFile(path.join(evidenceDir, key)); }

export async function applyApproval(tx, application) {
  const p = application.payload;
  let businessId = application.business_id;
  let locationId = application.location_id;
  if (application.kind === 'change') {
    await requireManager(application.applicant_id, businessId, tx);
    const category = await tx.categories.upsert({ where: { name: `business_${p.type}` }, create: { name: `business_${p.type}`, category_type: 'business' }, update: {} });
    await tx.businesses.update({ where: { id: businessId }, data: { name: p.name, address: p.address, latitude: p.latitude,
      longitude: p.longitude, category_id: category.id, business_type: p.type, contact: p.contact, detail: p.description,
      opening_hours: p.openingHours, image_url: p.imageUrl || null, gallery: p.gallery,
      price_min: p.priceMin, price_max: p.priceMax, price_unit: p.priceUnit, attributes: p.attributes } });
    await tx.$executeRaw`UPDATE businesses SET geo_point = ST_SRID(POINT(${p.longitude}, ${p.latitude}), 4326) WHERE id = ${businessId}`;
    if (locationId) {
      await tx.locations.update({ where: { id: locationId }, data: { name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude, category: p.type } });
      await tx.$executeRaw`UPDATE locations SET geo_point = ST_SRID(POINT(${p.longitude}, ${p.latitude}), 4326) WHERE id = ${locationId}`;
    }
  } else {
    if (locationId) {
      const existing = await tx.businesses.findUnique({ where: { location_id: locationId } });
      if (existing) businessId = existing.id;
    }
    if (!businessId) {
      if (!locationId) {
        const candidates = await tx.locations.findMany({ where: { latitude: { gte: p.latitude - 0.001, lte: p.latitude + 0.001 }, longitude: { gte: p.longitude - 0.001, lte: p.longitude + 0.001 } }, select: { id: true, name: true, latitude: true, longitude: true }, take: 100 });
        const duplicate = candidates.some(loc => normalizePlaceName(loc.name) === normalizePlaceName(p.name) && Math.abs(Number(loc.latitude) - p.latitude) < 0.001 && Math.abs(Number(loc.longitude) - p.longitude) < 0.001);
        if (duplicate) fail(409, 'Cơ sở đã tồn tại gần vị trí này. Hãy chuyển sang yêu cầu quản lý cơ sở có sẵn.');
        const externalId = `business_${randomUUID()}`;
        await tx.$executeRaw`INSERT INTO locations (external_id, source, name, address, country, country_code, category, latitude, longitude, geo_point, estimated_cost, tags, raw_json) VALUES (${externalId}, 'business', ${p.name}, ${p.address}, 'Vietnam', 'vn', ${p.type}, ${p.latitude}, ${p.longitude}, ST_SRID(POINT(${p.longitude}, ${p.latitude}), 4326), ${p.priceMin || 0}, JSON_ARRAY(), JSON_OBJECT())`;
        locationId = (await tx.locations.findUnique({ where: { external_id: externalId }, select: { id: true } })).id;
      }
      const category = await tx.categories.upsert({ where: { name: `business_${p.type}` }, create: { name: `business_${p.type}`, category_type: 'business' }, update: {} });
      await tx.$executeRaw`INSERT INTO businesses (category_id, location_id, name, address, latitude, longitude, geo_point, image_url, detail, opening_hours, business_type, contact, price_min, price_max, price_unit, attributes, gallery) VALUES (${category.id}, ${locationId}, ${p.name}, ${p.address}, ${p.latitude}, ${p.longitude}, ST_SRID(POINT(${p.longitude}, ${p.latitude}), 4326), ${p.imageUrl || null}, ${p.description}, ${p.openingHours}, ${p.type}, ${p.contact}, ${p.priceMin}, ${p.priceMax}, ${p.priceUnit}, ${JSON.stringify(p.attributes)}, ${JSON.stringify(p.gallery)})`;
      businessId = (await tx.businesses.findUnique({ where: { location_id: locationId }, select: { id: true } })).id;
    } else if (application.kind === 'claim') {
      const category = await tx.categories.upsert({ where: { name: `business_${p.type}` }, create: { name: `business_${p.type}`, category_type: 'business' }, update: {} });
      await tx.businesses.update({ where: { id: businessId }, data: { category_id: category.id, business_type: p.type, contact: p.contact, price_min: p.priceMin, price_max: p.priceMax, price_unit: p.priceUnit, attributes: p.attributes } });
    }
    const activeOwner = await tx.business_managers.findFirst({ where: { business_id: businessId, status: 'active', NOT: { user_id: application.applicant_id } } });
    if (activeOwner) fail(409, 'Cơ sở đã có người quản lý. Hãy xử lý quyền hiện tại trước.');
    await tx.business_managers.upsert({ where: { business_id_user_id: { business_id: businessId, user_id: application.applicant_id } }, create: { business_id: businessId, user_id: application.applicant_id }, update: { status: 'active' } });
  }
  return { businessId, locationId };
}

export async function analyzeApplication(applicationId) {
  const app = await prisma.business_applications.findUnique({ where: { id: applicationId }, include: { evidence: true } });
  if (!app) fail(404, 'Không tìm thấy hồ sơ.');
  if (app.ai_status === 'running' && app.updated_at > new Date(Date.now() - 120_000)) fail(409, 'Hồ sơ đang được phân tích.');
  if (['done', 'failed'].includes(app.ai_status) && app.updated_at > new Date(Date.now() - 60_000)) fail(429, 'Vui lòng chờ 60 giây trước khi phân tích lại.');
  await prisma.business_applications.update({ where: { id: applicationId }, data: { ai_status: 'running', ai_error: null } });
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('Chưa cấu hình GEMINI_API_KEY. Admin có thể xét duyệt thủ công.');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const files = await Promise.all(app.evidence.filter(e => e.mime_type.startsWith('image/')).slice(0, 3).map(async e => ({ inlineData: { mimeType: e.mime_type, data: (await readEvidence(e.storage_key)).toString('base64') } })));
    if (!files.length) throw new Error('Chưa có ảnh chứng minh để AI đọc. Admin có thể xét duyệt thủ công.');
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: process.env.BUSINESS_AI_MODEL || 'gemini-2.0-flash' });
    const prompt = `Chỉ trích xuất dữ liệu nhìn thấy trong ảnh. Trả JSON gồm legalName, taxCode, address, mismatches (mảng), adminChecks (mảng). Đối chiếu với khai báo: ${JSON.stringify({ legalName: app.payload.legalName, taxCode: app.payload.taxCode, address: app.payload.address })}. Không xác nhận doanh nghiệp hợp lệ từ ảnh.`;
    const timeout = Number(process.env.BUSINESS_AI_TIMEOUT_MS) || 15000;
    const result = await model.generateContent([prompt, ...files], { timeout });
    const raw = result.response.text().replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(raw);
    const aiResult = { extracted: parsed, taxRegistryStatus: 'Chưa đối chiếu nguồn đăng ký', analyzedAt: new Date().toISOString(), advisoryOnly: true };
    await prisma.business_applications.update({ where: { id: applicationId }, data: { ai_status: 'done', ai_result: aiResult } });
    return aiResult;
  } catch (error) {
    await prisma.business_applications.update({ where: { id: applicationId }, data: { ai_status: 'failed', ai_error: String(error.message).slice(0, 1000) } });
    throw { status: 503, message: `${error.message} Admin vẫn có thể xét duyệt thủ công.` };
  }
}
