import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Components/Layout/Layout';
import { TRENDING_DESTINATIONS, PREFERENCE_TAGS } from '../utils/mockData';
import { WeatherService } from '../services/WeatherService';
import { locationService } from '../services/locationService';
import { motion } from 'framer-motion';
import { 
  Search, DollarSign, Clock, 
  Sparkles, TrendingUp, Users, Sun, Compass,
  Thermometer
} from 'lucide-react';
import './Explore.css';

const DEFAULT_LOCATION_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800';

const CATEGORY_TO_VIBE_TAGS = {
  tourism: ['culture'],
  entertainment: ['culture'],
  catering: ['food'],
  cafe: ['food'],
  restaurant: ['food'],
  accommodation: ['relax'],
  beach: ['beach'],
  mountain: ['mountain'],
  nature: ['nature'],
  photography: ['photography'],
  shopping: ['shopping'],
  nightlife: ['nightlife'],
  adventure: ['adventure'],
  relax: ['relax'],
  'du-lich': ['culture'],
  'quan-an': ['food'],
  'bao-tang': ['culture'],
  'khach-san': ['relax'],
  bien: ['beach'],
  nui: ['mountain'],
  ho: ['nature'],
  'mua-sam': ['shopping'],
  'tham-quan': ['culture']
};

const normalizeVibeTags = (tags = [], category = '') => {
  const rawTags = Array.isArray(tags) ? tags : String(tags || '').split(',');
  const mapped = rawTags.flatMap((tag) => {
    const normalized = String(tag || '').trim();
    if (!normalized) return [];
    if (PREFERENCE_TAGS[normalized]) return [normalized];
    return CATEGORY_TO_VIBE_TAGS[normalized] || [];
  });

  String(category || '').split(/[.,_\s]+/).forEach((part) => {
    if (PREFERENCE_TAGS[part]) mapped.push(part);
    if (CATEGORY_TO_VIBE_TAGS[part]) mapped.push(...CATEGORY_TO_VIBE_TAGS[part]);
  });

  return [...new Set(mapped)].filter((tag) => PREFERENCE_TAGS[tag]);
};

const normalizeDestinationName = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .trim();

const getDestinationTemplate = (name) => TRENDING_DESTINATIONS.find((dest) => (
  normalizeDestinationName(dest.name) === normalizeDestinationName(name)
));

const normalizeGallerySlides = (loc) => {
  const slides = Array.isArray(loc.gallerySlides) && loc.gallerySlides.length
    ? loc.gallerySlides
    : (loc.galleryImages || []);

  return slides.map((slide) => {
    if (typeof slide === 'string') {
      return { image: slide, name: loc.name };
    }

    return {
      image: slide?.image || slide?.imageUrl || slide?.url || '',
      name: slide?.name || loc.name
    };
  }).filter((slide) => slide.image);
};

const normalizeExploreDestination = (loc, fallbackPlanCount = 0) => {
  const template = getDestinationTemplate(loc.name);
  const tags = normalizeVibeTags(loc.tags?.length ? loc.tags : template?.tags, loc.category);
  const planCount = Number(loc.planCount ?? loc.trips ?? fallbackPlanCount) || 0;
  const locationCost = Number(loc.estimatedCost ?? loc.estimated_cost ?? loc.avgCost ?? 0) || 0;
  const gallerySlides = normalizeGallerySlides(loc);
  return {
    ...template,
    ...loc,
    id: String(loc.id),
    image: loc.imageUrl || loc.image_url || loc.image || template?.image || DEFAULT_LOCATION_IMAGE,
    planCount,
    trips: planCount,
    latitude: loc.latitude ?? loc.lat ?? template?.latitude,
    longitude: loc.longitude ?? loc.lng ?? template?.longitude,
    bestSeason: loc.bestSeason || template?.bestSeason || 'Quanh năm',
    avgCost: locationCost || template?.avgCost || 0,
    idealDays: loc.suggestedDuration || loc.suggested_duration || loc.idealDays || template?.idealDays || '2-4 giờ',
    landmarkSlides: gallerySlides.length ? gallerySlides : (loc.landmarkSlides || template?.landmarkSlides || []),
    tags: tags.length ? tags : ['culture'],
    description: loc.description || template?.description || loc.address || 'Địa điểm đang được đồng bộ từ khu vực quản trị.'
  };
};

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [weatherCache, setWeatherCache] = useState({});
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [landmarkSlideIndex, setLandmarkSlideIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hotDestinations, setHotDestinations] = useState([]);
  const baseDestinations = hotDestinations;

  useEffect(() => {
    locationService.getHotLocations(12).then((locations) => {
      setHotDestinations((locations || []).map((loc) => normalizeExploreDestination(loc)));
    }).catch(() => {});
  }, []);

  // Fetch weather for all destinations
  useEffect(() => {
    baseDestinations.forEach(async (dest) => {
      if (dest.latitude && dest.longitude && !weatherCache[dest.id]) {
        try {
          const data = await WeatherService.getWeather(dest.latitude, dest.longitude);
          setWeatherCache(prev => ({ ...prev, [dest.id]: data }));
        } catch (err) {
          // Silently fail - weather is optional
        }
      }
    });
  }, [baseDestinations]);

  const getPlanCount = (dest) => {
    return Number(dest.planCount ?? dest.trips ?? 0) || 0;
  };

  useEffect(() => {
    if (!hoveredCardId) return undefined;
    const timer = setInterval(() => {
      setLandmarkSlideIndex((prev) => prev + 1);
    }, 1800);
    return () => clearInterval(timer);
  }, [hoveredCardId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const results = await locationService.hybridSearch(searchQuery);
          setSearchResults((results || []).map((loc) => normalizeExploreDestination(loc)));
        } catch (err) {
          console.error("Hybrid search error:", err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const displayItems = useMemo(() => {
    if (searchQuery.trim().length > 2 && (searchResults.length > 0 || isSearching)) {
      return searchResults;
    }

    return baseDestinations.filter(dest => {
      const matchSearch = !searchQuery || 
        dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dest.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchTag = activeTag === 'all' || 
        dest.tags?.includes(activeTag);

      return matchSearch && matchTag;
    });
  }, [searchQuery, activeTag, searchResults, isSearching, baseDestinations]);

  const handleCardClick = (dest) => {
    // Nếu là kết quả từ hybrid search (có id là number) hoặc từ mock data
    const destName = dest.name;
    const destId = dest.id;
    const destRegion = dest.region || dest.city || dest.province || '';
    
    const params = new URLSearchParams({
      destination: destName,
      locationId: destId,
      region: destRegion,
      preferences: (dest.tags || []).join(','),
      // ... các params khác nếu cần
    });
    
    navigate(`/planner?${params.toString()}`);
  };

  const allTags = Object.entries(PREFERENCE_TAGS);

  const totalPlans = baseDestinations.reduce((sum, d) => sum + getPlanCount(d), 0);

  const getWeatherDisplay = (destId) => {
    const w = weatherCache[destId];
    if (!w) return null;
    const temp = typeof w.temp === 'string' ? w.temp : `${w.temp}°C`;
    return { temp, condition: w.condition || 'Clear' };
  };

  const formatCost = (cost) => {
    if (!cost) return 'N/A';
    if (cost >= 1000000) return `${(cost / 1000000).toFixed(1)}tr`;
    return `${(cost / 1000).toFixed(0)}K`;
  };

  const getLandmarkImage = (dest) => {
    const slides = dest.landmarkSlides || [];
    if (!slides.length || hoveredCardId !== dest.id) return { image: dest.image, name: dest.name };
    const slide = slides[landmarkSlideIndex % slides.length];
    return { image: slide.image || dest.image, name: slide.name || dest.name };
  };

  return (
    <Layout>
      <div className="explore-container">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="explore-hero"
        >
          <h1 className="explore-hero-title">
            <Compass size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Khám phá điểm đến
          </h1>
          <p className="explore-hero-subtitle">
            Tìm cảm hứng cho chuyến đi tiếp theo. AI sẽ giúp bạn lên kế hoạch hoàn hảo cho mọi điểm đến.
          </p>

          {/* Stats */}
          <div className="explore-stats-row">
            <div className="explore-stat">
              <div className="explore-stat-value">{baseDestinations.length}</div>
              <div className="explore-stat-label">Điểm đến</div>
            </div>
            <div className="explore-stat">
              <div className="explore-stat-value">{totalPlans.toLocaleString()}+</div>
              <div className="explore-stat-label">Kế hoạch đã tạo</div>
            </div>
            <div className="explore-stat">
              <div className="explore-stat-value">{allTags.length}</div>
              <div className="explore-stat-label">Thể loại</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="explore-search-bar">
            <Search size={18} />
            <input
              type="text"
              className="explore-search-input"
              placeholder="Tìm kiếm điểm đến, ví dụ: Đà Nẵng, biển, núi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tag Filters */}
          <div className="explore-tags-wrap">
            <button 
              className={`explore-tag-btn ${activeTag === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTag('all')}
            >
              Tất cả
            </button>
            {allTags.map(([key, tag]) => (
              <button
                key={key}
                className={`explore-tag-btn ${activeTag === key ? 'active' : ''}`}
                onClick={() => setActiveTag(key)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Destinations Grid */}
        <div className="explore-grid">
          {isSearching && (
            <div className="explore-searching-indicator">
              <Sparkles className="animate-spin" />
              <span>Đang tìm kiếm thông minh...</span>
            </div>
          )}
          {displayItems.map((dest, idx) => {
            const weather = getWeatherDisplay(dest.id);
            const planCount = getPlanCount(dest);
            const landmarkVisual = getLandmarkImage(dest);

            return (
              <motion.div
                key={dest.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="explore-card"
                onClick={() => handleCardClick(dest)}
                onMouseEnter={() => {
                  setHoveredCardId(dest.id);
                  setLandmarkSlideIndex(0);
                }}
                onMouseLeave={() => setHoveredCardId(null)}
              >
                {/* Image Section */}
                <div className="explore-card-img-wrap">
                  <img
                    src={landmarkVisual.image}
                    alt={dest.name}
                    className="explore-card-img"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_LOCATION_IMAGE;
                    }}
                  />
                  <div className="explore-card-overlay">
                    <h3 className="explore-card-name">{landmarkVisual.name}</h3>
                  </div>

                  {hoveredCardId === dest.id && (
                    <div className="explore-card-landmark-label">
                      <Sparkles size={12} />
                      {landmarkVisual.name}
                    </div>
                  )}

                  {/* Weather Badge */}
                  {weather && (
                    <div className="explore-card-weather">
                      <Thermometer size={12} />
                      {weather.temp} · {weather.condition}
                    </div>
                  )}

                  {/* Plans Badge */}
                  <div className="explore-card-plans-badge">
                    <Users size={11} />
                    {planCount.toLocaleString()}+ kế hoạch
                  </div>
                </div>

                {/* Card Body */}
                <div className="explore-card-body">
                  <p className="explore-card-desc">{dest.description}</p>

                  {/* Info Grid */}
                  <div className="explore-card-info-grid">
                    <div className="explore-card-info-item">
                      <Sun size={14} />
                      <div>
                        <div className="explore-card-info-label">Mùa đẹp</div>
                        <div className="explore-card-info-value">{dest.bestSeason}</div>
                      </div>
                    </div>
                    <div className="explore-card-info-item">
                      <DollarSign size={14} />
                      <div>
                        <div className="explore-card-info-label">Chi phí TB</div>
                        <div className="explore-card-info-value">{formatCost(dest.avgCost)} VNĐ</div>
                      </div>
                    </div>
                    <div className="explore-card-info-item">
                      <Clock size={14} />
                      <div>
                        <div className="explore-card-info-label">Thời gian</div>
                        <div className="explore-card-info-value">{dest.idealDays}</div>
                      </div>
                    </div>
                    <div className="explore-card-info-item">
                      <TrendingUp size={14} />
                      <div>
                        <div className="explore-card-info-label">Hợp sở thích AI</div>
                        <div className="explore-card-info-value">
                          {(dest.tags || []).slice(0, 2).map((tag) => PREFERENCE_TAGS[tag]?.label || tag).join(', ') || 'Tổng hợp'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="explore-card-tags">
                    {(dest.tags || []).slice(0, 3).map(tag => {
                      const tagInfo = PREFERENCE_TAGS[tag];
                      if (!tagInfo) return null;
                      return (
                        <span
                          key={tag}
                          className="explore-card-tag"
                          style={{
                            background: `${tagInfo.color}15`,
                            color: tagInfo.color
                          }}
                        >
                          {tagInfo.label}
                        </span>
                      );
                    })}
                    {(dest.tags || []).length > 3 && (
                      <span className="explore-card-tag explore-card-tag-more">
                        +{dest.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Plan with AI Button */}
                  <button 
                    className="explore-card-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(dest);
                    }}
                  >
                    <Sparkles size={16} />
                    Lên kế hoạch AI
                  </button>
                </div>

              </motion.div>
            );
          })}

          {displayItems.length === 0 && !isSearching && (
            <div className="explore-empty">
              <Search size={64} className="explore-empty-icon" />
              <h3>Không tìm thấy điểm đến</h3>
              <p>Thử tìm kiếm với từ khóa khác như "biển", "núi", hoặc "phượt Hà Nội"...</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Explore;
