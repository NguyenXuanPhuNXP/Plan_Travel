import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Check, Compass, MapPin, Menu, Pause, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { handleImageError } from '../utils/destinationImages';
import './LandingPage.css';

const destinations = [
  { name: 'Hạ Long', image: 'ha-long', detail: 'Giữa ngàn đảo xanh', days: '3 ngày', stops: [
    ['08:00', 'Đón gió trên vịnh', 'Bắt đầu ngày mới ở cảng Tuần Châu.'],
    ['11:30', 'Một bữa trưa vị biển', 'Thưởng thức hải sản địa phương.'],
    ['15:00', 'Chèo kayak ở hang Luồn', 'Đi chậm lại giữa làn nước xanh.'],
  ] },
  { name: 'Hội An', image: 'hoi-an', detail: 'Hẹn nhau nơi phố cũ', days: '3 ngày', stops: [
    ['08:00', 'Cà phê bên sông Hoài', 'Ngắm phố cổ khi ngày vừa thức giấc.'],
    ['11:30', 'Cao lầu đúng vị Hội An', 'Dừng chân thưởng thức món ngon phố Hội.'],
    ['17:00', 'Dạo phố đèn lồng', 'Theo những con ngõ nhỏ đến Chùa Cầu.'],
  ] },
  { name: 'Đà Lạt', image: 'da-lat', detail: 'Một chút bình yên', days: '3 ngày', stops: [
    ['07:00', 'Dạo quanh hồ Xuân Hương', 'Hít thở buổi sáng trong lành bên hồ.'],
    ['10:00', 'Ghé ga Đà Lạt', 'Lưu lại một khung hình giữa kiến trúc xưa.'],
    ['16:00', 'Cà phê giữa đồi thông', 'Dành buổi chiều cho chuyện trò và ngắm cảnh.'],
  ] },
  { name: 'Phú Quốc', image: 'phu-quoc', detail: 'Theo nắng về phía biển', days: '4 ngày' },
];

const plannerLink = (destination) => `/planner?destination=${encodeURIComponent(destination.name)}&totalDays=${destination.days[0]}`;

const mapStops = [
  { name: 'Hà Nội', x: 135, y: 117, labelX: -19, labelY: -18, anchor: 'end' },
  { name: 'Hạ Long', x: 172, y: 119, labelX: 23, labelY: 8 },
  { name: 'Huế', x: 189, y: 265, labelX: -19, labelY: -12, anchor: 'end' },
  { name: 'Hội An', x: 212, y: 284, labelX: 24, labelY: 14 },
  { name: 'Đà Lạt', x: 215, y: 412, labelX: 24, labelY: 6 },
  { name: 'TP. HCM', x: 159, y: 448, labelX: 20, labelY: 25 },
  { name: 'Phú Quốc', x: 77, y: 468, labelX: -8, labelY: 43 },
];
const mapRoute = 'M135 117 C146 91 172 96 172 119 C157 167 144 207 189 265 C206 258 223 265 212 284 C232 326 255 373 215 412 C198 423 178 425 159 448 C123 475 97 498 77 468';
const scrollSpring = { stiffness: 180, damping: 32, mass: 0.4, restDelta: 0.001 };

function VietnamMap({ progress, activeStop }) {
  const mapRef = useRef(null);
  const visible = useInView(mapRef, { amount: 0.25 });
  const reducedMotion = useReducedMotion();

  return (
    <div ref={mapRef} className={`landing-vietnam-map${visible ? ' is-in-view' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 520 600" focusable="false">
        <image href="/images/vietnam-outline.svg" width="520" height="600" />
        <path className="vietnam-map-route" d={mapRoute} />
        <motion.path className="vietnam-map-trail" d={mapRoute} style={{ pathLength: reducedMotion ? 1 : progress }} />
        {mapStops.map((stop, index) => (
          <g className="vietnam-map-stop" data-active={stop.name === activeStop} key={stop.name} transform={`translate(${stop.x} ${stop.y})`} style={{ '--map-delay': `${index * 0.55}s` }}>
            <circle className="vietnam-map-pulse" r="11" />
            <circle className="vietnam-map-dot" r="5" />
            <text x={stop.labelX} y={stop.labelY} textAnchor={stop.anchor || 'start'}>{stop.name}</text>
          </g>
        ))}
        <g className="vietnam-map-islands">
          <path d="M321 254l4-2 2 3-3 2z M337 261l3-3 3 2-2 3z M350 249l3 1-1 3-3-1z M330 279l4-2 1 3-3 2z M354 275l3-1 2 2-3 2z M343 288l3-2 2 2-3 2z" />
          <text x="355" y="241">Quần đảo Hoàng Sa</text>
          <path d="M374 423l3-2 2 3-3 1z M395 441l4-1 1 3-3 1z M411 459l4-2 1 3-3 2z M388 479l3-2 2 2-3 2z M428 488l3-1 2 3-4 1z M405 508l4-2 1 3-3 1z M440 521l3-1 2 2-3 2z M375 503l3 1-1 3-3-1z" />
          <text x="351" y="552">Quần đảo Trường Sa</text>
        </g>
        <text className="vietnam-map-sea" x="330" y="370">Biển Đông</text>
      </svg>
    </div>
  );
}

function VietnamJourney() {
  const sceneRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start start', 'end end'] });
  const smoothProgress = useSpring(scrollYProgress, scrollSpring);
  const routeProgress = useTransform(smoothProgress, [0, 0.92], [0.03, 1]);
  const mapScale = useTransform(smoothProgress, [0, 0.65], [0.88, 1]);
  const [chapter, setChapter] = useState(0);
  const chapterRef = useRef(0);
  const chapters = [destinations[0], destinations[1], destinations[3]];
  const destination = chapters[chapter];

  useMotionValueEvent(scrollYProgress, 'change', progress => {
    const next = progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
    if (next !== chapterRef.current) { chapterRef.current = next; setChapter(next); }
  });

  return (
    <div className="landing-journey-scene" ref={sceneRef}>
      <div className="landing-journey-stage">
        <div className="landing-journey-copy">
          <div className="landing-section-heading">
            <h2 id="destinations-title">Việt Nam, còn nhiều<br />điều để thấy.</h2>
            <p>Một vịnh biển xanh, một con phố cũ, hay buổi sáng giữa đồi thông. Chuyến đi tiếp theo bắt đầu từ nơi bạn muốn đến.</p>
          </div>
          <div className="landing-journey-moment">
            <AnimatePresence initial={false}>
              <motion.img key={destination.image} src={`/images/destinations/${destination.image}.jpg`} alt={`Khung cảnh ${destination.name}`}
                width="960" height="540" loading="lazy" onError={handleImageError}
                initial={reducedMotion ? false : { opacity: 0, x: 55, scale: 1.12 }} animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -55, scale: 1.06 }} transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }} />
            </AnimatePresence>
            <div className="landing-journey-caption"><h3>{destination.name}</h3><p>{destination.detail}</p></div>
          </div>
        </div>
        <motion.div className="landing-journey-map" style={reducedMotion ? undefined : { scale: mapScale }}>
          <VietnamMap progress={routeProgress} activeStop={destination.name} />
        </motion.div>
      </div>
    </div>
  );
}

function ClosingScene() {
  const sceneRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ['start end', 'end end'] });
  const smoothProgress = useSpring(scrollYProgress, scrollSpring);
  const imageScale = useTransform(smoothProgress, [0, 1], [1.25, 1]);
  const frameScale = useTransform(smoothProgress, [0, 0.8], [0.78, 1]);

  return (
    <section ref={sceneRef} className="landing-closing-scene" aria-labelledby="closing-title">
      <div className="landing-closing">
        <motion.div className="landing-closing-media" style={reducedMotion ? undefined : { scale: frameScale }}>
          <motion.img style={reducedMotion ? undefined : { scale: imageScale }} src="/images/destinations/sa-pa.jpg" alt="Thung lũng và núi đồi Sa Pa" width="1600" height="900" loading="lazy" onError={handleImageError} />
        </motion.div>
        <div className="landing-closing-scrim" />
        <div className="landing-closing-copy"><h2 id="closing-title" className="landing-reveal">Chuyến đi tới,<br />là của bạn.</h2><p>Một nơi mới. Những người thân quen.<br />Và một hành trình theo cách của riêng mình.</p><Link to="/planner" className="landing-button">Lên lịch trình <ArrowUpRight size={21} aria-hidden="true" /></Link></div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const menuRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const heroVisible = useInView(heroRef);
  const [paused, setPaused] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const [selected, setSelected] = useState(destinations[0]);
  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const smoothHero = useSpring(scrollYProgress, scrollSpring);
  const mediaY = useTransform(smoothHero, [0, 1], ['0%', '14%']);
  const mediaScale = useTransform(smoothHero, [0, 1], [1, 1.1]);
  const heroY = useTransform(smoothHero, [0, 1], [0, 140]);
  const heroOpacity = useTransform(smoothHero, [0, 0.7], [1, 0]);
  const firstLineX = useTransform(smoothHero, [0, 1], [0, -110]);
  const secondLineX = useTransform(smoothHero, [0, 1], [0, 110]);

  useMotionValueEvent(scrollY, 'change', value => {
    const next = value > 48;
    if (next !== scrolledRef.current) { scrolledRef.current = next; setScrolled(next); }
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updatePlayback = () => {
      if (paused || reducedMotion || !heroVisible || document.hidden) video.pause();
      else video.play().catch(() => setPaused(true));
    };
    updatePlayback();
    document.addEventListener('visibilitychange', updatePlayback);
    return () => {
      video.pause();
      document.removeEventListener('visibilitychange', updatePlayback);
    };
  }, [paused, reducedMotion, heroVisible]);

  const closeMenu = () => { if (menuRef.current) menuRef.current.open = false; };

  return (
    <div className="landing-page">
      <a className="landing-skip" href="#landing-content">Đến nội dung chính</a>
      <header className={`landing-header${scrolled ? ' is-scrolled' : ''}`}>
        <Link to="/" className="landing-brand" aria-label="PlanTravel — Trang chủ">
          <Compass size={30} strokeWidth={1.6} aria-hidden="true" />
          <span>PlanTravel</span>
        </Link>
        <nav className="landing-desktop-nav" aria-label="Điều hướng chính">
          <a href="#diem-den">Điểm đến</a>
          <a href="#lich-trinh">Lịch trình AI</a>
          <a href="#dong-hanh">Cùng đồng hành</a>
          <Link to="/community">Bản tin</Link>
        </nav>
        <div className="landing-header-actions">
          <Link className="landing-login" to={user ? '/dashboard' : '/login'}>{user ? 'Chuyến đi của tôi' : 'Đăng nhập'}</Link>
          <Link className="landing-button landing-header-cta" to="/planner">Lên lịch trình <ArrowUpRight size={18} aria-hidden="true" /></Link>
          <details ref={menuRef} className="landing-mobile-menu" onKeyDown={event => { if (event.key === 'Escape') closeMenu(); }}>
            <summary aria-label="Mở menu điều hướng"><Menu size={25} aria-hidden="true" /></summary>
            <nav aria-label="Điều hướng di động" onClick={closeMenu}>
              <a href="#diem-den">Điểm đến</a>
              <a href="#lich-trinh">Lịch trình AI</a>
              <a href="#dong-hanh">Cùng đồng hành</a>
              <Link to="/community">Bản tin chuyến đi</Link>
              <Link to={user ? '/dashboard' : '/login'}>{user ? 'Chuyến đi của tôi' : 'Đăng nhập'}</Link>
            </nav>
          </details>
        </div>
      </header>

      <main id="landing-content">
        <section className="landing-hero" ref={heroRef} aria-labelledby="landing-title">
          <motion.div className="landing-hero-media" style={reducedMotion ? undefined : { y: mediaY, scale: mediaScale }}>
            <img className="landing-hero-poster" src="/videos/ha-long-poster.jpg" alt="" width="1920" height="1080" fetchPriority="high" />
            <video ref={videoRef} className={videoFailed ? 'landing-video-failed' : ''}
              poster="/videos/ha-long-poster.jpg"
              muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1}
              onError={() => setVideoFailed(true)}>
              {!reducedMotion && <><source src="/videos/ha-long-mobile.mp4" media="(max-width: 767px)" type="video/mp4" /><source src="/videos/ha-long.mp4" type="video/mp4" /></>}
            </video>
          </motion.div>
          <div className="landing-hero-scrim" />
          <motion.div className="landing-hero-content" style={reducedMotion ? undefined : { y: heroY, opacity: heroOpacity }}>
            <h1 id="landing-title">
              <motion.span className="landing-title-line" style={reducedMotion ? undefined : { x: firstLineX }}><motion.span initial={reducedMotion ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}>Đi để thấy.</motion.span></motion.span>
              <motion.span className="landing-title-line" style={reducedMotion ? undefined : { x: secondLineX }}><motion.span initial={reducedMotion ? false : { y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.95, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}>Đi để nhớ.</motion.span></motion.span>
            </h1>
            <div className="landing-hero-intro">
              <p>PlanTravel giúp bạn lên lịch trình bằng AI, chọn điểm đến và chuẩn bị chuyến đi cùng bạn bè.</p>
              <Link className="landing-button" to="/planner">Lên lịch trình <ArrowUpRight size={21} aria-hidden="true" /></Link>
            </div>
          </motion.div>
          <div className="landing-hero-bottom">
            <a className="landing-discover" href="#diem-den"><span className="landing-down"><ArrowDown size={20} aria-hidden="true" /></span> Khám phá Việt Nam</a>
            <div className="landing-film-caption"><MapPin size={16} aria-hidden="true" /><span>Vịnh Hạ Long, Việt Nam</span>
              {!reducedMotion && !videoFailed && <button className="landing-video-toggle" type="button" aria-label={paused ? 'Phát video nền' : 'Tạm dừng video nền'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}</button>}
            </div>
          </div>
        </section>

        <section className="landing-destinations" id="diem-den" aria-labelledby="destinations-title">
          <VietnamJourney />
          <div className="landing-destination-gallery landing-section">
          <div className="landing-scroll-words" aria-hidden="true"><p>Dọc miền Việt Nam</p></div>
          <div className="landing-destination-grid">
            {destinations.map(destination => (
              <Link to={plannerLink(destination)} className={`landing-destination landing-destination-${destination.image}`} key={destination.name}>
                <div className="landing-destination-photo landing-photo-reveal"><img src={`/images/destinations/${destination.image}.jpg`} alt={destination.detail + ' ở ' + destination.name} width="960" height="720" loading="lazy" onError={handleImageError} /><span className="landing-photo-action"><ArrowUpRight size={25} aria-hidden="true" /><span className="landing-sr-only">Lên lịch trình {destination.name}</span></span></div>
                <div className="landing-destination-caption"><div><h3>{destination.name}</h3><p>{destination.detail}</p></div><span>{destination.days}</span></div>
              </Link>
            ))}
          </div>
          </div>
        </section>

        <section className="landing-planner landing-section" id="lich-trinh" aria-labelledby="planner-title">
          <div className="landing-planner-copy">
            <h2 id="planner-title" className="landing-reveal">Một ý tưởng.<br />Cả hành trình.</h2>
            <p className="landing-reveal">Bạn chọn nơi muốn đến. AI gợi ý lịch trình theo thời gian, ngân sách và sở thích của bạn. Mỗi điểm dừng đều có thể sửa lại.</p>
            <div className="landing-destination-options" role="group" aria-label="Chọn điểm đến để xem lịch trình minh họa">
              {destinations.filter(destination => destination.stops).map(destination => <button type="button" key={destination.name} aria-pressed={selected.name === destination.name} onClick={() => setSelected(destination)}>{destination.name}</button>)}
            </div>
            <Link to={plannerLink(selected)} className="landing-button landing-button-light">Lên lịch trình <ArrowUpRight size={20} aria-hidden="true" /></Link>
            <p className="landing-planner-note">Chọn một điểm đến để xem trước hành trình.</p>
          </div>
          <div className="landing-plan-preview landing-photo-reveal" data-ui aria-live="polite" aria-atomic="true">
            <div className="landing-preview-photo"><img key={selected.image} src={`/images/destinations/${selected.image}.jpg`} alt={`Khung cảnh ${selected.name}`} width="960" height="540" loading="lazy" onError={handleImageError} /><div><span>Lịch trình minh họa</span><h3>{selected.name} trong {selected.days}</h3></div></div>
            <div className="landing-preview-body"><div className="landing-preview-heading"><strong>Ngày đầu tiên</strong><span><MapPin size={14} aria-hidden="true" /> {selected.stops.length} trải nghiệm</span></div>
              <ol className="landing-timeline">{selected.stops.map(([time, title, description]) => <li key={title}><time>{time}</time><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol>
              <p className="landing-preview-footnote"><Check size={16} aria-hidden="true" /> Có thể điều chỉnh theo cách bạn thích</p>
            </div>
          </div>
        </section>

        <section className="landing-together landing-section" id="dong-hanh" aria-labelledby="together-title">
          <div className="landing-together-intro">
            <h2 id="together-title" className="landing-reveal">Đi cùng nhau.<br />Nhẹ gánh lo.</h2>
            <p>Những điều cần cho chuyến đi, ở cùng một nơi. Để nhóm mình dành nhiều thời gian hơn cho những kỷ niệm.</p>
            <Link to="/planner/map" className="landing-text-link">Hoặc tự tạo lịch trình trên bản đồ <ArrowUpRight size={19} aria-hidden="true" /></Link>
          </div>
          <div className="landing-travel-stories">
            <article className="landing-travel-story"><div className="landing-story-photo landing-photo-reveal"><img src="/images/destinations/hoi-an.jpg" alt="Những ngôi nhà cổ bên dòng sông ở Hội An" width="960" height="720" loading="lazy" onError={handleImageError} /></div><div className="landing-reveal"><h3>Đi cùng nhau, dễ hơn.</h3><p>Mời bạn bè vào chuyến đi, chia sẻ lịch trình và trò chuyện cùng nhóm. Mọi người đều biết điểm hẹn tiếp theo.</p></div></article>
            <article className="landing-travel-story"><div className="landing-story-photo landing-photo-reveal"><img src="/images/destinations/phu-quoc.jpg" alt="Bờ cát trắng và hàng dừa bên biển Phú Quốc" width="960" height="720" loading="lazy" onError={handleImageError} /></div><div className="landing-reveal"><h3>Sẵn sàng từ trước lúc đi.</h3><p>Theo dõi ngân sách, chia các khoản chi và chuẩn bị danh sách hành lý. Bớt những lần hỏi “ai mang gì, ai trả nhé?”.</p></div></article>
          </div>
        </section>

        <ClosingScene />
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-top"><Link to="/" className="landing-brand"><Compass size={27} strokeWidth={1.6} aria-hidden="true" /><span>Hẹn ở một hành trình mới.</span></Link><nav aria-label="Liên kết cuối trang"><a href="#diem-den">Điểm đến</a><Link to={user ? '/dashboard' : '/login'}>{user ? 'Chuyến đi của tôi' : 'Đăng nhập'}</Link><a href="/images/credits.html" target="_blank" rel="noreferrer">Nguồn ảnh & video</a></nav></div>
        <div className="landing-footer-wordmark" aria-hidden="true">PlanTravel</div>
        <div className="landing-footer-bottom"><span>© {new Date().getFullYear()} PlanTravel</span><span>Lên kế hoạch. Cùng nhau đi.</span></div>
      </footer>
    </div>
  );
}
