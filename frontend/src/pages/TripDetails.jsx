import React, { useState, useEffect } from 'react';
import Layout from '../Components/Layout/Layout';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import TripEdit from './TripEdit';
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
  Car,
  MessageCircle,
  Plus,
  Search,
  Check,
  Edit3
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { sharingService } from '../services/sharingService';
import { friendService } from '../services/friendService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './TripDetails.css';

const PACKING_CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'clothing', label: 'Quần áo' },
  { key: 'devices', label: 'Thiết bị' },
  { key: 'tools', label: 'Đồ cá nhân' },
  { key: 'accessories', label: 'Phụ kiện' },
  { key: 'documents', label: 'Giấy tờ & Tiền' },
  { key: 'medical', label: 'Y tế & Thuốc' }
];

const TripDetails = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const showPlanEditor = searchParams.get('edit') === '1';
  const closePlanEditor = () => setSearchParams(previous => { previous.delete('edit'); return previous; }, { replace: true });
  const { getTripById, updateTrip, fetchTrips } = useTrips();
  const { user } = useAuth();
  const { pushNotification } = useNotifications();
  const { location: _currentPos, error: geoError, loading: geoLoading, getLocation } = useGeolocation();

  const contextTrip = getTripById(id);
  const [dbTrip, setDbTrip] = useState(null);
  const trip = dbTrip || contextTrip;
  const [isLoadingTrip, setIsLoadingTrip] = useState(!trip);
  const [packingItems, setPackingItems] = useState(trip?.packingItems || []);
  const [selectedDayTab, setSelectedDayTab] = useState('all');

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
      } finally {
        setIsLoadingTrip(false);
      }
    }
    loadFreshTrip();
  }, [id]);

  useEffect(() => {
    if (trip?.packingItems && packingItems.length === 0) {
      setPackingItems(trip.packingItems);
    }
    if (trip) {
      setIsLoadingTrip(false);
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

  // Packing Catalog Modal States
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogIds, setSelectedCatalogIds] = useState(new Set());
  const [catalogItemQuantities, setCatalogItemQuantities] = useState({});
  const [customPackingName, setCustomPackingName] = useState('');
  const [customPackingCategory, setCustomPackingCategory] = useState('clothing');
  const [customPackingQty, setCustomPackingQty] = useState(1);
  const [savingPacking, setSavingPacking] = useState(false);

  const openPackingCatalogModal = async () => {
    setShowPackingModal(true);
    setSelectedCatalogIds(new Set());
    setCatalogItemQuantities({});
    setCustomPackingName('');
    if (catalogItems.length === 0) {
      setCatalogLoading(true);
      try {
        const cat = await itineraryService.getPackingCatalog();
        if (Array.isArray(cat)) {
          setCatalogItems(cat);
        }
      } catch (err) {
        console.warn('Failed to fetch catalog:', err);
      } finally {
        setCatalogLoading(false);
      }
    }
  };

  const toggleSelectCatalogItem = (itemId) => {
    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const setCatalogQty = (itemId, delta) => {
    setCatalogItemQuantities((prev) => {
      const current = prev[itemId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handleSelectAllInCatalogCategory = (select) => {
    const existingNames = new Set(packingItems.map((p) => (p.itemName || p.name || '').toLowerCase().trim()));
    const matching = catalogItems.filter((item) => {
      const matchesCategory = catalogCategory === 'all' || item.category === catalogCategory;
      const matchesSearch = !catalogSearch || item.name.toLowerCase().includes(catalogSearch.toLowerCase());
      const alreadyAdded = existingNames.has(item.name.toLowerCase().trim());
      return matchesCategory && matchesSearch && !alreadyAdded;
    });

    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      matching.forEach((item) => {
        if (select) next.add(item.id);
        else next.delete(item.id);
      });
      return next;
    });
  };

  const handleAddSelectedPackingItems = async () => {
    const selectedList = catalogItems.filter((item) => selectedCatalogIds.has(item.id));
    const hasCustom = Boolean(customPackingName.trim());
    if (selectedList.length === 0 && !hasCustom) {
      setToast('Vui lòng chọn ít nhất một món đồ.');
      setTimeout(() => setToast(''), 2000);
      return;
    }

    setSavingPacking(true);
    const addedItems = [];

    // 1. Add selected catalog items
    for (const item of selectedList) {
      const qty = catalogItemQuantities[item.id] || item.defaultQuantity || 1;
      const payload = {
        itemName: item.name,
        category: item.category || 'other',
        quantity: qty,
        notes: item.notes || null,
        isPacked: false
      };
      try {
        if (/^\d+$/.test(String(trip?.id))) {
          const res = await itineraryService.addPackingItem(trip.id, payload);
          if (res && res.id) {
            addedItems.push(res);
          } else {
            addedItems.push({ id: `pack_${Date.now()}_${Math.random()}`, ...payload });
          }
        } else {
          addedItems.push({ id: `pack_${Date.now()}_${Math.random()}`, ...payload });
        }
      } catch (e) {
        console.warn('Failed to add packing item to backend:', e);
        addedItems.push({ id: `pack_${Date.now()}_${Math.random()}`, ...payload });
      }
    }

    // 2. Add custom item if entered
    if (hasCustom) {
      const customPayload = {
        itemName: customPackingName.trim(),
        category: customPackingCategory || 'other',
        quantity: Math.max(1, Number(customPackingQty) || 1),
        notes: null,
        isPacked: false
      };
      try {
        if (/^\d+$/.test(String(trip?.id))) {
          const res = await itineraryService.addPackingItem(trip.id, customPayload);
          if (res && res.id) {
            addedItems.push(res);
          } else {
            addedItems.push({ id: `pack_${Date.now()}_custom`, ...customPayload });
          }
        } else {
          addedItems.push({ id: `pack_${Date.now()}_custom`, ...customPayload });
        }
      } catch (_e) {
        addedItems.push({ id: `pack_${Date.now()}_custom`, ...customPayload });
      }
    }

    const nextPacking = [...packingItems, ...addedItems];
    setPackingItems(nextPacking);
    if (trip?.id) {
      updateTrip(trip.id, { packingItems: nextPacking });
    }
    setSavingPacking(false);
    setShowPackingModal(false);
    setToast(`Đã thêm thành công ${addedItems.length} món đồ vào danh sách.`);
    setTimeout(() => setToast(''), 2500);
  };

  const handleRemovePacking = async (e, packingItemId) => {
    e.stopPropagation();
    const nextPacking = packingItems.filter((p) => String(p.id) !== String(packingItemId));
    setPackingItems(nextPacking);
    if (trip?.id) {
      updateTrip(trip.id, { packingItems: nextPacking });
    }
    try {
      if (/^\d+$/.test(String(packingItemId)) && /^\d+$/.test(String(trip?.id))) {
        await itineraryService.removePackingItem(trip.id, packingItemId);
      }
    } catch (e) {
      console.warn('Failed to remove packing item:', e);
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

  const normalizeMapLoc = (loc) => {
    if (!loc) return null;
    const source = loc.location || loc;
    const rawLat = source.lat ?? source.latitude;
    const rawLng = source.lng ?? source.longitude;
    const lat = rawLat == null ? null : Number(rawLat);
    const lng = rawLng == null ? null : Number(rawLng);
    const hasValidCoords = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

    return {
      id: String(source.id || loc.locationId || loc.id || ''),
      tripLocId: loc.location ? loc.id : loc.tripLocId,
      name: loc.customName || source.name || 'Địa điểm',
      address: source.address || '',
      lat: hasValidCoords ? lat : null,
      lng: hasValidCoords ? lng : null,
      hasRealCoords: hasValidCoords,
      image: source.image || source.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
      suggestedDuration: source.suggestedDuration || null,
      estimatedCost: Number(source.estimatedCost || 0)
    };
  };

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
      return [{ day: 1, items: editingLocations.map(normalizeMapLoc).filter(Boolean).map((loc, idx) => ({ loc, idx, note: '' })) }];
    }

    const tripItems = Array.isArray(trip?.items) ? trip.items : [];
    if (tripItems.length > 0) {
      const map = new Map();
      tripItems.forEach((item, idx) => {
        if (!item) return;
        const locRaw = item.location || (item.name ? item : {
          id: item.locationId || `item_${idx}`,
          name: item.customName || `Điểm dừng ${idx + 1}`,
          address: item.address || '',
          lat: 21.0285,
          lng: 105.8542
        });
        const normalized = normalizeMapLoc(locRaw);
        if (!normalized) return;
        const day = parseDayFromNote(item?.note);
        const cleanNote = stripDayMarker(item?.note);
        if (!map.has(day)) map.set(day, []);
        map.get(day).push({ loc: normalized, idx, note: cleanNote, rawItem: item });
      });
      if (map.size > 0) {
        return [...map.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([day, items]) => ({ day, items }));
      }
    }

    const safeLocs = locations.map(normalizeMapLoc).filter(Boolean);
    if (safeLocs.length > 0) {
      return [{ day: 1, items: safeLocs.map((loc, idx) => ({ loc, idx, note: '', rawItem: null })) }];
    }

    return [{ day: 1, items: [] }];
  })();

  const lastLocation = locations[locations.length - 1];
  const displayEndLocation = trip?.endLocation || lastLocation?.name || trip?.destination || 'Chưa có điểm đến';
  const safeFormatDate = (value) => {
    if (!value) return '--/--/----';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '--/--/----' : format(date, 'dd/MM/yyyy');
  };

  const getDaysLeft = (dateStr) => {
    try {
      if (!dateStr) return '';
      const diff = differenceInDays(new Date(dateStr), new Date());
      if (diff > 0) return `Còn ${diff} ngày nữa`;
      if (diff === 0) return 'Khởi hành hôm nay!';
      return 'Đã kết thúc';
    } catch {
      return '';
    }
  };

  const visibleDayGroups = selectedDayTab === 'all'
    ? groupedLocationsByDay
    : groupedLocationsByDay.filter(dg => dg.day === selectedDayTab);

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
      (_err) => {
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
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_error) {
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

  if (!trip) {
    if (isLoadingTrip) {
      return (
        <Layout>
          <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Loader2 className="animate-spin" size={36} color="var(--primary)" />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Đang nạp chi tiết chuyến đi...</span>
          </div>
        </Layout>
      );
    }
    return (
      <Layout>
        <div className="trip-details-not-found">
          <h2>Không tìm thấy chuyến đi</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.25rem' }}>
            Chuyến đi này có thể đã được lưu ở phiên làm việc khác hoặc liên kết không chính xác.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/history" className="btn btn-primary trip-details-not-found-btn">
              Xem lịch sử chuyến đi
            </Link>
            <Link to="/" className="btn btn-outline trip-details-not-found-btn">
              Về trang chủ
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

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
          <Link to="/history" className="trip-details-header-link"><ArrowLeft size={14} /> Lịch sử chuyến đi</Link>
          <ChevronRight size={14} />
          <span>Chi tiết kế hoạch</span>
        </div>

        {/* Hero Info - Signature Web Framing */}
        <div className="trip-details-featured-hero">
          <div
            className="trip-details-hero-bg"
            style={{
              backgroundImage: `url(${locations[0]?.image || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=1400'})`
            }}
          />
          <div className="trip-details-hero-overlay" />
          <div className="trip-details-hero-content">
            <div className="trip-details-hero-top">
              <span className={`badge ${trip.status === 'upcoming' ? 'badge-gold' : (trip.status === 'ongoing' ? 'badge-forest' : 'badge-completed')}`}>
                {trip.status === 'upcoming' ? 'CHUYẾN ĐI SẮP TỚI' : (trip.status === 'ongoing' ? 'ĐANG DIỄN RA' : 'ĐÃ HOÀN THÀNH')}
              </span>
              <div className="trip-details-hero-top-right">
                {trip.startDate && (
                  <span className="trip-details-hero-countdown">
                    <Clock size={13} /> {getDaysLeft(trip.startDate)}
                  </span>
                )}
              </div>
            </div>

            <div className="trip-details-hero-main">
              <h1 className="trip-details-hero-title">{trip.title || trip.name}</h1>
              <p className="trip-details-hero-route">
                <MapPin size={16} />
                <span>{trip.startLocation || 'Chưa có điểm đi'} → {displayEndLocation} · {locations.length} điểm dừng</span>
              </p>

              <div className="trip-details-hero-meta">
                <div className="trip-details-hero-meta-item">
                  <Calendar size={15} />
                  <span>{safeFormatDate(trip.startDate)} - {safeFormatDate(trip.endDate)}</span>
                </div>
                <div className="trip-details-hero-meta-item">
                  <DollarSign size={15} />
                  <span>Ngân sách: {Number(trip.budget ?? trip.totalCost ?? 0).toLocaleString()} VNĐ</span>
                </div>
                <div className="trip-details-hero-meta-item">
                  <Users size={15} />
                  <span>{trip.travelerCount || 1} người tham gia</span>
                </div>
                {trip.transportMode && (
                  <div className="trip-details-hero-meta-item">
                    <Car size={15} />
                    <span>{({ flight: 'Máy bay', coach: 'Xe khách', train: 'Tàu hỏa', motorbike: 'Xe máy', car: 'Ô tô tự lái', walk: 'Đi bộ' })[trip.transportMode] || trip.transportMode}</span>
                  </div>
                )}
              </div>

              {Array.isArray(trip.preferences) && trip.preferences.length > 0 && (
                <div className="trip-details-hero-prefs">
                  {trip.preferences.map((p) => (
                    <span key={p} className="trip-details-hero-pref-tag">#{p}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="trip-details-hero-actions">
              {canEditTrip && trip.status !== 'completed' && (
                <button
                  onClick={() => updateTrip(trip.id, { status: trip.status === 'upcoming' ? 'ongoing' : 'upcoming' })}
                  className={`btn ${trip.status === 'upcoming' ? 'btn-primary' : 'btn-outline trip-details-glass-btn'}`}
                >
                  {trip.status === 'upcoming' ? 'Bắt đầu chuyến đi' : 'Tạm dừng chuyến đi'}
                </button>
              )}
              {canEditTrip && trip.status !== 'completed' && (
                <button onClick={handleVerifyLocation} className="btn trip-details-action-finish">
                  <CheckCircle size={16} /> Hoàn thành chuyến đi
                </button>
              )}
              {canEditTrip && (
                <button type="button" onClick={() => { setSearchParams(previous => { previous.set('edit', '1'); return previous; }); }} className="btn btn-outline trip-details-glass-btn">
                  <Edit3 size={16} /> Chỉnh sửa kế hoạch
                </button>
              )}
              <button onClick={openGroupModal} className="btn btn-outline trip-details-glass-btn">
                <Users size={16} /> Nhóm kế hoạch
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-trip-chat', {
                    detail: { itineraryId: trip.id, tripName: trip.title || trip.name }
                  }));
                }}
                className="btn btn-primary"
                style={{ gap: 6 }}
              >
                <MessageCircle size={16} /> Nhóm chat
              </button>
            </div>
          </div>
        </div>

        {/* Edit Info Form Card */}
        {showPlanEditor && canEditTrip && <div className="card trip-details-edit-form-card" id="plan-editor">
          <TripEdit embedded onCancel={closePlanEditor} onSaved={updated => { setDbTrip(updated); setPackingItems(updated.packingItems || []); setGroupMembers(null); closePlanEditor(); }} />
        </div>}
        {isEditingInfo && (
          <div className="card trip-details-edit-form-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Edit3 size={18} color="var(--primary)" /> Sửa thông tin kế hoạch
            </h3>
            <div className="trip-details-edit-grid">
              <div>
                <label className="trip-details-input-label">Tên chuyến đi</label>
                <input className="trip-planner-input" value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Tên chuyến đi" />
              </div>
              <div className="trip-details-edit-row">
                <div>
                  <label className="trip-details-input-label">Điểm khởi hành</label>
                  <input className="trip-planner-input" value={editForm.startLocation} onChange={(e) => setEditForm((p) => ({ ...p, startLocation: e.target.value }))} placeholder="Điểm đi" />
                </div>
                <div>
                  <label className="trip-details-input-label">Điểm kết thúc</label>
                  <input className="trip-planner-input" value={editForm.endLocation} onChange={(e) => setEditForm((p) => ({ ...p, endLocation: e.target.value }))} placeholder="Điểm kết thúc" />
                </div>
              </div>
              <div className="trip-details-edit-row">
                <div>
                  <label className="trip-details-input-label">Ngày bắt đầu</label>
                  <input type="date" className="trip-planner-input" value={editForm.startDate} onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="trip-details-input-label">Ngày kết thúc</label>
                  <input type="date" className="trip-planner-input" value={editForm.endDate} onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="trip-details-input-label">Ngân sách dự kiến (VNĐ)</label>
                <input type="number" className="trip-planner-input" value={editForm.budget} onChange={(e) => setEditForm((p) => ({ ...p, budget: e.target.value }))} placeholder="Ngân sách" />
              </div>
              <div>
                <label className="trip-details-input-label">Ghi chú chuyến đi</label>
                <textarea className="trip-planner-textarea" rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Ghi chú thêm..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleSaveInfo}>Lưu thay đổi</button>
                <button className="btn btn-outline" onClick={() => setIsEditingInfo(false)}>Hủy</button>
              </div>
            </div>
          </div>
        )}

        {/* Cost Breakdown Card */}
        {(Number(trip.costTransport) > 0 || Number(trip.costMeals) > 0 || Number(trip.costAttractions) > 0 || Number(trip.costAccommodation) > 0 || Number(trip.costContingency) > 0 || Number(trip.totalCost) > 0) && (
          <div className="card trip-details-cost-card">
            <div className="trip-details-cost-header">
              <div>
                <h3 className="trip-details-cost-title">
                  <DollarSign size={18} color="var(--primary)" /> Dự toán chi phí chi tiết
                </h3>
                <p className="trip-details-cost-subtitle">
                  {trip.costScope === 'PERSON'
                    ? `Tính trên đầu người (nhân với ${trip.travelerCount || 1} người)`
                    : 'Tổng chi phí dự tính cho toàn bộ đoàn'}
                </p>
              </div>
              <div className="trip-details-cost-total-badge">
                <span>Tổng dự kiến:</span>
                <strong>{Number(trip.totalCost ?? trip.budget ?? 0).toLocaleString()} VNĐ</strong>
              </div>
            </div>

            <div className="trip-details-cost-grid">
              <div className="trip-details-cost-col">
                <span className="cost-col-label">🚗 Di chuyển</span>
                <strong className="cost-col-val">{Number(trip.costTransport || 0).toLocaleString()} VNĐ</strong>
              </div>
              <div className="trip-details-cost-col">
                <span className="cost-col-label">🍜 Ăn uống</span>
                <strong className="cost-col-val">{Number(trip.costMeals || 0).toLocaleString()} VNĐ</strong>
              </div>
              <div className="trip-details-cost-col">
                <span className="cost-col-label">🎟️ Tham quan</span>
                <strong className="cost-col-val">{Number(trip.costAttractions || 0).toLocaleString()} VNĐ</strong>
              </div>
              <div className="trip-details-cost-col">
                <span className="cost-col-label">🏨 Lưu trú</span>
                <strong className="cost-col-val">{Number(trip.costAccommodation || 0).toLocaleString()} VNĐ</strong>
              </div>
              <div className="trip-details-cost-col">
                <span className="cost-col-label">🛡️ Dự phòng</span>
                <strong className="cost-col-val">{Number(trip.costContingency || 0).toLocaleString()} VNĐ</strong>
              </div>
            </div>
          </div>
        )}

        <div className="trip-details-grid">
          {/* Main Itinerary Column */}
          <div className="trip-details-main-column">
            {/* Interactive Route Map */}
            <div className="card trip-details-map-card">
              <div className="trip-details-map-header">
                <div>
                  <h3 className="trip-details-map-title">
                    <MapPin size={18} color="var(--primary)" /> Bản đồ lộ trình ({locations.length} điểm dừng)
                  </h3>
                  <p className="trip-details-map-subtitle">
                    {isEditingInfo ? 'Chế độ chỉnh sửa: Bấm lên bản đồ để thêm hoặc xóa điểm đến.' : 'Theo dõi tuyến đường di chuyển trực quan.'}
                  </p>
                </div>
                {isEditingInfo && (
                  <div className="trip-details-map-actions">
                    <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.825rem' }} onClick={handleSaveTimeline}>Lưu lịch trình</button>
                    <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.825rem' }} onClick={() => setEditingLocations(locations.map(normalizeMapLoc))}>Khôi phục</button>
                  </div>
                )}
              </div>
              <div className="trip-details-map-view">
                <MapComponent
                  selectedLocations={(isEditingInfo ? editingLocations : locations).map(normalizeMapLoc)}
                  onLocationAdd={isEditingInfo ? handleAddEditLocation : undefined}
                  onLocationRemove={isEditingInfo ? handleRemoveEditLocation : undefined}
                />
              </div>
            </div>

            {/* Timeline Section */}
            <div className="card trip-details-timeline-card-wrapper">
              <div className="trip-details-timeline-header">
                <div>
                  <h3 className="trip-details-timeline-title">
                    <Clock size={20} color="var(--primary)" /> Lịch trình chi tiết
                  </h3>
                  <p className="trip-details-timeline-subtitle">
                    Bấm vào từng điểm dừng để xem dự báo thời tiết và chi tiết hoạt động
                  </p>
                </div>
                {groupedLocationsByDay.length > 1 && (
                  <div className="trip-details-day-tabs">
                    <button
                      type="button"
                      className={`trip-details-day-tab ${selectedDayTab === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedDayTab('all')}
                    >
                      Tất cả ngày ({locations.length})
                    </button>
                    {groupedLocationsByDay.map((dg) => (
                      <button
                        key={dg.day}
                        type="button"
                        className={`trip-details-day-tab ${selectedDayTab === dg.day ? 'active' : ''}`}
                        onClick={() => setSelectedDayTab(dg.day)}
                      >
                        Ngày {dg.day} ({dg.items.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="trip-details-timeline">
                <div className="trip-details-timeline-line" />
                {visibleDayGroups.map((dayGroup) => (
                  <div key={`day_${dayGroup.day}`} className="trip-details-day-group">
                    <div className="trip-details-day-heading">
                      <span className="trip-details-day-tag">Ngày {dayGroup.day}</span>
                      <span className="trip-details-day-meta">
                        {dayGroup.items.length} điểm dừng
                      </span>
                    </div>

                    <div className="trip-details-day-items">
                      {dayGroup.items.map(({ loc, idx, note, rawItem }, itemIndex) => {
                        const isStopActive = String(activeWeatherLoc) === String(loc.id);
                        return (
                          <div
                            key={`${dayGroup.day}_${loc.tripLocId || loc.id}_${idx}`}
                            className={`trip-details-timeline-item ${isStopActive ? 'active' : ''}`}
                            onClick={() => fetchWeather(loc.id, loc.lat, loc.lng)}
                          >
                            <div className="trip-details-timeline-badge">
                              {itemIndex + 1}
                            </div>

                            <div className="trip-details-timeline-body">
                              <div className="trip-details-timeline-thumb-box">
                                <img
                                  src={loc.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'}
                                  alt={loc.name}
                                  className="trip-details-timeline-img"
                                  onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1';
                                  }}
                                />
                              </div>

                              <div className="trip-details-timeline-info">
                                <div className="trip-details-timeline-title-row">
                                  <h4 className="trip-details-timeline-name">
                                    {rawItem?.customName || loc.name}
                                  </h4>
                                  <button
                                    type="button"
                                    className={`trip-details-weather-trigger ${isStopActive ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchWeather(loc.id, loc.lat, loc.lng);
                                    }}
                                    title="Xem thời tiết điểm dừng này"
                                  >
                                    <Thermometer size={13} /> {isStopActive ? 'Đang xem' : 'Thời tiết'}
                                  </button>
                                </div>

                                <p className="trip-details-timeline-address">
                                  <MapPin size={13} /> {loc.address || 'Chưa có địa chỉ chi tiết'}
                                </p>

                                {(rawItem?.startTime || rawItem?.endTime || loc.startTime || rawItem?.durationMinutes || rawItem?.travelMinutes) && (
                                  <div className="trip-details-schedule-chips">
                                    {(rawItem?.startTime || loc.startTime) && (
                                      <span className="chip chip-time">
                                        <Clock size={12} />
                                        Bắt đầu: {rawItem?.startTime ? format(new Date(rawItem.startTime), 'HH:mm') : loc.startTime}
                                      </span>
                                    )}
                                    {rawItem?.endTime && <span className="chip chip-time"><Clock size={12} /> Kết thúc: {format(new Date(rawItem.endTime), 'HH:mm')}</span>}
                                    {rawItem?.durationMinutes ? (
                                      <span className="chip chip-duration">
                                        Thời lượng: {rawItem.durationMinutes} phút
                                      </span>
                                    ) : null}
                                    {rawItem?.travelMinutes ? (
                                      <span className="chip chip-travel">
                                        <Car size={12} /> Di chuyển: {rawItem.travelMinutes} phút
                                      </span>
                                    ) : null}
                                  </div>
                                )}

                                {note && (
                                  <div className="trip-details-timeline-note">
                                    <StickyNote size={13} />
                                    <span>{note}</span>
                                  </div>
                                )}

                                <div className="trip-details-timeline-tags">
                                  <span className="trip-details-tag-duration">
                                    <Clock size={11} /> Gợi ý: {loc.suggestedDuration || '2 giờ'}
                                  </span>
                                  <span className="trip-details-tag-cost">
                                    <DollarSign size={11} /> Phí: {loc.estimatedCost ? `${Number(loc.estimatedCost).toLocaleString()} VNĐ` : 'Miễn phí'}
                                  </span>
                                </div>

                                {isEditingInfo && (
                                  <div className="trip-details-actions" style={{ marginTop: '0.6rem', gap: '0.4rem' }}>
                                    <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); moveLocation(idx, idx - 1); }}>Lên</button>
                                    <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); moveLocation(idx, idx + 1); }}>Xuống</button>
                                    <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-danger)' }} onClick={(e) => { e.stopPropagation(); handleRemoveEditLocation(loc.id); }}>Xóa điểm</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar: Weather & Packing & Notes */}
          <div className="trip-details-sidebar">
            {/* Weather Card */}
            <div className="trip-details-weather-card">
              <div className="trip-details-weather-header">
                <div className="trip-details-weather-title-box">
                  <Thermometer size={18} className="trip-details-weather-icon" />
                  <h3 className="trip-details-weather-title">Thời tiết hiện tại</h3>
                </div>
                <span className="trip-details-weather-badge">Trực tiếp</span>
              </div>

              <AnimatePresence mode="wait">
                {activeWeatherLoc && weatherData[activeWeatherLoc] ? (
                  <motion.div
                    key={activeWeatherLoc}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="trip-details-weather-content"
                  >
                    <div className="trip-details-weather-loc-name">
                      <MapPin size={13} />
                      <span>
                        {(() => {
                          const flat = locations.find(l => String(l.id) === String(activeWeatherLoc));
                          return flat?.name || 'Điểm dừng đã chọn';
                        })()}
                      </span>
                    </div>

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
                        <div className="trip-details-weather-label">Vị trí điểm dừng</div>
                        <div className="trip-details-weather-val">
                          {(() => {
                            for (const dg of groupedLocationsByDay) {
                              const found = dg.items.find(({ loc }) => String(loc.id) === String(activeWeatherLoc));
                              if (found) return `Ngày ${dg.day} · #${dg.items.indexOf(found) + 1}`;
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
                    {geoLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Đang nạp dữ liệu thời tiết...</p>
                      </>
                    ) : (
                      <p style={{ fontSize: '0.85rem', margin: 0 }}>
                        Bấm vào bất kỳ điểm dừng nào trên lịch trình để cập nhật thời tiết.
                      </p>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Packing Checklist Card */}
            <div className="card trip-details-packing-card">
              <div className="trip-details-sidebar-card-header">
                <h3 className="trip-details-sidebar-card-title">
                  <Briefcase size={18} color="var(--primary)" /> Đồ cần mang theo ({packingItems.filter(p => p.isPacked).length}/{packingItems.length})
                </h3>
                <button
                  type="button"
                  onClick={openPackingCatalogModal}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={13} /> Thêm đồ
                </button>
              </div>

              {packingItems.length > 0 ? (
                <>
                  <div className="trip-details-packing-progress-track">
                    <div
                      className="trip-details-packing-progress-fill"
                      style={{
                        width: `${Math.round((packingItems.filter(p => p.isPacked).length / Math.max(1, packingItems.length)) * 100)}%`
                      }}
                    />
                  </div>

                  <div className="trip-details-packing-items-list">
                    {packingItems.map((item) => (
                      <div
                        key={item.id}
                        className={`trip-details-packing-item-row ${item.isPacked ? 'packed' : ''}`}
                        onClick={() => handleTogglePacking(item.id)}
                      >
                        {item.isPacked ? (
                          <CheckSquare size={16} className="packing-check-icon checked" />
                        ) : (
                          <Square size={16} className="packing-check-icon" />
                        )}
                        <div className="packing-item-text">
                          <span className="packing-item-name">{item.itemName || item.name}</span>
                          {item.notes && <span className="packing-item-note">({item.notes})</span>}
                        </div>
                        <span className="packing-item-qty">
                          x{item.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemovePacking(e, item.id)}
                          className="trip-details-packing-delete-btn"
                          title="Xóa món đồ này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="trip-details-packing-empty">
                  <p>Chưa có danh sách đồ chuẩn bị cho chuyến đi này.</p>
                  <button
                    type="button"
                    onClick={openPackingCatalogModal}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={13} /> Chọn từ danh mục mẫu
                  </button>
                </div>
              )}
            </div>

            {/* Notes Card */}
            <div className="card trip-details-notes-card">
              <h3 className="trip-details-sidebar-card-title">
                <StickyNote size={18} color="var(--primary)" /> Ghi chú chuyến đi
              </h3>
              <div className="trip-details-notes-box">
                <p className="trip-details-notes-content">
                  {trip.notes || 'Không có ghi chú nào cho chuyến đi này.'}
                </p>
              </div>
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
                <div className="trip-details-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setShowGroupModal(false);
                      window.dispatchEvent(new CustomEvent('open-trip-chat', {
                        detail: { itineraryId: trip.id, tripName: trip.title || trip.name }
                      }));
                    }}
                    className="btn btn-primary"
                    style={{ gap: 6 }}
                  >
                    <MessageCircle size={16} /> Mở nhóm chat
                  </button>
                  <button onClick={() => setShowGroupModal(false)} className="btn btn-outline trip-details-modal-btn">
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Packing Items Catalog Selector Modal */}
        <AnimatePresence>
          {showPackingModal && (
            <div className="trip-details-modal-overlay">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card trip-details-modal-card trip-details-packing-catalog-modal"
              >
                <div className="trip-details-modal-header">
                  <div>
                    <h2 className="trip-details-modal-title" style={{ fontSize: '1.25rem' }}>Danh mục đồ dùng cần thiết</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                      Chọn nhanh các vật dụng cần chuẩn bị có sẵn trong hệ thống hoặc tự thêm món mới
                    </p>
                  </div>
                  <button onClick={() => setShowPackingModal(false)} className="trip-details-modal-close"><X size={20} /></button>
                </div>

                <div className="trip-details-modal-body" style={{ textAlign: 'left', padding: '1rem' }}>
                  {/* Category filters */}
                  <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                    {PACKING_CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        className={`btn ${catalogCategory === cat.key ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        onClick={() => setCatalogCategory(cat.key)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Search and Quick Select */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                      <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Tìm kiếm đồ dùng..."
                        style={{ width: '100%', padding: '0.35rem 0.5rem 0.35rem 1.8rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: 6 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectAllInCatalogCategory(true)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectAllInCatalogCategory(false)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Catalog items list */}
                  {catalogLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ fontSize: '0.85rem' }}>Đang nạp danh mục vật dụng...</p>
                    </div>
                  ) : (
                    <div className="trip-details-packing-catalog-grid">
                      {catalogItems
                        .filter(item => {
                          const matchesCat = catalogCategory === 'all' || item.category === catalogCategory;
                          const matchesSearch = !catalogSearch || item.name.toLowerCase().includes(catalogSearch.toLowerCase());
                          return matchesCat && matchesSearch;
                        })
                        .map(item => {
                          const existingNames = new Set(packingItems.map(p => (p.itemName || p.name || '').toLowerCase().trim()));
                          const alreadyInTrip = existingNames.has(item.name.toLowerCase().trim());
                          const isSelected = selectedCatalogIds.has(item.id);
                          const currentQty = catalogItemQuantities[item.id] || item.defaultQuantity || 1;

                          return (
                            <div
                              key={item.id}
                              className={`trip-details-packing-catalog-item ${alreadyInTrip ? 'disabled' : (isSelected ? 'selected' : '')}`}
                              onClick={() => {
                                if (!alreadyInTrip) toggleSelectCatalogItem(item.id);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                                {alreadyInTrip ? (
                                  <Check size={16} color="#16a34a" />
                                ) : isSelected ? (
                                  <CheckSquare size={16} color="var(--primary)" />
                                ) : (
                                  <Square size={16} color="var(--text-muted)" />
                                )}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: alreadyInTrip ? '#16a34a' : 'inherit' }}>
                                    {item.name}
                                  </div>
                                  {item.notes && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {item.notes}
                                    </div>
                                  )}
                                  {alreadyInTrip && (
                                    <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
                                      ✓ Đã có trong chuyến
                                    </div>
                                  )}
                                </div>
                              </div>

                              {!alreadyInTrip && isSelected && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setCatalogQty(item.id, -1)}
                                    style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: 4, padding: '0.1rem 0.35rem', cursor: 'pointer' }}
                                  >
                                    -
                                  </button>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 16, textAlign: 'center' }}>
                                    {currentQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setCatalogQty(item.id, 1)}
                                    style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: 4, padding: '0.1rem 0.35rem', cursor: 'pointer' }}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Custom item quick add row */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Tự thêm món khác:</span>
                    <input
                      type="text"
                      value={customPackingName}
                      onChange={(e) => setCustomPackingName(e.target.value)}
                      placeholder="Tên đồ dùng..."
                      style={{ flex: 1, minWidth: 140, fontSize: '0.8rem', padding: '0.3rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4 }}
                    />
                    <select
                      value={customPackingCategory}
                      onChange={(e) => setCustomPackingCategory(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4 }}
                    >
                      <option value="clothing">Quần áo</option>
                      <option value="devices">Thiết bị</option>
                      <option value="tools">Đồ cá nhân</option>
                      <option value="accessories">Phụ kiện</option>
                      <option value="documents">Giấy tờ & Tiền</option>
                      <option value="medical">Y tế & Thuốc</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={customPackingQty}
                      onChange={(e) => setCustomPackingQty(Math.max(1, Number(e.target.value) || 1))}
                      style={{ width: 50, fontSize: '0.8rem', padding: '0.3rem', border: '1px solid #cbd5e1', borderRadius: 4 }}
                    />
                  </div>
                </div>

                <div className="trip-details-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Đã chọn: <strong>{selectedCatalogIds.size + (customPackingName.trim() ? 1 : 0)}</strong> món
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowPackingModal(false)}
                      className="btn btn-outline trip-details-modal-btn"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSelectedPackingItems}
                      disabled={savingPacking || (selectedCatalogIds.size === 0 && !customPackingName.trim())}
                      className="btn btn-primary trip-details-modal-btn"
                    >
                      {savingPacking ? (
                        <><Loader2 className="animate-spin" size={14} style={{ marginRight: 4 }} /> Đang thêm...</>
                      ) : (
                        `Thêm vào chuyến đi (${selectedCatalogIds.size + (customPackingName.trim() ? 1 : 0)})`
                      )}
                    </button>
                  </div>
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
