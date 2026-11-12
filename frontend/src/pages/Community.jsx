import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, MapPin, MessageCircle, PenLine, Star, Trash2, Pencil, Loader2 } from 'lucide-react';
import Layout from '../Components/Layout/Layout';
import PlanDialog from '../Components/Layout/PlanDialog';
import { useAuth } from '../context/AuthContext';
import { communityService, communityImageUrl } from '../services/communityService';
import { itineraryService } from '../services/itineraryService';
import CommunityPlan from '../Components/CommunityPlan';
import { prepareTripPhotos } from '../utils/tripPhotos';
import { destinationImage, handleImageError } from '../utils/destinationImages';
import './Community.css';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const errorText = error => error.response?.data?.message || 'Chưa kết nối được máy chủ. Vui lòng thử lại.';
const displayDate = value => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const ratingText = post => post.ratingCount ? `${Number(post.averageRating).toFixed(1)}/5 (${post.ratingCount})` : 'Chưa có đánh giá';

const tripFields = trip => {
  const date = trip.endDate || trip.tripDate || trip.startDate;
  const day = date ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(date)) : '';
  return { title: trip.title || trip.name, destination: trip.destination || '', traveledOn: day && day <= today() ? day : '' };
};

function PostComposer({ user, post, initialTripId = '', onClose, onSaved }) {
  const [form, setForm] = useState({ title: post?.title || '', destination: post?.destination || '', content: post?.content || '', traveledOn: post?.traveledOn || '', coverImage: post?.coverImage?.startsWith('http') ? post.coverImage : '', itineraryId: initialTripId, photos: post?.photos || [] });
  const [trips, setTrips] = useState([]);
  const [tripError, setTripError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(!post?.plan);
  const [tripReload, setTripReload] = useState(0);
  useEffect(() => {
    if (post?.plan) return;
    let active = true;
    setLoadingTrips(true); setTripError('');
    itineraryService.getAll().then(rows => {
      if (!active) return;
      const own = rows.filter(trip => String(trip.userId) === String(user.id));
      setTrips(own);
      if (initialTripId) {
        const selected = own.find(trip => String(trip.id) === initialTripId);
        if (selected) setForm(current => ({ ...current, ...tripFields(selected), itineraryId: initialTripId }));
        else { setForm(current => ({ ...current, itineraryId: '' })); setTripError('Không tìm thấy kế hoạch này trong các chuyến đi của bạn.'); }
      }
    }).catch(() => { if (active) setTripError('Chưa tải được kế hoạch đã lưu. Hãy thử tải lại.'); }).finally(() => { if (active) setLoadingTrips(false); });
    return () => { active = false; };
  }, [user.id, post, initialTripId, tripReload]);
  const selectTrip = id => {
    const trip = trips.find(item => String(item.id) === id);
    setForm(current => ({ ...current, itineraryId: id, ...(trip ? tripFields(trip) : { destination: '' }) }));
  };
  const selectedTrip = trips.find(trip => String(trip.id) === form.itineraryId);
  const previewPlan = selectedTrip ? { ...selectedTrip, budget: selectedTrip.budget > 0 ? selectedTrip.budget : null, items: (selectedTrip.items || []).map(stop => ({ name: stop.customName || stop.name || stop.location?.name || 'Điểm dừng', startTime: stop.startTime, endTime: stop.endTime, durationMinutes: stop.durationMinutes, travelMinutes: stop.travelMinutes, address: stop.location?.address, latitude: stop.location?.latitude, longitude: stop.location?.longitude })) } : post?.plan;
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const addPhotos = async event => {
    const files = [...event.target.files]; event.target.value = '';
    if (!files.length) return;
    setError(''); setProcessing(true);
    try {
      if (files.length + form.photos.length > 8) throw new Error('Mỗi bài viết được thêm tối đa 8 ảnh.');
      const photos = [...form.photos, ...await prepareTripPhotos(files)];
      if (photos.reduce((size, photo) => size + (photo.startsWith('data:') ? photo.length * 0.75 : 0), 0) > 8 * 1024 * 1024) throw new Error('Tổng ảnh mới vượt quá 8 MB. Hãy bớt ảnh trước khi đăng.');
      setForm(current => ({ ...current, photos }));
    } catch (error) { setError(error.message); } finally { setProcessing(false); }
  };
  const save = async event => {
    event.preventDefault();
    if (saving || processing || !previewPlan) return;
    setSaving(true); setError('');
    try { onSaved(post ? await communityService.update(post.id, form) : await communityService.create(form)); }
    catch (error) { setError(errorText(error)); }
    finally { setSaving(false); }
  };
  return <PlanDialog title={post ? 'Sửa kế hoạch chia sẻ' : 'Chia sẻ kế hoạch đã trải nghiệm'} onClose={onClose} busy={saving || processing} className="community-share-dialog">
    <form className="community-form" onSubmit={save}>
      <fieldset disabled={saving || processing} className="community-form-fields">
      <p>Chọn kế hoạch bạn đã tạo để mọi người xem lịch trình từng ngày, ngân sách dự kiến và ảnh chụp từ chuyến đi. Ghi chú riêng, chi tiêu thực tế, thành viên và trò chuyện không được đính kèm.</p>
      {!post?.plan && <label>Kế hoạch đã tạo<select required disabled={loadingTrips} value={form.itineraryId} onChange={event => selectTrip(event.target.value)}><option value="">{loadingTrips ? 'Đang tải kế hoạch…' : 'Chọn kế hoạch của bạn'}</option>{trips.map(trip => <option key={trip.id} value={trip.id}>{trip.title || trip.name}</option>)}</select></label>}
      {tripError && <p role="alert">{tripError} <button type="button" className="community-text-button" onClick={() => setTripReload(value => value + 1)}>Tải lại kế hoạch</button></p>}
      {!post?.plan && !loadingTrips && !tripError && !trips.length && <p>Bạn chưa có kế hoạch nào. <Link className="community-text-button" to="/planner">Tạo kế hoạch trước khi chia sẻ</Link>.</p>}
      <label>Tiêu đề<input name="title" required maxLength={200} value={form.title} onChange={change} placeholder="Một cuối tuần đáng nhớ ở Hội An" /></label>
      <div className="community-form-row"><label>Điểm đến<input name="destination" required readOnly={!!previewPlan?.destination} value={form.destination} onChange={change} placeholder="Điểm đến của kế hoạch" /></label><label>Ngày đã trải nghiệm<input name="traveledOn" required type="date" max={today()} value={form.traveledOn} onChange={change} /></label></div>
      <label>Cảm nhận & kinh nghiệm (tùy chọn)<textarea name="content" maxLength={10000} rows={5} value={form.content} onChange={change} placeholder="Điều gì trong lịch trình này hữu ích? Bạn có lưu ý nào muốn chia sẻ với người đi sau?" /></label>
      <label>Ảnh chụp từ chuyến đi<input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-describedby="community-photo-help" onChange={addPhotos} /></label>
      <p id="community-photo-help">Tối đa 8 ảnh JPG, PNG hoặc WebP; ảnh được tự động thu nhỏ trước khi đăng. Ảnh đầu tiên làm ảnh bìa.</p>
      {processing && <p role="status">Đang chuẩn bị ảnh…</p>}
      {!!form.photos.length && <div className="community-photo-preview">{form.photos.map((photo, index) => <figure key={index}><img src={communityImageUrl(photo)} alt={`Ảnh chuyến đi ${index + 1}`} /><button type="button" aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => setForm(current => ({ ...current, photos: current.photos.filter((_, photoIndex) => photoIndex !== index) }))}><Trash2 size={15} /> Bỏ ảnh</button></figure>)}</div>}
      {previewPlan && <div className="community-plan-preview"><CommunityPlan plan={previewPlan} /></div>}
      {error && <p role="alert" className="community-error">{error}</p>}
      <button className="btn btn-primary" disabled={saving || processing || !previewPlan}>{saving ? <Loader2 size={18} className="animate-spin" /> : <PenLine size={18} />}{saving ? 'Đang lưu…' : post ? 'Lưu thay đổi' : 'Chia sẻ kế hoạch'}</button>
      </fieldset>
    </form>
  </PlanDialog>;
}

function PostDetail({ id, user, onClose, onChange }) {
  const location = useLocation();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    communityService.get(id).then(data => { if (active) setPost(data); }).catch(error => { if (active) setError(errorText(error)); });
    return () => { active = false; };
  }, [id]);
  const update = next => { setPost(next); onChange(next); };
  const action = async run => {
    if (busy) return;
    setBusy(true); setError('');
    try { await run(); } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  };
  const sendComment = event => { event.preventDefault(); action(async () => { update(await communityService.comment(id, comment)); setComment(''); }); };
  return <PlanDialog title={post?.title || 'Kế hoạch được chia sẻ'} onClose={onClose} className="community-post-dialog">
    <div className="community-detail">
      {error && <p role="alert" className="community-error">{error}</p>}
      {!post && !error && <p role="status">Đang tải câu chuyện…</p>}
      {post && <>
        <p className="community-byline">{post.author.name} · {displayDate(post.traveledOn)} · {post.destination}</p>
        {post.content && <p className="community-story-text">{post.content}</p>}
        {post.plan ? <CommunityPlan plan={post.plan} /> : !!post.itinerary.length && <section className="community-attached"><h3>Những điểm đã ghé</h3><ol>{post.itinerary.map((stop, index) => <li key={index}>{stop.name}{stop.startTime && <time> · {new Date(stop.startTime).toLocaleString('vi-VN')}</time>}</li>)}</ol></section>}
        {post.photos?.length ? <section className="community-trip-photos"><h3>Ảnh từ chuyến đi ({post.photos.length})</h3><div className="community-photo-gallery">{post.photos.map((photo, index) => <a key={photo} href={communityImageUrl(photo)} target="_blank" rel="noreferrer" aria-label={`Mở ảnh chuyến đi ${index + 1}`}><img src={communityImageUrl(photo)} alt={`Ảnh ${index + 1} trong chuyến đi ${post.destination} của ${post.author.name}`} loading="lazy" onError={handleImageError} /></a>)}</div><p>Mở ảnh để xem kích thước lớn.</p></section> : <><img className="community-detail-cover" src={communityImageUrl(post.coverImage) || destinationImage(post.destination)} alt={post.coverImage ? `Ảnh chuyến đi ${post.destination}` : `Ảnh minh họa ${post.destination}`} onError={handleImageError} referrerPolicy="no-referrer" />{!post.coverImage && <p className="community-photo-note">Ảnh minh họa điểm đến</p>}</>}
        <section className="community-ratings"><h3>Đánh giá chuyến đi</h3><p>{ratingText(post)}</p>
          {user && String(user.id) !== post.author.id && <><div className="community-stars" role="group" aria-label="Chấm điểm chuyến đi">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" disabled={busy} aria-label={`${value} sao`} aria-pressed={post.myRating === value} onClick={() => action(async () => update(await communityService.rate(id, value)))}><Star size={28} fill={value <= (post.myRating || 0) ? 'currentColor' : 'none'} /></button>)}</div>{post.myRating && <button className="community-text-button" disabled={busy} onClick={() => action(async () => update(await communityService.removeRating(id)))}>Gỡ đánh giá của tôi</button>}</>}
          {user && String(user.id) === post.author.id && <p>Đánh giá từ những người đọc trải nghiệm của bạn.</p>}
        </section>
        <section className="community-comments"><h3>Bình luận ({post.commentCount})</h3>
          {user ? <form onSubmit={sendComment}><label className="community-sr-only" htmlFor="trip-comment">Nội dung bình luận</label><textarea id="trip-comment" disabled={busy} required maxLength={2000} rows={3} placeholder="Chia sẻ cảm nhận hoặc hỏi thêm về chuyến đi…" value={comment} onChange={event => setComment(event.target.value)} /><button className="btn btn-forest" disabled={busy || !comment.trim()}>{busy ? 'Đang xử lý…' : 'Gửi bình luận'}</button></form> : <p><Link to="/login" state={{ from: location.pathname + location.search }}>Đăng nhập</Link> để bình luận và đánh giá chuyến đi.</p>}
          {!post.comments.length && <p>Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện.</p>}
          {post.comments.map(item => <article className="community-comment" key={item.id}><div><strong>{item.author.name}</strong><time>{displayDate(item.createdAt)}</time></div><p>{item.content}</p>{user && (String(user.id) === item.author.id || String(user.id) === post.author.id) && <button type="button" className="community-text-button" disabled={busy} onClick={() => action(async () => { await communityService.deleteComment(id, item.id); update(await communityService.get(id)); })}>Xóa bình luận</button>}</article>)}
          {post.nextCommentCursor && <button className="btn btn-outline" disabled={busy} onClick={() => action(async () => { const next = await communityService.get(id, post.nextCommentCursor); setPost(current => ({ ...current, comments: [...current.comments, ...next.comments], nextCommentCursor: next.nextCommentCursor })); })}>Xem bình luận trước</button>}
        </section>
      </>}
    </div>
  </PlanDialog>;
}

function CommunityFeed({ user }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState(() => user && params.get('share') ? {} : null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    communityService.list().then(data => { if (active) { setPosts(data.posts); setCursor(data.nextCursor); setError(''); } }).catch(error => { if (active) setError(errorText(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const changed = post => setPosts(current => current.map(item => item.id === post.id ? post : item));
  const remove = async post => {
    if (busy || !window.confirm('Xóa bài viết và các bình luận, đánh giá của bài viết này?')) return;
    setBusy(true);
    try { await communityService.delete(post.id); setPosts(current => current.filter(item => item.id !== post.id)); }
    catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  };
  const loadMore = async () => {
    setBusy(true);
    try { const data = await communityService.list(cursor); setPosts(current => [...current, ...data.posts.filter(post => !current.some(item => item.id === post.id))]); setCursor(data.nextCursor); }
    catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  };
  return <Layout><div className="community-page">
    <header className="community-hero"><div><h1>Đi rồi,<br />kể nhau nghe.</h1><p>Khám phá kế hoạch đã được cộng đồng trải nghiệm: lịch trình từng ngày, điểm dừng và những bức ảnh từ chuyến đi.</p>{user ? <button className="btn btn-primary" onClick={() => setComposer({})}><PenLine size={18} /> Chia sẻ kế hoạch</button> : <Link className="btn btn-primary" to="/login" state={{ from: '/community' }}>Đăng nhập để chia sẻ</Link>}</div><img src="/images/destinations/hoi-an.jpg" alt="Phố cổ Hội An, nguồn cảm hứng cho hành trình mới" width="960" height="640" onError={handleImageError} /></header>
    <div className="community-heading"><h2>Bản tin chuyến đi</h2><span>Trải nghiệm từ cộng đồng PlanTravel</span></div>
    {error && <div className="community-error" role="alert">{error} <button className="community-text-button" onClick={() => setReload(value => value + 1)}>Thử lại</button></div>}
    {loading && <p role="status">Đang tải các câu chuyện…</p>}
    {!loading && !error && !posts.length && <div className="community-empty"><h3>Mỗi chuyến đi đều có chuyện để kể.</h3><p>Chưa có bài viết nào. Hãy chia sẻ trải nghiệm đầu tiên của bạn với cộng đồng.</p></div>}
    <div className="community-feed">{posts.map(post => <article className="community-post" key={post.id}>
      <div className="community-post-cover"><img src={communityImageUrl(post.photos?.[0] || post.coverImage) || destinationImage(post.destination)} alt={post.coverImage || post.photos?.length ? post.title : `Ảnh minh họa ${post.destination}`} loading="lazy" width="960" height="640" onError={handleImageError} referrerPolicy="no-referrer" />{!post.coverImage && !post.photos?.length && <span>Ảnh minh họa điểm đến</span>}</div>
      <div className="community-post-body"><p className="community-byline">{post.author.name} · {displayDate(post.traveledOn)}</p><h3>{post.title}</h3><p className="community-post-destination"><MapPin size={15} />{post.destination}</p>{post.content && <p className="community-post-excerpt">{post.content}</p>}<div className="community-post-stats"><span><Star size={16} />{ratingText(post)}</span><span><MessageCircle size={16} />{post.commentCount} bình luận</span></div>
        {post.plan && <p className="community-plan-summary">{post.plan.totalDays > 0 ? `${post.plan.totalDays} ngày · ` : ''}{post.plan.items.length} điểm dừng{post.photos?.length ? ` · ${post.photos.length} ảnh` : ''}</p>}
        {post.plan && <CommunityPlan plan={post.plan} />}
        <div className="community-post-actions"><button className="community-read" onClick={() => setParams({ post: post.id })}>{post.plan ? 'Xem kế hoạch & ảnh' : 'Đọc hành trình'} <ArrowUpRight size={18} /></button>{user && String(user.id) === post.author.id && <div><button aria-label={`Sửa bài ${post.title}`} onClick={() => setComposer(post)}><Pencil size={18} /></button><button disabled={busy} aria-label={`Xóa bài ${post.title}`} onClick={() => remove(post)}><Trash2 size={18} /></button></div>}</div>
      </div>
    </article>)}</div>
    {cursor && <button className="btn btn-outline community-load-more" disabled={busy} onClick={loadMore}>{busy ? 'Đang tải…' : 'Xem thêm chuyến đi'}</button>}
    {composer && user && <PostComposer user={user} post={composer.id ? composer : null} initialTripId={params.get('share') || ''} onClose={() => { setComposer(null); if (params.has('share')) setParams({}); }} onSaved={post => { setPosts(current => [post, ...current.filter(item => item.id !== post.id)]); setComposer(null); setParams({ post: post.id }); }} />}
    {params.get('post') && !composer && <PostDetail key={params.get('post')} id={params.get('post')} user={user} onClose={() => setParams({})} onChange={changed} />}
    {!user && <p className="community-guest-note">Bạn đang xem bản tin công khai. <Link to="/login" state={{ from: location.pathname + location.search }}>Đăng nhập để cùng trò chuyện.</Link></p>}
  </div></Layout>;
}

export default function Community() {
  const { user } = useAuth();
  return <CommunityFeed key={user?.id || 'guest'} user={user} />;
}
