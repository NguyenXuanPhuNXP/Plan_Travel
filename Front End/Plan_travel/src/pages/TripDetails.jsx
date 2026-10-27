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
  Trash2,
  Briefcase,
  CheckSquare,
  Square,
  Car
} from 'lucide-react';
import { format } from 'date-fns';
import { sharingService } from '../services/sharingService';
import { friendService } from '../services/friendService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './TripDetails.css';

const TripDetails = () => {
  const { id } = useParams();
  const { getTripById, updateTrip, fetchTrips } = useTrips();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();
  const { location: currentPos, error: geoError, loading: geoLoading, getLocation } = useGeolocation();
  
  const contextTrip = getTripById(id);
  const [dbTrip, setDbTrip] = useState(null);
  const trip = dbTrip || contextTrip;
  const [packingItems, setPackingItems] = useState(trip?.packingItems || []);

  useEffect(() => {
    async function loadFreshTrip() {
      if (!id) return;
      try {
        const fresh = await itineraryService.getById(id);
        if (fresh && fresh.id) {
          setDbTrip(fresh);
          if (Array.isArray(fresh.packingItems)) {
            setPackingItems(fresh.packingItems);
          }
        }
      } catch (e) {
        console.warn('Could not fetch fresh trip:', e);
      }
    }
    loadFreshTrip();
  }, [id]);

  useEffect(() => {
    if (trip?.packingItems && packingItems.length === 0) {
      setPackingItems(trip.packingItems);
    }
  }, [trip]);

  const handleTogglePacking = async (packingItemId) => {
    const item = packingItems.find(p => String(p.id) === String(packingItemId));
    if (!item) return;
    const nextPacked = !item.isPacked;
    setPackingItems(prev => prev.map(p => String(p.id) === String(packingItemId) ? { ...p, isPacked: nextPacked } : p));
    try {
      if (/^\d+$/.test(String(packingItemId)) && /^\d+$/.test(String(trip?.id))) {
        await itineraryService.updatePackingItem(trip.id, packingItemId, { isPacked: nextPacked });
      }
    } catch (e) {
      console.warn('Failed to update packing item:', e);
    }
  };

  const [weatherData, setWeatherData] = useState({});
  const [activeWeatherLoc, setActiveWeatherLoc] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [groupMembers, setGroupMembers] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
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
  const currentMember = collaborators.find((member) => String(member.userId || member.user?.id || '') === String(user?.id || ''));
  const canEditTrip = isTripOwner || currentMember?.permission === 'edit';
  const groupOwner = groupMembers?.owner || trip?.owner || {
    id: trip?.userId,
    name: 'Trưởng nhóm',
    email: ''
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

  const parseDayFromNote = (note) => {
    const match = String(note || '').match(/\[DAY:(\d+)\]/i);
    if (!match) return 1;
    const day = Number(match[1]);
    return Number.isFinite(day) && day > 0 ? day : 1;
  };
  const stripDayMarker = (note) => String(note || '').replace(/\[DAY:\d+\]\s*/gi, '').trim();

  // Group locations by day
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
        map.get(day).push({ loc: normalized, idx, note: cleanNote, rawItem: item });
      });
      return [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([day, items]) => ({ day, items }));
    }

    return [{ day: 1, items: locations.map((loc, idx) => ({ loc: normalizeMapLoc(loc), idx, note: '', rawItem: null })) }];
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
    if (!lat || !lng) return;
    setActiveWeatherLoc(locId);
    if (weatherData[locId]) return;

    try {
      const data = await WeatherService.getWeather(lat, lng);
      setWeatherData(prev => ({
        ...prev,
        [locId]: data
      }));
    } catch (err) {
      console.error("Failed to fetch weather:", err);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleVerifyLocation = () => {
    setIsConfirming(true);
    setCompletionResult(null);

    if (!lastLocation) {
      setCompletionResult({
        success: false,
        message: 'Chuyến đi không có điểm đến để xác thực.'
      });
      return;
    }

    getLocation(
      (pos) => {
        const destLat = lastLocation.lat ?? lastLocation.latitude;
        const destLng = lastLocation.lng ?? lastLocation.longitude;
        if (!destLat || !destLng) {
          setCompletionResult({
            success: false,
            message: 'Điểm đến không có tọa độ GPS hợp lệ để xác thực.'
          });
          return;
        }

        const dist = calculateDistance(
          pos.latitude, 
          pos.longitude, 
          destLat, 
          destLng
        );

        if (dist <= 1.0) {
          setCompletionResult({
            success: true,
            message: `Xác thực thành công! Bạn đang ở rất gần điểm đến (${dist.toFixed(2)} km).`
          });
        } else {
          setCompletionResult({
            success: false,
            message: `Bạn đang ở cách điểm đến khoảng ${dist.toFixed(2)} km. Hãy đến gần hơn (dưới 1 km) để hoàn thành.`
          });
        }
      },
      (err) => {
        setCompletionResult({
          success: false,
          message: 'Không thể lấy vị trí hiện tại. Vui lòng bật định vị GPS trên trình duyệt.'
        });
      }
    );
  };

  const handleFinishTrip = () => {
    if (completionResult && completionResult.success) {
      updateTrip(trip.id, { status: 'completed' });
      setIsConfirming(false);
      pushNotification('Chúc mừng bạn đã hoàn thành chuyến đi!', 'success');
    }
  };

  const openGroupModal = async () => {
    setShowGroupModal(true);
    setGroupLoading(true);
    try {
      const data = await sharingService.getTripGroup(trip.id);
      setGroupMembers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setGroupLoading(false);
    }

    if (isTripOwner) {
      setLoadingFriends(true);
      try {
        const friends = await friendService.getFriends();
        setFriendsList(friends);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingFriends(false);
      }
    }
  };

  const handleCreateInviteLink = async () => {
    try {
      const res = await sharingService.createGroupInvite(trip.id, 'view');
      setInviteLink(res.inviteUrl);
      setToast('Đã tạo link mời vào nhóm!');
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      console.error(e);
      setToast('Không thể tạo link mời.');
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleInviteFriend = async (friend) => {
    try {
      await sharingService.inviteFriendToGroup(trip.id, friend.id, 'edit');
      setToast(`Đã thêm ${friend.name} vào nhóm!`);
      const data = await sharingService.getTripGroup(trip.id);
      setGroupMembers(data);
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      console.error(e);
      setToast('Thêm bạn bè thất bại.');
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleUpdateMemberPermission = async (targetUserId, permission) => {
    try {
      await sharingService.updateMemberPermission(trip.id, targetUserId, permission);
      setGroupMembers((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: (prev.members || []).map((m) =>
            m.userId === targetUserId ? { ...m, permission } : m
          )
        };
      });
      setToast('Đã cập nhật quyền thành viên.');
      setTimeout(() => setToast(''), 2000);
    } catch (e) {
      setToast('Không thể cập nhật quyền.');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    try {
      await sharingService.removeMember(trip.id, targetUserId);
      setGroupMembers((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: (prev.members || []).filter((m) => m.userId !== targetUserId)
        };
      });
      setToast('Đã xóa thành viên khỏi nhóm.');
      setTimeout(() => setToast(''), 2000);
    } catch (e) {
      setToast('Không thể xóa thành viên.');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleSaveInfo = async () => {
    if (!canEditTrip) {
      setToast('Bạn chỉ có quyền xem kế hoạch này.');
      setTimeout(() => setToast(''), 2200);
      return;
    }
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

  const handleAddEditLocation = (loc) => {
    if (!canEditTrip) return;
    const normalized = normalizeMapLoc(loc);
    setEditingLocations((prev) => {
      const exists = prev.some((p) => String(p.id) === String(normalized.id));
      if (exists) return prev;
      return [...prev, normalized];
    });
  };

  const handleRemoveEditLocation = (locId) => {
    if (!canEditTrip) return;
    setEditingLocations((prev) => prev.filter((p) => String(p.id) !== String(locId)));
  };

  const moveLocation = (fromIndex, toIndex) => {
    if (!canEditTrip) return;
    setEditingLocations((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSaveTimeline = async () => {
    if (!canEditTrip) {
      setToast('Bạn chỉ có quyền xem kế hoạch này.');
      setTimeout(() => setToast(''), 2200);
      return;
    }
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
                  <span>Ngân sách: {Number(trip.budget || trip.totalCost || 0).toLocaleString()} VNĐ</span>
                </div>
                <div className="trip-details-meta-item">
                  <Users size={18} />
                  <span>{trip.travelerCount || 1} người tham gia</span>
                </div>
                {trip.transportMode && (
                  <div className="trip-details-meta-item">
                    <Car size={18} />
                    <span>{trip.transportMode === 'flight' ? 'Máy bay' : (trip.transportMode === 'coach' ? 'Xe khách' : (trip.transportMode === 'train' ? 'Tàu hỏa' : (trip.transportMode === 'motorbike' ? 'Xe máy' : (trip.transportMode === 'car' ? 'Ô tô tự lái' : 'Đi bộ / Khác'))))}</span>
                  </div>
                )}
              </div>
              {Array.isArray(trip.preferences) && trip.preferences.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem' }}>
                  {trip.preferences.map((p) => (
                    <span key={p} className="trip-details-pref-pill">#{p}</span>
                  ))}
                </div>
              )}
              {(Number(trip.costTransport) > 0 || Number(trip.costMeals) > 0 || Number(trip.costAttractions) > 0 || Number(trip.costAccommodation) > 0 || Number(trip.costContingency) > 0 || Number(trip.totalCost) > 0) && (
                <div className="trip-details-cost-card" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <DollarSign size={18} color="var(--primary)" /> Chi tiết dự toán chi phí
                    </h3>
                    <span style={{ fontSize: '0.78rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: 999, fontWeight: 600 }}>
                      {trip.costScope === 'PERSON' ? `Tính theo đầu người (× ${trip.travelerCount || 1} người)` : 'Tính chung cho cả nhóm'}
                    </span>
                  </div>

                  <div className="trip-details-cost-grid">
                    <div className="trip-details-cost-col">
                      <span>Di chuyển</span>
                      <strong>{Number(trip.costTransport || 0).toLocaleString()} VNĐ</strong>
                    </div>
                    <div className="trip-details-cost-col">
                      <span>Ăn uống</span>
                      <strong>{Number(trip.costMeals || 0).toLocaleString()} VNĐ</strong>
                    </div>
                    <div className="trip-details-cost-col">
                      <span>Tham quan</span>
                      <strong>{Number(trip.costAttractions || 0).toLocaleString()} VNĐ</strong>
                    </div>
                    <div className="trip-details-cost-col">
                      <span>Lưu trú</span>
                      <strong>{Number(trip.costAccommodation || 0).toLocaleString()} VNĐ</strong>
                    </div>
                    <div className="trip-details-cost-col">
                      <span>Dự phòng</span>
                      <strong>{Number(trip.costContingency || 0).toLocaleString()} VNĐ</strong>
                    </div>
                  </div>

                  <div className="trip-details-cost-total-bar">
                    <span>Tổng chi phí tính toán ({trip.costScope === 'PERSON' ? `${trip.travelerCount || 1} người` : 'cả nhóm'}):</span>
                    <span style={{ fontSize: '1.15rem', color: '#059669', fontWeight: 800 }}>
                      {Number(trip.totalCost || trip.budget || 0).toLocaleString()} VNĐ
                    </span>
                  </div>
                </div>
              )}

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
              {canEditTrip && trip.status !== 'completed' && (
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
                {canEditTrip && <button onClick={() => setIsEditingInfo((v) => !v)} className="btn btn-outline">
                  {isEditingInfo ? 'Đóng chỉnh sửa' : 'Chỉnh sửa kế hoạch'}
                </button>}
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
                  {dayGroup.items.map(({ loc, idx, note, rawItem }, itemIndex) => (
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
                          <h4 className="trip-details-timeline-name">{rawItem?.customName || loc.name}</h4>
                          <p className="trip-details-timeline-address">{loc.address}</p>
                          {(rawItem?.startTime || loc.startTime) && (
                            <div style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Khởi hành: {rawItem?.startTime ? (String(rawItem.startTime).includes('T') ? String(rawItem.startTime).split('T')[1].slice(0, 5) : String(rawItem.startTime).slice(0, 5)) : loc.startTime}</span>
                              {rawItem?.durationMinutes ? <span style={{ background: '#e0e7ff', padding: '0.1rem 0.4rem', borderRadius: 4 }}>Thời lượng: {rawItem.durationMinutes}p</span> : null}
                              {rawItem?.travelMinutes ? <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.1rem 0.4rem', borderRadius: 4 }}>Di chuyển: {rawItem.travelMinutes}p</span> : null}
                            </div>
                          )}
                          {note ? (
                            <p className="trip-details-timeline-address" style={{ marginTop: 4 }}>
                              {note}
                            </p>
                          ) : null}
                          <div className="trip-details-timeline-tags">
                            <span className="trip-details-tag-duration">Gợi ý: {loc.suggestedDuration || '2 giờ'}</span>
                            <span className="trip-details-tag-cost">Phí: {loc.estimatedCost?.toLocaleString() || 'Miễn phí'}</span>
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

          {/* Sidebar: Weather & Packing & Notes */}
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
                      <div className="trip-details-weather-temp">{weatherData[activeWeatherLoc].temp}</div>
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

            {/* Packing Checklist Card */}
            <div className="card trip-details-packing-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                  <Briefcase size={18} color="var(--primary)" /> Đồ cần mang theo ({packingItems.filter(p => p.isPacked).length}/{packingItems.length})
                </h3>
              </div>

              {packingItems.length > 0 ? (
                <>
                  <div style={{ background: '#e2e8f0', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: '0.75rem' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: 'var(--primary)', 
                        width: `${Math.round((packingItems.filter(p => p.isPacked).length / Math.max(1, packingItems.length)) * 100)}%`,
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>

                  <div className="trip-details-packing-items-list">
                    {packingItems.map((item) => (
                      <div
                        key={item.id}
                        className="trip-details-packing-item-row"
                        onClick={() => handleTogglePacking(item.id)}
                      >
                        {item.isPacked ? (
                          <CheckSquare size={16} color="var(--primary)" />
                        ) : (
                          <Square size={16} color="var(--text-muted)" />
                        )}
                        <div style={{ flex: 1, minWidth: 0, textDecoration: item.isPacked ? 'line-through' : 'none', color: item.isPacked ? 'var(--text-muted)' : 'inherit' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.itemName || item.name}</span>
                          {item.notes && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>({item.notes})</span>}
                        </div>
                        <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 600 }}>
                          x{item.quantity || 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chưa có danh sách đồ chuẩn bị cho chuyến đi này.</p>
              )}
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

                  {isTripOwner && (
                    <div className="trip-details-group-list" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <div className="trip-details-group-list-title">Mời bạn bè</div>
                      {loadingFriends ? (
                        <div className="trip-details-group-empty"><Loader2 className="animate-spin" size={16} /> Đang tải bạn bè...</div>
                      ) : friendsList.length === 0 ? (
                        <div className="trip-details-group-empty">Bạn chưa có bạn bè nào.</div>
                      ) : (
                        friendsList.map(friend => {
                          const isAlreadyMember = collaborators.some(c => String(c.userId) === String(friend.id));
                          return (
                            <div className="trip-details-group-member" key={friend.id}>
                              <div className="trip-details-member-avatar">
                                <img src={friend.avatar || '/avatars/traveler.svg'} alt={friend.name} />
                              </div>
                              <div className="trip-details-member-main">
                                <div className="trip-details-member-name">{friend.name}</div>
                                <div className="trip-details-member-email">{friend.email}</div>
                              </div>
                              {isAlreadyMember ? (
                                <span className="trip-details-member-role">Đã tham gia</span>
                              ) : (
                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleInviteFriend(friend)}>
                                  <UserPlus size={14} style={{ marginRight: 4 }} /> Thêm
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
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
