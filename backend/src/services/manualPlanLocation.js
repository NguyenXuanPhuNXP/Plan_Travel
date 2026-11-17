import { createHash } from 'node:crypto';

export async function resolveManualPlanLocation(tx, point, customName) {
    const fail = message => { throw { status: 400, message }; };
    const text = (value, limit, label, required = false) => {
        const result = String(value ?? '').trim();
        if ((required && !result) || result.length > limit) fail(`${label} không hợp lệ (tối đa ${limit} ký tự).`);
        return result || null;
    };
    const latitude = Number(point.latitude ?? point.lat);
    const longitude = Number(point.longitude ?? point.lng);
    if ((point.latitude ?? point.lat) == null || (point.longitude ?? point.lng) == null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) fail('Tọa độ điểm đã chọn không hợp lệ.');
    const name = text(point.name || customName, 255, 'Tên địa điểm', true);
    const address = text(point.address, 2000, 'Địa chỉ');
    const image = text(point.imageUrl || point.image, 2000, 'Ảnh địa điểm');
    const externalId = 'manual_plan_' + createHash('sha256').update(`${name}|${latitude}|${longitude}`).digest('hex');
    await tx.$executeRaw`INSERT INTO locations (external_id, source, name, address, latitude, longitude, geo_point, category, image_url)
        VALUES (${externalId}, 'manual', ${name}, ${address}, ${latitude}, ${longitude}, ST_SRID(POINT(${longitude}, ${latitude}), 4326), 'manual', ${image})
        ON DUPLICATE KEY UPDATE external_id = VALUES(external_id)`;
    const points = await tx.$queryRaw`SELECT id FROM locations WHERE external_id = ${externalId}`;
    return points[0].id;
}
