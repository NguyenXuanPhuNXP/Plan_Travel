import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { useParams, Link } from 'react-router-dom';
import { useTrips } from '../context/TripContext';
import { itineraryService } from '../services/itineraryService';
import { useGeolocation } from '../hooks/useGeolocation';
import { WeatherService } from '../services/WeatherService';
import MapComponent from '../Components/Map/MapComponent';
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
  X,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { sharingService } from '../services/sharingService';
import './TripDetails.css';

const TripDetails = () => {
  const { id } = useParams();
  const { getTripById, updateTrip, fetchTrips } = useTrips();
  const { location: currentPos, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  
  const trip = getTripById(id);
  const [weatherData, setWeatherData] = useState({});
  const [activeWeatherLoc, setActiveWeatherLoc] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePermission, setSharePermission] = useState('view');
  const [shareVisibility, setShareVisibility] = useState('public');
  const [toast, setToast] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingLocations, setEditingLocations] = useState([]);
  const [editForm, setEditForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    budget: '',
    notes: ''
  });
  const locations = Array.isArray(trip?.locations) ? trip.locations : [];
  const safeFormatDate = (value) => {
    if (!value) return '--/--/----';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '--/--/----' : format(date, 'dd/MM/yyyy');
  };

  useEffect(() => {
    if (trip && locations.length > 0) {
      // Fetch weather for the first location by default
      const first = locations[0];
      fetchWeather(first.id, first.lat, first.lng);
    }
  }, [trip, locations]);

  useEffect(() => {
    if (trip) {
      setEditForm({
        title: trip.title || trip.name || '',
        startDate: trip.startDate ? new Date(trip.startDate).toISOString().slice(0, 10) : '',
        endDate: trip.endDate ? new Date(trip.endDate).toISOString().slice(0, 10) : '',
        budget: trip.budget || '',
        notes: trip.notes || trip.description || ''
      });
      setEditingLocations(Array.isArray(trip.locations) ? trip.locations : []);
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
      const lastLoc = locations[locations.length - 1];
      if (!lastLoc?.lat || !lastLoc?.lng) return;
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
  }, [currentPos, isConfirming, trip, locations]);

  const handleFinishTrip = () => {
    updateTrip(trip.id, { status: 'completed' });
    setIsConfirming(false);
  };

  const handleShareTrip = async () => {
    try {
      const data = await sharingService.share(trip.id, {
        visibility: shareVisibility,
        permission: sharePermission
      });
      const token = data.shareToken || data.token;
      const link = `${window.location.origin}/shared/${token}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setShowShareModal(false);
      setToast('Đã tạo link chia sẻ và sao chép vào clipboard.');
      setTimeout(() => setToast(''), 2500);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Share trip failed:', error);
      setToast('Không thể chia sẻ kế hoạch lúc này. Vui lòng thử lại.');
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleSaveInfo = async () => {
    try {
      await updateTrip(trip.id, {
        name: editForm.title,
        title: editForm.title,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
        budget: editForm.budget ? Number(editForm.budget) : null,
        description: editForm.notes,
        notes: editForm.notes
      });
      setIsEditingInfo(false);
      setToast('Đã cập nhật thông tin kế hoạch.');
      setTimeout(() => setToast(''), 2200);
    } catch (error) {
      setToast('Không thể cập nhật kế hoạch. Vui lòng thử lại.');
      setTimeout(() => setToast(''), 2200);
    }
  };

  const normalizeMapLoc = (loc) => ({
    id: String(loc.id || loc.locationId || `tmp_${Date.now()}`),
    name: loc.name || 'Địa điểm',
    address: loc.address || '',
    lat: loc.lat ?? loc.latitude,
    lng: loc.lng ?? loc.longitude,
    image: loc.image || loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
    suggestedDuration: loc.suggestedDuration || null,
    estimatedCost: loc.estimatedCost || 0
  });

  const handleAddEditLocation = (loc) => {
    const normalized = normalizeMapLoc(loc);
    setEditingLocations((prev) => {
      const exists = prev.some((p) => String(p.id) === String(normalized.id));
      if (exists) return prev;
      return [...prev, normalized];
    });
  };

  const handleRemoveEditLocation = (locId) => {
    setEditingLocations((prev) => prev.filter((p) => String(p.id) !== String(locId)));
  };

  const moveLocation = (fromIndex, toIndex) => {
    setEditingLocations((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSaveTimeline = async () => {
    try {
      const existingItems = Array.isArray(trip.items) ? trip.items : [];
      for (const item of existingItems) {
        if (item?.id) {
          await itineraryService.removeItem(trip.id, item.id);
        }
      }

      let order = 0;
      for (const loc of editingLocations) {
        if (!/^\d+$/.test(String(loc.id))) continue;
        order += 1;
        await itineraryService.addItem(trip.id, {
          locationId: loc.id,
          note: `Điểm dừng ${order}`
        });
      }

      await fetchTrips();
      setToast('Đã cập nhật lịch trình chi tiết.');
      setTimeout(() => setToast(''), 2200);
    } catch (error) {
      console.error(error);
      setToast('Không thể lưu lịch trình. Vui lòng thử lại.');
      setTimeout(() => setToast(''), 2500);
    }
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
        {toast && (
          <div className="card" style={{ position: 'fixed', right: 20, top: 90, zIndex: 3000, padding: '0.75rem 1rem' }}>
            {toast}
          </div>
        )}
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
              <h1 className="trip-details-title">{trip.title || trip.name}</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                {trip.destination || 'Chưa có điểm đến chính'} · {locations.length} điểm dừng
              </p>
              <div className="trip-details-meta">
                <div className="trip-details-meta-item">
                  <Calendar size={18} />
                  <span>{safeFormatDate(trip.startDate)} - {safeFormatDate(trip.endDate)}</span>
                </div>
                <div className="trip-details-meta-item">
                  <DollarSign size={18} />
                  <span>Ngân sách: {Number(trip.budget).toLocaleString()} VNĐ</span>
                </div>
              </div>
              {isEditingInfo && (
                <div className="card" style={{ marginTop: '0.8rem', padding: '0.8rem' }}>
                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    <input className="btn-outline trip-planner-input" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Tên chuyến đi" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input type="date" className="btn-outline trip-planner-input" value={editForm.startDate} onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))} />
                      <input type="date" className="btn-outline trip-planner-input" value={editForm.endDate} onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))} />
                    </div>
                    <input type="number" className="btn-outline trip-planner-input" value={editForm.budget} onChange={(e) => setEditForm((p) => ({ ...p, budget: e.target.value }))} placeholder="Ngân sách" />
                    <textarea className="btn-outline trip-planner-textarea" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Ghi chú" />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={handleSaveInfo}>Lưu thay đổi</button>
                      <button className="btn btn-outline" onClick={() => setIsEditingInfo(false)}>Hủy</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="trip-details-actions-stack">
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
            <div className="trip-details-actions">
              <button onClick={() => setIsEditingInfo((v) => !v)} className="btn btn-outline">
                {isEditingInfo ? 'Đóng chỉnh sửa' : 'Chỉnh sửa kế hoạch'}
              </button>
              <button onClick={() => setShowShareModal(true)} className="btn btn-outline">
                <Share2 size={18} /> Chia sẻ kế hoạch
              </button>
              {shareLink && (
                <button
                  onClick={() => navigator.clipboard.writeText(shareLink)}
                  className="btn btn-outline"
                  title={shareLink}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} Sao chép link
                </button>
              )}
            </div>
            </div>
          </div>
        </div>

        <div className="trip-details-grid">
          {/* Timeline */}
          <div className="card">
            <h3 className="trip-details-timeline-title">
              <Clock size={20} color="var(--primary)" /> Lịch trình chi tiết
            </h3>
            
            <div className="trip-details-edit-map card" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
              {isEditingInfo && (
                <div className="trip-details-actions" style={{ marginBottom: '0.75rem' }}>
                  <button className="btn btn-primary" onClick={handleSaveTimeline}>Lưu lịch trình</button>
                  <button className="btn btn-outline" onClick={() => setEditingLocations(locations.map(normalizeMapLoc))}>Khôi phục</button>
                </div>
              )}
              <div style={{ height: 340, borderRadius: '10px', overflow: 'hidden' }}>
                <MapComponent
                  selectedLocations={(isEditingInfo ? editingLocations : locations).map(normalizeMapLoc)}
                  onLocationAdd={isEditingInfo ? handleAddEditLocation : undefined}
                  onLocationRemove={isEditingInfo ? handleRemoveEditLocation : undefined}
                />
              </div>
            </div>

            <div className="trip-details-timeline">
              {/* Vertical line */}
              <div className="trip-details-timeline-line"></div>
              
              {(isEditingInfo ? editingLocations : locations).map((loc, idx) => (
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
                      {isEditingInfo && (
                        <div className="trip-details-actions" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
                          <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); moveLocation(idx, idx - 1); }}>Lên</button>
                          <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); moveLocation(idx, idx + 1); }}>Xuống</button>
                          <button className="btn btn-outline" onClick={(e) => { e.stopPropagation(); handleRemoveEditLocation(loc.id); }}>Xóa điểm</button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {idx === ((isEditingInfo ? editingLocations : locations).length - 1) && (
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
                        <div className="trip-details-weather-val">#{locations.findIndex(l => l.id === activeWeatherLoc) + 1}</div>
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

        <AnimatePresence>
          {showShareModal && (
            <div className="trip-details-modal-overlay">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card trip-details-modal-card"
              >
                <div className="trip-details-modal-header">
                  <h2 className="trip-details-modal-title">Chia sẻ kế hoạch</h2>
                  <button onClick={() => setShowShareModal(false)} className="trip-details-modal-close"><X size={24} /></button>
                </div>
                <div className="trip-details-modal-body">
                  <label className="trip-planner-label">Quyền truy cập</label>
                  <select className="btn-outline trip-planner-input" value={sharePermission} onChange={(e) => setSharePermission(e.target.value)}>
                    <option value="view">Chỉ xem</option>
                    <option value="edit">Cho phép chỉnh sửa</option>
                  </select>
                  <label className="trip-planner-label" style={{ marginTop: '0.75rem' }}>Hiển thị</label>
                  <select className="btn-outline trip-planner-input" value={shareVisibility} onChange={(e) => setShareVisibility(e.target.value)}>
                    <option value="public">Công khai qua link</option>
                    <option value="private">Riêng tư</option>
                  </select>
                </div>
                <div className="trip-details-modal-footer">
                  <button onClick={() => setShowShareModal(false)} className="btn btn-outline trip-details-modal-btn">Hủy</button>
                  <button onClick={handleShareTrip} className="btn btn-primary trip-details-modal-btn trip-details-modal-btn-confirm">
                    Tạo link chia sẻ
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
