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

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [weatherCache, setWeatherCache] = useState({});
  const [destinationStats, setDestinationStats] = useState({});
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [landmarkSlideIndex, setLandmarkSlideIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch weather for all destinations
  useEffect(() => {
    TRENDING_DESTINATIONS.forEach(async (dest) => {
      if (dest.latitude && dest.longitude && !weatherCache[dest.id]) {
        try {
          const data = await WeatherService.getWeather(dest.latitude, dest.longitude);
          setWeatherCache(prev => ({ ...prev, [dest.id]: data }));
        } catch (err) {
          // Silently fail - weather is optional
        }
      }
    });
  }, []);

  // Fetch destination plan counts
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await locationService.getDestinationStats();
        if (stats && typeof stats === 'object') {
          setDestinationStats(stats);
        }
      } catch (err) {
        // Use mock data as fallback
      }
    };
    fetchStats();
  }, []);

  const getPlanCount = (dest) => {
    return destinationStats[dest.name] || dest.trips || 0;
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
          setSearchResults(results);
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

    return TRENDING_DESTINATIONS.filter(dest => {
      const matchSearch = !searchQuery || 
        dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dest.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchTag = activeTag === 'all' || 
        dest.tags?.includes(activeTag);

      return matchSearch && matchTag;
    });
  }, [searchQuery, activeTag, searchResults, isSearching]);

  const handleCardClick = (dest) => {
    // Nếu là kết quả từ hybrid search (có id là number) hoặc từ mock data
    const destName = dest.name;
    const destId = dest.id;
    const destRegion = dest.region || dest.city || dest.province || '';
    
    const params = new URLSearchParams({
      destination: destName,
      locationId: destId,
      region: destRegion,
      // ... các params khác nếu cần
    });
    
    navigate(`/planner?${params.toString()}`);
  };

  const allTags = Object.entries(PREFERENCE_TAGS);

  const totalPlans = TRENDING_DESTINATIONS.reduce((sum, d) => sum + getPlanCount(d), 0);

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
              <div className="explore-stat-value">{TRENDING_DESTINATIONS.length}</div>
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
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                  <div className="explore-card-overlay">
                    <h3 className="explore-card-name">{dest.name}</h3>
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
                    {dest.tags?.map(tag => {
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
