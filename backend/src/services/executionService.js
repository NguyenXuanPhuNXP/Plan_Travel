import prisma from '../config/db.js';
import { fail, idOf, pageInput } from './mobileInput.js';
import { generateLocationToken } from './jwtService.js';

const clearedLocation = { latitude: null, longitude: null, accuracy_meters: null, captured_at: null };
const includeStops = { stops: { orderBy: { sort_order: 'asc' } } };
const isMember = (plan, userId) => plan && (plan.user_id === userId || plan.collaborators.some(member => member.user_id === userId));

export function executionView(row) {
    const stops = row.stops.map(stop => ({
        ...stop.snapshot, id: String(stop.id), status: stop.status,
        arrivedAt: stop.arrived_at, completedAt: stop.completed_at, skippedAt: stop.skipped_at
    }));
    return {
        id: String(row.id), itineraryId: String(row.itinerary_id), userId: String(row.user_id),
        snapshot: row.snapshot, status: row.status, version: row.version,
        startedAt: row.started_at, finishedAt: row.finished_at,
        locationSharing: row.location_sharing, sharingVersion: row.sharing_version,
        stops, nextStopId: stops.find(stop => !['completed', 'skipped'].includes(stop.status))?.id || null
    };
}

export function checkTransition(current, next) {
    if (!['arrived', 'completed', 'skipped'].includes(next)) fail(400, 'INVALID_STOP_STATUS', 'Trạng thái điểm dừng không hợp lệ.');
    if (current === next) return;
    if (!(current === 'pending' && ['arrived', 'skipped'].includes(next)) &&
        !(current === 'arrived' && ['completed', 'skipped'].includes(next))) {
        fail(409, 'INVALID_TRANSITION', 'Cần đánh dấu đã đến trước khi hoàn thành; điểm đã kết thúc không thể đổi lại.');
    }
}

export function locationInput(body, now = Date.now()) {
    const { latitude, longitude, accuracyMeters, capturedAt, sharingVersion } = body;
    if (![latitude, longitude, accuracyMeters].every(value => typeof value === 'number' && Number.isFinite(value)) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracyMeters <= 0 || accuracyMeters > 10000 ||
        !Number.isInteger(sharingVersion) || sharingVersion < 0 || typeof capturedAt !== 'string') {
        fail(400, 'INVALID_LOCATION', 'Vị trí hoặc độ chính xác không hợp lệ.');
    }
    const captured = new Date(capturedAt);
    if (!Number.isFinite(+captured) || now - +captured > 120000 || +captured - now > 10000) fail(400, 'STALE_LOCATION', 'Vị trí đã cũ hoặc thời gian không hợp lệ.');
    return { latitude, longitude, accuracy_meters: accuracyMeters, captured_at: captured };
}

export async function reconcileExecutionMembers(tx, itineraryId) {
    const plan = await tx.itineraries.findUnique({ where: { id: itineraryId }, include: { collaborators: true } });
    if (!plan) return;
    await tx.trip_executions.updateMany({
        where: { itinerary_id: itineraryId, status: 'active', user_id: { notIn: [plan.user_id, ...plan.collaborators.map(member => member.user_id)] } },
        data: { status: 'cancelled', active_user_id: null, finished_at: new Date(), location_sharing: false,
            sharing_version: { increment: 1 }, version: { increment: 1 }, ...clearedLocation }
    });
}

// Both deletion entry points share the same plan lock used when starting execution.
export async function deletePlanWithExecutionGuard(db, itineraryId, userId = null) {
    const planId = idOf(itineraryId);
    return db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM itineraries WHERE id = ${planId} FOR UPDATE`;
        const plan = await tx.itineraries.findUnique({ where: { id: planId }, include: { collaborators: true } });
        if (!plan) fail(404, 'NOT_FOUND', 'Không tìm thấy kế hoạch.');
        if (userId != null && plan.user_id !== idOf(userId)) fail(403, 'FORBIDDEN', 'Bạn không có quyền xóa.');
        if (await tx.trip_executions.count({ where: { itinerary_id: planId, status: 'active' } })) fail(409, 'EXECUTION_ACTIVE', 'Chưa thể xóa kế hoạch đang được thực hiện.');
        await tx.itineraries.delete({ where: { id: planId } });
        return plan;
    }, { isolationLevel: 'ReadCommitted' });
}

export function createExecutionService(db = prisma) {
    async function member(tx, planId, userId) {
        const plan = await tx.itineraries.findUnique({ where: { id: planId }, include: { collaborators: true } });
        if (!isMember(plan, userId)) fail(403, 'NOT_A_MEMBER', 'Bạn không còn thuộc nhóm kế hoạch này.');
        return plan;
    }

    async function mutate(executionId, userId, callback) {
        const actor = idOf(userId), execId = idOf(executionId);
        return db.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor} FOR UPDATE`;
            const initial = await tx.trip_executions.findUnique({ where: { id: execId } });
            if (!initial || initial.user_id !== actor) fail(404, 'NOT_FOUND', 'Không tìm thấy phiên thực thi.');
            await tx.$queryRaw`SELECT id FROM itineraries WHERE id = ${initial.itinerary_id} FOR UPDATE`;
            await member(tx, initial.itinerary_id, actor);
            await tx.$queryRaw`SELECT id FROM trip_executions WHERE id = ${execId} FOR UPDATE`;
            const row = await tx.trip_executions.findUnique({ where: { id: execId }, include: includeStops });
            await callback(tx, row);
            return executionView(await tx.trip_executions.findUnique({ where: { id: execId }, include: includeStops }));
        }, { isolationLevel: 'ReadCommitted' });
    }

    function checkVersion(row, version) {
        if (!Number.isInteger(version) || version < 0) fail(400, 'INVALID_VERSION', 'Thiếu phiên bản cập nhật.');
        if (row.version !== version) fail(409, 'VERSION_CONFLICT', 'Tiến độ đã thay đổi. Hãy tải lại.');
        if (row.status !== 'active') fail(409, 'EXECUTION_FINISHED', 'Chuyến đi đã kết thúc.');
    }

    return {
        async start(itineraryId, userId) {
            const planId = idOf(itineraryId), actor = idOf(userId);
            return db.$transaction(async tx => {
                await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor} FOR UPDATE`;
                await tx.$queryRaw`SELECT id FROM itineraries WHERE id = ${planId} FOR UPDATE`;
                const plan = await member(tx, planId, actor);
                const existing = await tx.trip_executions.findUnique({ where: { itinerary_id_user_id: { itinerary_id: planId, user_id: actor } }, include: includeStops });
                if (existing) return executionView(existing);
                if (await tx.trip_executions.findUnique({ where: { active_user_id: actor } })) fail(409, 'ANOTHER_EXECUTION_ACTIVE', 'Hãy kết thúc chuyến đang thực hiện trước.');
                const items = await tx.itinerary_items.findMany({ where: { itinerary_id: planId }, include: { locations: true, businesses: true }, orderBy: { sort_order: 'asc' } });
                if (!items.length) fail(400, 'EMPTY_PLAN', 'Kế hoạch cần có ít nhất một điểm dừng.');
                const row = await tx.trip_executions.create({ data: {
                    itinerary_id: planId, user_id: actor, active_user_id: actor, started_at: new Date(),
                    snapshot: { name: plan.name, destination: plan.destination, startDate: plan.start_time?.toISOString() || null, endDate: plan.end_time?.toISOString() || null },
                    stops: { create: items.map((item, index) => {
                        const place = item.locations || item.businesses;
                        return { sort_order: index + 1, snapshot: {
                            sourceItemId: String(item.id), name: place?.name || item.custom_name,
                            day: Number(String(item.note || '').match(/\[DAY:(\d+)\]/i)?.[1]) || 1,
                            note: String(item.note || '').replace(/\[DAY:\d+\]\s*/gi, ''),
                            address: place?.address || '', latitude: place?.latitude == null ? null : Number(place.latitude),
                            longitude: place?.longitude == null ? null : Number(place.longitude),
                            plannedStartTime: item.planned_start_time?.toISOString() || null,
                            plannedEndTime: item.planned_end_time?.toISOString() || null
                        } };
                    }) }
                }, include: includeStops });
                return executionView(row);
            }, { isolationLevel: 'ReadCommitted' });
        },
        async get(itineraryId, userId) {
            const planId = idOf(itineraryId), actor = idOf(userId);
            await member(db, planId, actor);
            const row = await db.trip_executions.findUnique({ where: { itinerary_id_user_id: { itinerary_id: planId, user_id: actor } }, include: includeStops });
            return row ? executionView(row) : null;
        },
        updateStop(executionId, stopId, userId, body) {
            return mutate(executionId, userId, async (tx, row) => {
                const stop = row.stops.find(stop => stop.id === idOf(stopId));
                if (!stop) fail(404, 'NOT_FOUND', 'Điểm dừng không thuộc phiên thực thi.');
                checkTransition(stop.status, body.status);
                if (stop.status === body.status) return;
                checkVersion(row, body.version);
                const timestamp = { arrived: 'arrived_at', completed: 'completed_at', skipped: 'skipped_at' }[body.status];
                await tx.trip_execution_stops.update({ where: { id: stop.id }, data: { status: body.status, [timestamp]: new Date() } });
                await tx.trip_executions.update({ where: { id: row.id }, data: { version: { increment: 1 } } });
            });
        },
        finish(executionId, userId, body) {
            return mutate(executionId, userId, async (tx, row) => {
                if (row.status === 'finished') return;
                checkVersion(row, body.version);
                if (row.stops.some(stop => !['completed', 'skipped'].includes(stop.status))) fail(409, 'UNRESOLVED_STOPS', 'Hãy hoàn thành hoặc bỏ qua các điểm còn lại.');
                await tx.trip_executions.update({ where: { id: row.id }, data: {
                    status: 'finished', finished_at: new Date(), active_user_id: null, version: { increment: 1 },
                    location_sharing: false, sharing_version: { increment: 1 }, ...clearedLocation
                } });
            });
        },
        async setSharing(executionId, userId, body) {
            if (typeof body.enabled !== 'boolean') fail(400, 'INVALID_INPUT', 'enabled phải là boolean.');
            const result = await mutate(executionId, userId, async (tx, row) => {
                if (row.status !== 'active') fail(409, 'EXECUTION_FINISHED', 'Chuyến đi đã kết thúc.');
                await tx.trip_executions.update({ where: { id: row.id }, data: {
                    location_sharing: body.enabled, sharing_version: { increment: 1 }, ...clearedLocation
                } });
            });
            return { ...result, ...(body.enabled ? { uploadToken: generateLocationToken(userId, executionId, result.sharingVersion), uploadTokenExpiresAt: new Date(Date.now() + 86400000).toISOString() } : {}) };
        },
        async stopUpload(executionId, userId, sharingVersion) {
            await db.trip_executions.updateMany({
                where: { id: idOf(executionId), user_id: idOf(userId), sharing_version: sharingVersion },
                data: { location_sharing: false, sharing_version: { increment: 1 }, ...clearedLocation }
            });
        },
        updateLocation(executionId, userId, body) {
            const location = locationInput(body);
            return mutate(executionId, userId, async (tx, row) => {
                if (row.status !== 'active' || !row.location_sharing || row.sharing_version !== body.sharingVersion) fail(409, 'SHARING_DISABLED', 'Phiên chia sẻ vị trí đã dừng.');
                if (row.captured_at && row.captured_at >= location.captured_at) return;
                await tx.trip_executions.update({ where: { id: row.id }, data: location });
            });
        },
        async memberLocations(itineraryId, userId) {
            const planId = idOf(itineraryId), actor = idOf(userId);
            const plan = await member(db, planId, actor);
            const members = [plan.user_id, ...plan.collaborators.map(member => member.user_id)];
            const rows = await db.trip_executions.findMany({ where: {
                itinerary_id: planId, user_id: { in: members }, status: 'active', location_sharing: true,
                captured_at: { gt: new Date(Date.now() - 86400000) }, user: { is_active: true }
            }, include: { user: { select: { full_name: true, avatar_url: true } } } });
            return { items: rows.filter(row => row.latitude != null && row.longitude != null).map(row => ({
                userId: String(row.user_id), name: row.user.full_name, avatarUrl: row.user.avatar_url,
                latitude: row.latitude, longitude: row.longitude, accuracyMeters: row.accuracy_meters,
                capturedAt: row.captured_at, stale: Date.now() - +row.captured_at > 120000
            })) };
        },
        async summaries(userId, query) {
            const actor = idOf(userId), { take, before } = pageInput(query, 50);
            const rows = await db.itineraries.findMany({ where: {
                OR: [{ user_id: actor }, { collaborators: { some: { user_id: actor } } }],
                ...(before ? { id: { lt: before } } : {})
            }, orderBy: { id: 'desc' }, take: take + 1,
            select: { id: true, name: true, destination: true, start_time: true, end_time: true, status: true, updated_at: true,
                _count: { select: { itinerary_items: true } }, executions: { where: { user_id: actor }, select: { status: true } } } });
            const page = rows.slice(0, take);
            return { items: page.map(row => ({ id: String(row.id), name: row.name, destination: row.destination,
                startDate: row.start_time, endDate: row.end_time, status: row.status, updatedAt: row.updated_at,
                stopCount: row._count.itinerary_items, executionStatus: row.executions[0]?.status || null })),
                nextCursor: rows.length > take ? String(page.at(-1).id) : null };
        },
        purgeLocations() {
            return db.trip_executions.updateMany({ where: { captured_at: { lte: new Date(Date.now() - 86400000) } }, data: clearedLocation });
        }
    };
}

export const executionService = createExecutionService();
