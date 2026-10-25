import React, { useState, useEffect } from 'react';
import Layout from '../Components/Layout/Layout';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTrips } from '../context/TripContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { WeatherService } from '../services/WeatherService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  StickyNote, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  Thermometer,
  CloudRain,
  Navigation,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import './TripDetails.css';

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTripById, updateTrip } = useTrips();
  const { location: currentPos, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  
  const trip = getTripById(id);
  const locations = Array.isArray(trip?.locations) ? trip.locations : (Array.isArray(trip?.items) ? trip.items : []);

  const [weatherData, setWeatherData] = useState({});
  const [activeWeatherLoc, setActiveWeatherLoc] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  useEffect(() => {
    if (locations.length > 0) {
      const first = locations[0];
      const lat = first.latitude ?? first.lat;
      const lng = first.longitude ?? first.lng;
      if (lat && lng) {
        fetchWeather(first.id, lat, lng);
      }
    }
  }, [trip]);

  const fetchWeather = async (locId, lat, lng) => {
    setActiveWeatherLoc(locId);
    if (weatherData[locId]) return;
    const data = await WeatherService.getWeather(lat, lng);
    setWeatherData(prev => ({ ...prev, [locId]: data }));
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleVerifyLocation = () => {
    getLocation();
    setIsConfirming(true);
    setCompletionResult(null);
  };

  useEffect(() => {
    if (currentPos && isConfirming && locations.length > 0) {
      const lastLoc = locations[locations.length - 1];
      const lastLat = lastLoc.latitude ?? lastLoc.lat;
      const lastLng = lastLoc.longitude ?? lastLoc.lng;
      
      if (lastLat && lastLng) {
        const distance = calculateDistance(currentPos.lat, currentPos.lng, lastLat, lastLng);
        if (distance < 0.5) {
          setCompletionResult({ success: true, message: 'Bạn đang ở đúng vị trí điểm đến cuối cùng!' });
        } else {
          setCompletionResult({ 
            success: false, 
            message: `Bạn đang ở cách điểm đến cuối cùng ${distance.toFixed(2)}km. Vui lòng đến gần hơn để xác nhận.` 
          });
        }
      }
    }
  }, [currentPos, isConfirming, locations]);

  const handleFinishTrip = () => {
    updateTrip(trip.id, { status: 'completed' });
    setIsConfirming(false);
  };

  if (!trip) return (
    <Layout>
      <div className="trip-details-not-found">
        <h2>Không tìm thấy chuyến đi</h2>
        <Link to="/" className="btn btn-primary trip-details-not-found-btn">Về trang chủ</Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="trip-details-container">
        {/* Breadcrumb */}
        <div className="trip-details-breadcrumb">
          <Link to="/" className="trip-details-breadcrumb-link"><ArrowLeft size={16} /> Dashboard</Link>
          <ChevronRight size={14} />
          <Link to="/history" className="trip-details-breadcrumb-link">Lịch sử</Link>
          <ChevronRight size={14} />
          <span>{trip.title || trip.name}</span>
        </div>

        {/* Hero Banner */}
        <div className="card trip-details-hero">
          <div className="trip-details-hero-content">
            <div className="trip-details-hero-badge-wrap">
              <span className={`trip-details-badge trip-details-badge-${trip.status}`}>
                {trip.status === 'upcoming' ? 'Sắp tới' : (trip.status === 'ongoing' ? 'Đang đi' : 'Hoàn thành')}
              </span>
            </div>
            
            <h1 className="trip-details-title">{trip.title || trip.name}</h1>
            
            <div className="trip-details-meta">
              <div className="trip-details-meta-item">
                <Calendar size={18} />
                <span>
                  {trip.startDate ? format(new Date(trip.startDate), 'dd/MM/yyyy') : 'Chưa định ngày'}
                  {trip.endDate ? ` — ${format(new Date(trip.endDate), 'dd/MM/yyyy')}` : ''}
                </span>
              </div>
              <div className="trip-details-meta-item">
                <MapPin size={18} />
                <span>{locations.length} điểm đến</span>
              </div>
              {trip.budget && (
                <div className="trip-details-meta-item">
                  <DollarSign size={18} />
                  <span>{typeof trip.budget === 'number' ? `${trip.budget.toLocaleString()} VNĐ` : trip.budget}</span>
                </div>
              )}
            </div>

            {/* Finish Trip Action */}
            {trip.status !== 'completed' && (
              <div className="trip-details-actions">
                <button 
                  onClick={handleVerifyLocation} 
                  disabled={geoLoading}
                  className="btn btn-primary trip-details-verify-btn"
                >
                  {geoLoading ? (
                    <><Loader2 className="animate-spin" size={18} /> Đang lấy vị trí...</>
                  ) : (
                    <><Navigation size={18} /> Xác thực vị trí & Hoàn thành</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Geolocation Verification Modal/Alert */}
        {isConfirming && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card trip-details-confirm-card ${completionResult?.success ? 'success' : ''}`}
          >
            <div className="trip-details-confirm-header">
              <h4>Xác thực hoàn thành chuyến đi</h4>
              <button onClick={() => setIsConfirming(false)} className="trip-details-confirm-close">
                <X size={18} />
              </button>
            </div>
            
            {geoError && (
              <div className="trip-details-alert-error">
                <AlertTriangle size={18} />
                <p>Không thể lấy vị trí hiện tại của bạn: {geoError}. Bạn có muốn hoàn thành thủ công?</p>
                <button onClick={handleFinishTrip} className="btn btn-outline trip-details-manual-btn">
                  Hoàn thành thủ công
                </button>
              </div>
            )}

            {completionResult && (
              <div className={`trip-details-result-box ${completionResult.success ? 'success' : 'warn'}`}>
                {completionResult.success ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                <p>{completionResult.message}</p>
                {completionResult.success && (
                  <button onClick={handleFinishTrip} className="btn btn-primary trip-details-finish-btn">
                    <CheckCircle size={18} /> Hoàn thành chuyến đi
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        <div className="trip-details-grid">
          {/* Timeline */}
          <div className="card">
            <h3 className="trip-details-timeline-title">
              <Clock size={20} color="var(--primary)" /> Lịch trình chi tiết
            </h3>
            
            <div className="trip-details-timeline">
              <div className="trip-details-timeline-line"></div>
              
              {locations.length > 0 ? (
                locations.map((loc, idx) => (
                  <div 
                    key={loc.tripLocId || loc.id || idx} 
                    className={`trip-details-timeline-item ${activeWeatherLoc === loc.id ? 'active' : ''}`}
                    onClick={() => fetchWeather(loc.id, loc.latitude ?? loc.lat, loc.longitude ?? loc.lng)}
                  >
                    <div className="trip-details-timeline-number">
                      {idx + 1}
                    </div>
                    
                    <div className="trip-details-timeline-content">
                      <img src={loc.image || loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'} alt={loc.name} className="trip-details-timeline-img" />
                      <div className="trip-details-timeline-info">
                        <h4 className="trip-details-timeline-name">{loc.name}</h4>
                        <p className="trip-details-timeline-address">{loc.address}</p>
                        <div className="trip-details-timeline-tags">
                          <span className="trip-details-tag-duration">⏰ Gợi ý: {loc.suggestedDuration || '2 giờ'}</span>
                          <span className="trip-details-tag-cost">💰 Phí: {typeof loc.estimatedCost === 'number' ? `${loc.estimatedCost.toLocaleString()} đ` : 'Miễn phí'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {idx === locations.length - 1 && (
                      <div className="trip-details-timeline-end">
                        <MapPin size={16} /> Điểm cuối
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chưa có điểm dừng chân nào được thêm vào chuyến đi này.
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Weather & Notes */}
          <div className="trip-details-sidebar">
            {/* Weather Card */}
            <div className="card trip-details-weather-card">
              <h3 className="trip-details-weather-title">
                <Thermometer size={18} /> Thời tiết hiện tại
              </h3>
              
              <AnimatePresence mode="wait">
                {activeWeatherLoc && weatherData[activeWeatherLoc] ? (
                  <motion.div 
                    key={activeWeatherLoc}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="trip-details-weather-main">
                      <div className="trip-details-weather-temp">{weatherData[activeWeatherLoc].temp}°C</div>
                      <div className="trip-details-weather-cond">{weatherData[activeWeatherLoc].condition}</div>
                    </div>
                    <div className="trip-details-weather-grid">
                      <div className="trip-details-weather-stat">
                        <div className="trip-details-weather-label">Lượng mưa</div>
                        <div className="trip-details-weather-val">{weatherData[activeWeatherLoc].rain_mm} mm</div>
                      </div>
                      <div className="trip-details-weather-stat">
                        <div className="trip-details-weather-label">Điểm dừng</div>
                        <div className="trip-details-weather-val">#{locations.findIndex(l => l.id === activeWeatherLoc) + 1}</div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="trip-details-weather-loading">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chọn một điểm đến trong lịch trình để xem dự báo thời tiết.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Notes Card */}
            <div className="card trip-details-notes-card">
              <h3 className="trip-details-notes-title">
                <StickyNote size={18} /> Ghi chú chuyến đi
              </h3>
              <p className="trip-details-notes-desc">
                {trip.notes || trip.description || 'Không có ghi chú nào cho chuyến đi này.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TripDetails;
