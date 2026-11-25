import prisma from '../config/db.js';
import { Prisma } from '@prisma/client';
import { saveCommunityPhotos, removeCommunityPhotos } from './communityPhotos.js';
import { createNotification } from './notificationService.js';
import { createItinerary } from './itineraryService.js';

const authorSelect = { id: true, full_name: true, avatar_url: true };
const postInclude = { author: { select: authorSelect }, _count: { select: { comments: true, ratings: true } } };
const authorDTO = author => ({ id: String(author.id), name: author.full_name, avatarUrl: author.avatar_url });
const commentDTO = comment => ({ id: String(comment.id), content: comment.content, createdAt: comment.created_at, author: authorDTO(comment.author) });
const fail = (status, message) => { throw { status, message }; };
const idValue = value => {
  if (!/^[1-9]\d{0,18}$/.test(String(value)) || BigInt(value) > 9223372036854775807n) fail(400, 'Mã không hợp lệ.');
  return BigInt(value);
};
const text = (value, name, max) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `${name} phải có từ 1 đến ${max} ký tự.`);
  return value.trim();
};

function postInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Dữ liệu bài viết không hợp lệ.');
  const title = text(input.title, 'Tiêu đề', 200);
  const destination = text(input.destination, 'Điểm đến', 200);
  const content = input.content === undefined ? '' : typeof input.content === 'string' && input.content.trim().length <= 10000 ? input.content.trim() : fail(400, 'Nội dung phải là văn bản tối đa 10000 ký tự.');
  const day = String(input.traveledOn || '');
  const date = new Date(`${day}T00:00:00Z`);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day || day < '1000-01-01' || day > today) fail(400, 'Ngày trải nghiệm phải hợp lệ và không ở tương lai.');
  let coverImage = null;
  if (input.coverImage) {
    coverImage = text(input.coverImage, 'Đường dẫn ảnh', 500);
    let url;
    try { url = new URL(coverImage); } catch { fail(400, 'Đường dẫn ảnh không hợp lệ.'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail(400, 'Ảnh phải là một đường dẫn HTTP hoặc HTTPS.');
  }
  return { title, destination, content, traveled_on: date, cover_image: coverImage };
}

async function requirePost(id) {
  const post = await prisma.trip_posts.findUnique({ where: { id: idValue(id) } });
  if (!post) fail(404, 'Bài viết không còn tồn tại.');
  return post;
}

async function serializePosts(posts, viewerId) {
  const ids = posts.map(post => post.id);
  const [averages, mine] = await Promise.all([
    prisma.trip_post_ratings.groupBy({ by: ['post_id'], where: { post_id: { in: ids } }, _avg: { rating: true } }),
    viewerId ? prisma.trip_post_ratings.findMany({ where: { post_id: { in: ids }, user_id: idValue(viewerId) } }) : [],
  ]);
  const averageById = new Map(averages.map(row => [String(row.post_id), row._avg.rating]));
  const mineById = new Map(mine.map(row => [String(row.post_id), row.rating]));
  return posts.map(post => ({
    id: String(post.id), title: post.title, destination: post.destination, content: post.content,
    traveledOn: post.traveled_on.toISOString().slice(0, 10), coverImage: post.cover_image,
    photos: post.photos || [],
    plan: post.itinerary_snapshot && !Array.isArray(post.itinerary_snapshot) ? post.itinerary_snapshot : null,
    itinerary: Array.isArray(post.itinerary_snapshot) ? post.itinerary_snapshot : post.itinerary_snapshot?.items || [],
    author: authorDTO(post.author),
    createdAt: post.created_at, updatedAt: post.updated_at,
    commentCount: post._count.comments, ratingCount: post._count.ratings,
    averageRating: averageById.get(String(post.id)) || null, myRating: mineById.get(String(post.id)) || null,
  }));
}

export async function listPosts(viewerId, before, filters = {}) {
  const and = [];
  const numeric = (key, max, integer = false) => {
    const value = filters[key];
    if (value === undefined || value === '') return null;
    if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) fail(400, 'Bộ lọc không hợp lệ.');
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > max || (integer && !Number.isInteger(number))) fail(400, 'Bộ lọc không hợp lệ.');
    return number;
  };
  if (filters.destination) and.push({ destination: { contains: text(filters.destination, 'Điểm đến', 200) } });
  const days = numeric('days', 365, true);
  if (days !== null) {
    if (days < 1) fail(400, 'Số ngày phải từ 1 đến 365.');
    and.push({ itinerary_snapshot: { path: '$.totalDays', equals: days } });
  }
  const budget = numeric('maxBudget', 999999999999);
  if (budget !== null) and.push({ itinerary_snapshot: { path: '$.budget', gte: 0, lte: budget } });
  if (filters.companions) {
    if (filters.companions === 'solo') and.push({ itinerary_snapshot: { path: '$.travelerCount', equals: 1 } });
    else if (filters.companions === 'group') and.push({ itinerary_snapshot: { path: '$.travelerCount', gt: 1 } });
    else fail(400, 'Người đồng hành không hợp lệ.');
  }
  if (filters.transportMode) {
    if (typeof filters.transportMode !== 'string' || !/^(flight|coach|train|motorbike|car|other)$/.test(filters.transportMode)) fail(400, 'Phương tiện không hợp lệ.');
    and.push({ itinerary_snapshot: { path: '$.transportMode', equals: filters.transportMode } });
  }
  if (filters.preference) {
    if (typeof filters.preference !== 'string' || !/^(beach|mountain|food|culture|nature|shopping|nightlife|adventure|relax|photography)$/.test(filters.preference)) fail(400, 'Sở thích không hợp lệ.');
    and.push({ itinerary_snapshot: { path: '$.preferences', array_contains: [filters.preference] } });
  }
  const stars = numeric('minRating', 5);
  if (stars !== null && stars > 0) {
    const rated = await prisma.trip_post_ratings.groupBy({ by: ['post_id'], _avg: { rating: true }, having: { rating: { _avg: { gte: stars } } } });
    and.push({ id: { in: rated.map(row => row.post_id) } });
  }
  if (before) and.push({ id: { lt: idValue(before) } });
  const posts = await prisma.trip_posts.findMany({ where: and.length ? { AND: and } : {}, include: postInclude, orderBy: { id: 'desc' }, take: 21 });
  return { posts: await serializePosts(posts.slice(0, 20), viewerId), nextCursor: posts.length > 20 ? String(posts[19].id) : null };
}

export async function getPost(id, viewerId, beforeComment) {
  const post = await prisma.trip_posts.findUnique({ where: { id: idValue(id) }, include: { ...postInclude, ratings: { include: { author: { select: authorSelect } }, orderBy: { id: 'desc' } } } });
  if (!post) fail(404, 'Bài viết không còn tồn tại.');
  const comments = await prisma.trip_post_comments.findMany({
    where: { post_id: post.id, parent_id: null, ...(beforeComment ? { id: { lt: idValue(beforeComment) } } : {}) },
    include: { author: { select: authorSelect }, replies: { include: { author: { select: authorSelect } }, orderBy: { id: 'asc' } } }, orderBy: { id: 'desc' }, take: 31,
  });
  return { ...(await serializePosts([post], viewerId))[0],
    ratings: post.ratings.map(item => ({ author: authorDTO(item.author), rating: item.rating })),
    comments: comments.slice(0, 30).map(comment => ({ ...commentDTO(comment), replies: comment.replies.map(commentDTO) })),
    nextCommentCursor: comments.length > 30 ? String(comments[29].id) : null,
  };
}

export async function createPost(userId, input) {
  const data = postInput(input);
  if (Object.hasOwn(input, 'includeItinerary')) fail(409, 'Cách chia sẻ đã được cập nhật. Hãy tải lại trang để xem kế hoạch sẽ công khai trước khi đăng.');
  const trip = await ownTrip(input.itineraryId, userId);
  const { photos, created } = await saveCommunityPhotos(input.photos ?? []);
  let post;
  try { post = await prisma.trip_posts.create({ data: { ...data, destination: trip.destination || data.destination, cover_image: photos[0] || data.cover_image, photos, user_id: idValue(userId), itinerary_id: trip.id, itinerary_snapshot: publicPlan(trip) } }); }
  catch (error) { await removeCommunityPhotos(created); throw error; }
  return getPost(post.id, userId);
}

async function ownTrip(id, userId) {
  if (!id) fail(400, 'Hãy chọn một kế hoạch đã tạo để chia sẻ.');
  const trip = await prisma.itineraries.findUnique({ where: { id: idValue(id) }, include: { itinerary_items: { orderBy: { sort_order: 'asc' }, include: { locations: true, businesses: true } } } });
  if (!trip || trip.user_id !== idValue(userId)) fail(403, 'Bạn chỉ được chia sẻ kế hoạch của mình.');
  return trip;
}

function publicPlan(trip) {
  return { name: trip.name, destination: trip.destination, startDate: (trip.start_time || trip.trip_date)?.toISOString() || null, endDate: trip.end_time?.toISOString() || null,
    totalDays: trip.total_days || (trip.end_time && (trip.start_time || trip.trip_date) ? Math.max(1, Math.round((Date.parse(calendarDate(trip.end_time)) - Date.parse(calendarDate(trip.start_time || trip.trip_date))) / 86400000) + 1) : 1),
    travelerCount: trip.traveler_count, transportMode: trip.transport_mode, preferences: trip.preferences || [], budget: trip.budget == null ? null : Number(trip.budget),
    items: trip.itinerary_items.map(item => {
      const place = item.locations || item.businesses;
      return { name: item.custom_name || place?.name || 'Điểm dừng', day: Number(String(item.note || '').match(/\[DAY:(\d+)\]/i)?.[1]) || dayOfPlan(item.planned_start_time, trip.start_time || trip.trip_date), startTime: item.planned_start_time?.toISOString() || null, endTime: item.planned_end_time?.toISOString() || null,
        durationMinutes: item.duration_minutes, travelMinutes: item.travel_minutes, address: place?.address || null,
        latitude: place ? Number(place.latitude) : null, longitude: place ? Number(place.longitude) : null };
    }),
  };
}

const calendarDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
const dayOfPlan = (time, start) => time && start ? Math.max(1, Math.round((Date.parse(calendarDate(time)) - Date.parse(calendarDate(start))) / 86400000) + 1) : 1;

export async function copyPostPlan(postId, userId) {
  const post = await requirePost(postId);
  const plan = post.itinerary_snapshot;
  if (!plan || Array.isArray(plan) || !Array.isArray(plan.items)) fail(400, 'Bài viết này chưa có kế hoạch để sao chép.');
  const items = plan.items.map(item => ({
    customName: item.name, day: item.day || dayOfPlan(item.startTime, plan.startDate),
    startTime: item.startTime, endTime: item.endTime, durationMinutes: item.durationMinutes, travelMinutes: item.travelMinutes,
    ...(item.latitude != null && item.longitude != null ? { manualLocation: { name: item.name, address: item.address, latitude: item.latitude, longitude: item.longitude } } : {}),
  }));
  return createItinerary(userId, {
    name: `${plan.name || post.title} (bản sao)`.slice(0, 200), destination: plan.destination || post.destination,
    startDate: plan.startDate, endDate: plan.endDate,
    totalDays: Math.max(plan.totalDays || 1, ...items.map(item => item.day)),
    travelerCount: plan.travelerCount || 1, transportMode: plan.transportMode, budget: plan.budget,
    preferences: plan.preferences || [], status: 'draft', visibility: 'private', items,
  });
}

export async function updatePost(id, userId, input) {
  const post = await requirePost(id);
  if (post.user_id !== idValue(userId)) fail(403, 'Chỉ tác giả được chỉnh sửa bài viết.');
  const data = postInput(input);
  const trip = input.itineraryId ? await ownTrip(input.itineraryId, userId) : null;
  if (!trip && (!post.itinerary_snapshot || Array.isArray(post.itinerary_snapshot))) fail(400, 'Hãy chọn một kế hoạch đã tạo để đính kèm bài viết.');
  const { photos, created } = await saveCommunityPhotos(input.photos ?? post.photos ?? [], post.photos || []);
  try {
    const updated = await prisma.trip_posts.updateMany({ where: { id: post.id, photos: { equals: post.photos ?? Prisma.DbNull } }, data: { ...data, photos, cover_image: photos[0] || data.cover_image,
      ...(trip ? { itinerary_id: trip.id, destination: trip.destination || data.destination, itinerary_snapshot: publicPlan(trip) } : {}) } });
    if (!updated.count) fail(409, 'Ảnh của bài viết đã thay đổi ở phiên khác. Hãy mở lại bài viết trước khi lưu.');
  }
  catch (error) { await removeCommunityPhotos(created); throw error; }
  await removeCommunityPhotos((post.photos || []).filter(photo => !photos.includes(photo)));
  return getPost(post.id, userId);
}

export async function deletePost(id, userId) {
  const post = await requirePost(id);
  if (post.user_id !== idValue(userId)) fail(403, 'Chỉ tác giả được xóa bài viết.');
  const deleted = await prisma.trip_posts.deleteMany({ where: { id: post.id, photos: { equals: post.photos ?? Prisma.DbNull } } });
  if (!deleted.count) fail(409, 'Bài viết vừa thay đổi ở phiên khác. Hãy tải lại trước khi xóa.');
  await removeCommunityPhotos(post.photos || []);
}

export async function addComment(id, userId, input) {
  const content = text(input?.content, 'Bình luận', 2000);
  const post = await requirePost(id);
  let parent = null;
  if (input?.parentId != null) {
    if (post.user_id !== idValue(userId)) fail(403, 'Chỉ tác giả bài viết được phản hồi bình luận.');
    parent = await prisma.trip_post_comments.findUnique({ where: { id: idValue(input.parentId) } });
    if (!parent || parent.post_id !== post.id || parent.parent_id !== null) fail(404, 'Không tìm thấy bình luận gốc trong bài viết này.');
  }
  const comment = await prisma.trip_post_comments.create({ data: { post_id: post.id, user_id: idValue(userId), content, parent_id: parent?.id ?? null }, include: { author: { select: authorSelect } } });
  if (parent && parent.user_id !== comment.user_id) await createNotification({
    userId: parent.user_id, type: 'community_reply', title: 'Phản hồi mới cho bình luận của bạn',
    message: `${comment.author.full_name} đã trả lời bình luận của bạn trong bài viết "${post.title}": ${content}`,
  });
  if (post.user_id !== comment.user_id) await createNotification({
    userId: post.user_id, type: 'community_comment', title: 'Bình luận mới trên bài viết của bạn',
    message: `${comment.author.full_name} đã bình luận bài viết "${post.title}": ${content}`,
  });
  const result = await getPost(post.id, userId);
  return parent ? { ...result, reply: commentDTO(comment) } : result;
}

export async function deleteComment(postId, commentId, userId) {
  const comment = await prisma.trip_post_comments.findUnique({ where: { id: idValue(commentId) }, include: { post: true } });
  if (!comment || comment.post_id !== idValue(postId)) fail(404, 'Không tìm thấy bình luận.');
  if (comment.user_id !== idValue(userId) && comment.post.user_id !== idValue(userId)) fail(403, 'Bạn không có quyền xóa bình luận này.');
  await prisma.trip_post_comments.delete({ where: { id: comment.id } });
}

export async function ratePost(id, userId, value) {
  if (!Number.isInteger(value) || value < 1 || value > 5) fail(400, 'Đánh giá phải là số nguyên từ 1 đến 5 sao.');
  const post = await requirePost(id);
  if (post.user_id === idValue(userId)) fail(403, 'Bạn không thể tự đánh giá bài viết của mình.');
  const where = { post_id_user_id: { post_id: post.id, user_id: idValue(userId) } };
  const previous = await prisma.trip_post_ratings.findUnique({ where });
  const rating = await prisma.trip_post_ratings.upsert({ where, create: { post_id: post.id, user_id: idValue(userId), rating: value }, update: { rating: value }, include: { author: { select: authorSelect } } });
  if (previous?.rating !== value) await createNotification({
    userId: post.user_id, type: 'community_rating', title: 'Đánh giá mới trên bài viết của bạn',
    message: `${rating.author.full_name} đã đánh giá ${value}/5 sao cho bài viết "${post.title}".`,
  });
  return getPost(post.id, userId);
}

export async function removeRating(id, userId) {
  await prisma.trip_post_ratings.deleteMany({ where: { post_id: idValue(id), user_id: idValue(userId) } });
  return getPost(id, userId);
}
