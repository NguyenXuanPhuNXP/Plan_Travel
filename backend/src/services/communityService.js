import prisma from '../config/db.js';
import { Prisma } from '@prisma/client';
import { saveCommunityPhotos, removeCommunityPhotos } from './communityPhotos.js';

const authorSelect = { id: true, full_name: true, avatar_url: true };
const postInclude = { author: { select: authorSelect }, _count: { select: { comments: true, ratings: true } } };
const authorDTO = author => ({ id: String(author.id), name: author.full_name, avatarUrl: author.avatar_url });
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

export async function listPosts(viewerId, before) {
  const posts = await prisma.trip_posts.findMany({ where: before ? { id: { lt: idValue(before) } } : {}, include: postInclude, orderBy: { id: 'desc' }, take: 21 });
  return { posts: await serializePosts(posts.slice(0, 20), viewerId), nextCursor: posts.length > 20 ? String(posts[19].id) : null };
}

export async function getPost(id, viewerId, beforeComment) {
  const post = await prisma.trip_posts.findUnique({ where: { id: idValue(id) }, include: postInclude });
  if (!post) fail(404, 'Bài viết không còn tồn tại.');
  const comments = await prisma.trip_post_comments.findMany({
    where: { post_id: post.id, ...(beforeComment ? { id: { lt: idValue(beforeComment) } } : {}) },
    include: { author: { select: authorSelect } }, orderBy: { id: 'desc' }, take: 31,
  });
  return { ...(await serializePosts([post], viewerId))[0],
    comments: comments.slice(0, 30).map(comment => ({ id: String(comment.id), content: comment.content, createdAt: comment.created_at, author: authorDTO(comment.author) })),
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
    totalDays: trip.total_days, travelerCount: trip.traveler_count, transportMode: trip.transport_mode, budget: trip.budget == null ? null : Number(trip.budget),
    items: trip.itinerary_items.map(item => {
      const place = item.locations || item.businesses;
      return { name: item.custom_name || place?.name || 'Điểm dừng', startTime: item.planned_start_time?.toISOString() || null, endTime: item.planned_end_time?.toISOString() || null,
        durationMinutes: item.duration_minutes, travelMinutes: item.travel_minutes, address: place?.address || null,
        latitude: place ? Number(place.latitude) : null, longitude: place ? Number(place.longitude) : null };
    }),
  };
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
  await prisma.trip_post_comments.create({ data: { post_id: post.id, user_id: idValue(userId), content } });
  return getPost(post.id, userId);
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
  await prisma.trip_post_ratings.upsert({ where: { post_id_user_id: { post_id: post.id, user_id: idValue(userId) } }, create: { post_id: post.id, user_id: idValue(userId), rating: value }, update: { rating: value } });
  return getPost(post.id, userId);
}

export async function removeRating(id, userId) {
  await prisma.trip_post_ratings.deleteMany({ where: { post_id: idValue(id), user_id: idValue(userId) } });
  return getPost(id, userId);
}
