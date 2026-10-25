import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
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
  const [weatherData, setWeatherData] = useState({});
  const [activeWeatherLoc, setActiveWeatherLoc] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  useEffect(() => {
    if (trip && trip.locations.length > 0) {
      // Fetch weather for the first location by default
      const first = trip.locations[0];
      fetchWeather(first.id, first.lat, first.lng);
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
    if (currentPos && isConfirming && trip) {
      const lastLoc = trip.locations[trip.locations.length - 1];
      const distance = calculateDistance(currentPos.lat, currentPos.lng, lastLoc.lat, lastLoc.lng);
      
      // If within 500m (0.5km)
      if (distance < 0.5) {
        setCompletionResult({ success: true, message: 'Bạn đang ở đúng vị trí điểm đến cuối cùng!' });
      } else {
        setCompletionResult({ 
          success: false, 
          message: `Bạn đang ở cách điểm đến cuối cùng ${distance.toFixed(2)}km. Vui lòng đến gần hơn để xác nhận.` 
        });
      }
    }
  }, [currentPos, isConfirming]);

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
        {/* Header Navigation */}
        <div className="trip-details-header">
          <Link to="/history" className="trip-details-header-link"><ArrowLeft size={14} /> Lịch sử</Link>
          <ChevronRight size={14} />
          <span>Chi tiết chuyến đi</span>
        </div>

        {/* Hero Info */}
        <div className="card trip-details-hero">
          <div className="trip-details-hero-bg">
            <MapPin size={200} />
          </div>
          
          <div className="trip-details-hero-content">
            <div>
              <div className={`trip-details-status-badge trip-details-status-${trip.status}`}>
                {trip.status === 'upcoming' ? 'Sắp tới' : (trip.status === 'ongoing' ? 'Đang diễn ra' : 'Đã hoàn thành')}
              </div>
              <h1 className="trip-details-title">{trip.title}</h1>
              <div className="trip-details-meta">
                <div className="trip-details-meta-item">
                  <Calendar size={18} />
                  <span>{format(new Date(trip.startDate), 'dd/MM/yyyy')} - {format(new Date(trip.endDate), 'dd/MM/yyyy')}</span>
                </div>
                <div className="trip-details-meta-item">
                  <DollarSign size={18} />
                  <span>Ngân sách: {Number(trip.budget).toLocaleString()} VNĐ</span>
                </div>
              </div>
            </div>
            
            {trip.status !== 'completed' && (
              <div className="trip-details-actions">
                <button 
                  onClick={() => updateTrip(trip.id, { status: trip.status === 'upcoming' ? 'ongoing' : 'upcoming' })}
                  className={`btn ${trip.status === 'upcoming' ? 'btn-primary' : 'btn-outline'}`}
                >
                  {trip.status === 'upcoming' ? 'Bắt đầu chuyến đi' : 'Tạm dừng chuyến đi'}
                </button>
                <button onClick={handleVerifyLocation} className="btn btn-primary trip-details-action-finish">
                  <CheckCircle size={18} /> Hoàn thành chuyến đi
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="trip-details-grid">
          {/* Timeline */}
          <div className="card">
            <h3 className="trip-details-timeline-title">
              <Clock size={20} color="var(--primary)" /> Lịch trình chi tiết
            </h3>
            
            <div className="trip-details-timeline">
              {/* Vertical line */}
              <div className="trip-details-timeline-line"></div>
              
              {trip.locations.map((loc, idx) => (
                <div 
                  key={loc.tripLocId || loc.id} 
                  className={`trip-details-timeline-item ${activeWeatherLoc === loc.id ? 'active' : ''}`}
                  onClick={() => fetchWeather(loc.id, loc.lat, loc.lng)}
                >
                  <div className="trip-details-timeline-number">
                    {idx + 1}
                  </div>
                  
                  <div className="trip-details-timeline-content">
                    <img src={loc.image} alt={loc.name} className="trip-details-timeline-img" />
                    <div className="trip-details-timeline-info">
                      <h4 className="trip-details-timeline-name">{loc.name}</h4>
                      <p className="trip-details-timeline-address">{loc.address}</p>
                      <div className="trip-details-timeline-tags">
                        <span className="trip-details-tag-duration">⏰ Gợi ý: {loc.suggestedDuration || '2 giờ'}</span>
                        <span className="trip-details-tag-cost">💰 Phí: {loc.estimatedCost?.toLocaleString() || 'Miễn phí'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {idx === trip.locations.length - 1 && (
                    <div className="trip-details-timeline-end">
                      <MapPin size={16} /> Đểm cuối
                    </div>
                  )}
                </div>
              ))}
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
                        <div className="trip-details-weather-val">#{trip.locations.findIndex(l => l.id === activeWeatherLoc) + 1}</div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="trip-details-weather-loading">
                    <Loader2 className="animate-spin" size={24} />
                    <p>Đang tải...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Notes Card */}
            <div className="card">
              <h3 className="trip-details-notes-title">
                <StickyNote size={18} color="var(--primary)" /> Ghi chú
              </h3>
              <p className="trip-details-notes-content">
                {trip.notes || 'Không có ghi chú nào cho chuyến đi này.'}
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {isConfirming && (
            <div className="trip-details-modal-overlay">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card trip-details-modal-card" 
              >
                <div className="trip-details-modal-header">
                  <h2 className="trip-details-modal-title">Hoàn thành chuyến đi</h2>
                  <button onClick={() => setIsConfirming(false)} className="trip-details-modal-close"><X size={24} /></button>
                </div>

                <div className="trip-details-modal-body">
                  <Navigation size={48} color="var(--primary)" className="trip-details-modal-icon" />
                  <p className="trip-details-modal-text">Chúng tôi cần xác nhận vị trí của bạn để đánh dấu chuyến đi là hoàn thành.</p>
                  
                  {geoLoading ? (
                    <div className="trip-details-modal-loading">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Đang xác định vị trí...</span>
                    </div>
                  ) : completionResult ? (
                    <div className={`trip-details-modal-result ${completionResult.success ? 'trip-details-modal-success' : 'trip-details-modal-error-result'}`}>
                      {completionResult.success ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                      {completionResult.message}
                    </div>
                  ) : (
                    <button onClick={getLocation} className="btn btn-primary trip-details-modal-full-btn">Xác nhận vị trí hiện tại</button>
                  )}
                  
                  {geoError && (
                    <div className="trip-details-modal-error">⚠️ {geoError}</div>
                  )}
                </div>

                <div className="trip-details-modal-footer">
                  <button onClick={() => setIsConfirming(false)} className="btn btn-outline trip-details-modal-btn">Hủy</button>
                  <button 
                    onClick={handleFinishTrip} 
                    disabled={!completionResult?.success}
                    className="btn btn-primary trip-details-modal-btn trip-details-modal-btn-confirm" 
                  >
                    Xác nhận hoàn thành
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default TripDetails;
