import React, { useState, useEffect } from 'react';
import Layout from '../Components/Layout/Layout';
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
  Users,
  UserPlus,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { sharingService } from '../services/sharingService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './TripDetails.css';

const TripDetails = () => {
  const { id } = useParams();
  const { getTripById, updateTrip, fetchTrips } = useTrips();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();
  const { location: currentPos, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  
  const trip = getTripById(id);
  const [weatherData, setWeatherData] = useState({});
  const [activeWeatherLoc, setActiveWeatherLoc] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [groupMembers, setGroupMembers] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingLocations, setEditingLocations] = useState([]);
  const [editForm, setEditForm] = useState({
    title: '',
    startLocation: '',
    endLocation: '',
    startDate: '',
    endDate: '',
    budget: '',
    notes: ''
  });
  const locations = Array.isArray(trip?.locations) ? trip.locations : [];
  const isTripOwner = String(trip?.userId || trip?.owner?.id || '') === String(user?.id || '');
  const collaborators = groupMembers?.members || trip?.collaborators || [];
  const groupOwner = groupMembers?.owner || trip?.owner || {
    id: trip?.userId,
    name: 'Trưởng nhóm',
    email: ''
  };

  // --- Helpers: declared before any usage to avoid TDZ (const is not hoisted) ---
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

  const parseDayFromNote = (note) => {
    const match = String(note || '').match(/\[DAY:(\d+)\]/i);
    if (!match) return 1;
    const day = Number(match[1]);
    return Number.isFinite(day) && day > 0 ? day : 1;
  };
  const stripDayMarker = (note) => String(note || '').replace(/\[DAY:\d+\]\s*/gi, '').trim();

  // --- Group locations by day ---
  const groupedLocationsByDay = (() => {
    if (isEditingInfo) {
      return [{ day: 1, items: editingLocations.map((loc, idx) => ({ loc, idx, note: '' })) }];
    }

    const tripItems = Array.isArray(trip?.items) ? trip.items : [];
    if (tripItems.length > 0) {
      const map = new Map();
      tripItems.forEach((item, idx) => {
        const loc = item?.location;
        if (!loc) return;
        const normalized = normalizeMapLoc(loc);
        const day = parseDayFromNote(item?.note);
        const cleanNote = stripDayMarker(item?.note);
        if (!map.has(day)) map.set(day, []);
        map.get(day).push({ loc: normalized, idx, note: cleanNote });
      });
      return [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([day, items]) => ({ day, items }));
    }

    // Fallback: show all locations as Day 1 when trip.items is empty
    return [{ day: 1, items: locations.map((loc, idx) => ({ loc: normalizeMapLoc(loc), idx, note: '' })) }];
  })();

  const lastLocation = locations[locations.length - 1];
  const displayEndLocation = trip?.endLocation || lastLocation?.name || trip?.destination || 'Chưa có điểm đến';
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
        startLocation: trip.startLocation || '',
        endLocation: trip.endLocation || '',
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

  const getLocCoords = (loc) => {
    const lat = Number(loc?.lat ?? loc?.latitude);
    const lng = Number(loc?.lng ?? loc?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  const handleVerifyLocation = () => {
    getLocation();
    setIsConfirming(true);
    setCompletionResult(null);
  };

  useEffect(() => {
    if (currentPos && isConfirming && trip) {
      // Kiểm tra tất cả các điểm đến, không chỉ điểm cuối
      const validLocations = locations
        .map((loc) => ({ ...loc, _coords: getLocCoords(loc) }))
        .filter((loc) => !!loc._coords);
      
      if (validLocations.length === 0) {
        setCompletionResult({ 
          success: false, 
          message: 'Không có điểm đến nào có tọa độ GPS hợp lệ để xác nhận.' 
        });
        return;
      }

      // Tìm điểm gần nhất
      let closestLoc = null;
      let closestDist = Infinity;
      for (const loc of validLocations) {
        const dist = calculateDistance(currentPos.lat, currentPos.lng, loc._coords.lat, loc._coords.lng);
        if (dist < closestDist) {
          closestDist = dist;
          closestLoc = loc;
        }
      }
      
      // Nếu trong phạm vi 1km của bất kỳ điểm nào
      if (closestDist <= 2.0) {
        setCompletionResult({ 
          success: true, 
          message: `Bạn đang ở gần "${closestLoc.name}" (cách ${(closestDist * 1000).toFixed(0)}m). Xác nhận thành công!` 
        });
      } else {
        setCompletionResult({ 
          success: false, 
          message: `Bạn đang ở cách điểm gần nhất "${closestLoc.name}" khoảng ${closestDist.toFixed(2)}km. Vui lòng đến gần hơn (< 1km) để xác nhận.` 
        });
      }
    }
  }, [currentPos, isConfirming, trip, locations]);

  useEffect(() => {
    if (isConfirming && geoError) {
      setCompletionResult({
        success: false,
        message: 'Không lấy được vị trí hiện tại. Vui lòng bật GPS/quyền vị trí rồi thử lại.'
      });
    }
  }, [geoError, isConfirming]);

  const handleFinishTrip = () => {
    updateTrip(trip.id, { status: 'completed' });
    setIsConfirming(false);
  };

  const loadGroupMembers = async () => {
    if (!trip?.id) return;
    setGroupLoading(true);
    try {
      const data = await sharingService.getGroupMembers(trip.id);
      setGroupMembers(data);
    } catch (error) {
      console.error('Load group failed:', error);
      setToast('Không thể tải nhóm kế hoạch lúc này.');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setGroupLoading(false);
    }
  };

  const openGroupModal = async () => {
    setShowGroupModal(true);
    await loadGroupMembers();
  };

  const handleCreateInviteLink = async () => {
    try {
      const data = await sharingService.createInviteLink(trip.id);
      const link = `${window.location.origin}${data.inviteUrl}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link);
      pushNotification({
        id: `group_invite_link_${trip.id}_${Date.now()}`,
        type: 'group',
        title: 'Đã tạo link mời nhóm',
        message: `Link mời cho kế hoạch "${trip.title || trip.name}" đã được sao chép.`
      });
      setToast('Đã tạo link mời và sao chép vào clipboard.');
      setTimeout(() => setToast(''), 2500);
    } catch (error) {
      console.error('Create invite link failed:', error);
      setToast(error.response?.data?.message || 'Không thể tạo link mời.');
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleUpdateMemberPermission = async (targetUserId, permission) => {
    try {
      const data = await sharingService.updateCollaboratorPermission(trip.id, targetUserId, permission);
      setGroupMembers(data);
      await fetchTrips();
      pushNotification({
        id: `group_permission_${trip.id}_${targetUserId}_${Date.now()}`,
        type: 'group',
        title: 'Đã cập nhật quyền thành viên',
        message: `Một thành viên trong "${trip.title || trip.name}" đã được chuyển sang quyền ${permission === 'edit' ? 'chỉnh sửa' : 'chỉ xem'}.`
      });
      setToast('Đã cập nhật quyền thành viên.');
      setTimeout(() => setToast(''), 2200);
    } catch (error) {
      console.error('Update permission failed:', error);
      setToast(error.response?.data?.message || 'Không thể đổi quyền thành viên.');
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    try {
      const data = await sharingService.removeCollaborator(trip.id, targetUserId);
      setGroupMembers(data);
      await fetchTrips();
      pushNotification({
        id: `group_removed_${trip.id}_${targetUserId}_${Date.now()}`,
        type: 'group',
        title: 'Đã xóa thành viên khỏi nhóm',
        message: `Danh sách nhóm của "${trip.title || trip.name}" vừa được cập nhật.`
      });
      setToast('Đã xóa thành viên khỏi nhóm kế hoạch.');
      setTimeout(() => setToast(''), 2200);
    } catch (error) {
      console.error('Remove member failed:', error);
      setToast(error.response?.data?.message || 'Không thể xóa thành viên.');
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleSaveInfo = async () => {
    try {
      await updateTrip(trip.id, {
        name: editForm.title,
        title: editForm.title,
        startLocation: editForm.startLocation,
        endLocation: editForm.endLocation,
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

  // normalizeMapLoc is now declared near the top of the component (before groupedLocationsByDay)

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
                {trip.startLocation || 'Chưa có điểm đi'} → {displayEndLocation} · {locations.length} điểm dừng
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
                    <input className="btn-outline trip-planner-input" value={editForm.startLocation} onChange={(e) => setEditForm((p) => ({ ...p, startLocation: e.target.value }))} placeholder="Điểm đi" />
                    <input className="btn-outline trip-planner-input" value={editForm.endLocation} onChange={(e) => setEditForm((p) => ({ ...p, endLocation: e.target.value }))} placeholder="Điểm kết thúc" />
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
              <button onClick={openGroupModal} className="btn btn-outline">
                <Users size={18} /> Nhóm kế hoạch
              </button>
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

              {groupedLocationsByDay.map((dayGroup, dayGroupIndex) => (
                <div key={`day_${dayGroup.day}`}>
                  <div style={{ fontWeight: 700, margin: '0.5rem 0 0.75rem', color: 'var(--primary)' }}>
                    Ngày {dayGroup.day}
                  </div>
                  {dayGroup.items.map(({ loc, idx, note }, itemIndex) => (
                    <div
                      key={`${dayGroup.day}_${loc.tripLocId || loc.id}_${idx}`}
                      className={`trip-details-timeline-item ${activeWeatherLoc === loc.id ? 'active' : ''}`}
                      onClick={() => fetchWeather(loc.id, loc.lat, loc.lng)}
                    >
                      <div className="trip-details-timeline-number">
                        {itemIndex + 1}
                      </div>

                      <div className="trip-details-timeline-content">
                        <img src={loc.image} alt={loc.name} className="trip-details-timeline-img" />
                        <div className="trip-details-timeline-info">
                          <h4 className="trip-details-timeline-name">{loc.name}</h4>
                          <p className="trip-details-timeline-address">{loc.address}</p>
                          {note ? (
                            <p className="trip-details-timeline-address" style={{ marginTop: 4 }}>
                              📝 {note}
                            </p>
                          ) : null}
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

                      {dayGroupIndex === groupedLocationsByDay.length - 1 && itemIndex === dayGroup.items.length - 1 && (
                        <div className="trip-details-timeline-end">
                          <MapPin size={16} /> Đểm cuối
                        </div>
                      )}
                    </div>
                  ))}
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
                        <div className="trip-details-weather-val">
                          {(() => {
                            // Find the stop name from grouped data for accurate display
                            for (const dg of groupedLocationsByDay) {
                              const found = dg.items.find(({ loc }) => String(loc.id) === String(activeWeatherLoc));
                              if (found) return `Ngày ${dg.day} #${dg.items.indexOf(found) + 1}`;
                            }
                            const flatIdx = locations.findIndex(l => String(l.id) === String(activeWeatherLoc));
                            return flatIdx >= 0 ? `#${flatIdx + 1}` : '--';
                          })()}
                        </div>
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
                    <button onClick={handleVerifyLocation} className="btn btn-primary trip-details-modal-full-btn">Xác nhận vị trí hiện tại</button>
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
          {showGroupModal && (
            <div className="trip-details-modal-overlay">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card trip-details-modal-card trip-details-group-modal"
              >
                <div className="trip-details-modal-header">
                  <h2 className="trip-details-modal-title">Nhóm kế hoạch</h2>
                  <button onClick={() => setShowGroupModal(false)} className="trip-details-modal-close"><X size={24} /></button>
                </div>
                <div className="trip-details-modal-body trip-details-group-body">
                  <div className="trip-details-group-owner">
                    <div className="trip-details-member-avatar">
                      {groupOwner?.avatar ? <img src={groupOwner.avatar} alt={groupOwner.name} /> : <Users size={18} />}
                    </div>
                    <div>
                      <div className="trip-details-member-name">{groupOwner?.name || 'Trưởng nhóm'}</div>
                      <div className="trip-details-member-email">{groupOwner?.email || 'Chủ kế hoạch'}</div>
                    </div>
                    <span className="trip-details-member-role">Trưởng nhóm</span>
                  </div>

                  {isTripOwner && (
                    <div className="trip-details-group-invite-link">
                      <button className="btn btn-primary" onClick={handleCreateInviteLink}>
                        <UserPlus size={18} /> Tạo link mời
                      </button>
                      {inviteLink && (
                        <input
                          className="btn-outline trip-planner-input"
                          value={inviteLink}
                          readOnly
                          onFocus={(e) => e.target.select()}
                        />
                      )}
                    </div>
                  )}

                  <div className="trip-details-group-list">
                    <div className="trip-details-group-list-title">
                      Thành viên ({collaborators.length})
                    </div>
                    {groupLoading ? (
                      <div className="trip-details-group-empty">
                        <Loader2 className="animate-spin" size={20} /> Đang tải nhóm...
                      </div>
                    ) : collaborators.length === 0 ? (
                      <div className="trip-details-group-empty">Chưa có thành viên nào tham gia kế hoạch này.</div>
                    ) : (
                      collaborators.map((member) => (
                        <div className="trip-details-group-member" key={member.userId}>
                          <div className="trip-details-member-avatar">
                            {member.user?.avatar ? <img src={member.user.avatar} alt={member.user.name} /> : <Users size={18} />}
                          </div>
                          <div className="trip-details-member-main">
                            <div className="trip-details-member-name">{member.user?.name || 'Thành viên'}</div>
                            <div className="trip-details-member-email">{member.user?.email}</div>
                          </div>
                          {isTripOwner ? (
                            <>
                              <select
                                className="btn-outline trip-details-member-permission"
                                value={member.permission || 'view'}
                                onChange={(e) => handleUpdateMemberPermission(member.userId, e.target.value)}
                              >
                                <option value="view">Chỉ xem</option>
                                <option value="edit">Chỉnh sửa</option>
                              </select>
                              <button className="btn btn-outline trip-details-member-remove" onClick={() => handleRemoveMember(member.userId)}>
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <span className="trip-details-member-role">
                              {member.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="trip-details-modal-footer">
                  <button onClick={() => setShowGroupModal(false)} className="btn btn-outline trip-details-modal-btn">
                    Đóng
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
