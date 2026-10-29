import React, { useState, useEffect } from 'react';
import Layout from '../Components/Layout/Layout';
import MapComponent from '../Components/Map/MapComponent';
import { useTrips } from '../context/TripContext';
import { useNavigate, Link } from 'react-router-dom';
import { itineraryService } from '../services/itineraryService';
import { locationService } from '../services/locationService';
import { friendService } from '../services/friendService';
import { motion, Reorder } from 'framer-motion';
import {
  Save,
  MapPin,
  DollarSign,
  X,
  GripVertical,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Users,
  Compass,
  Clock,
  Briefcase,
  Plus,
  CheckSquare,
  Square,
  Calendar,
  Columns3,
  Maximize2,
  Info,
  Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import './TripPlanner.css';

const PREFERENCE_OPTIONS = [
  { value: 'beach', label: 'Biển' },
  { value: 'mountain', label: 'Núi rừng' },
  { value: 'food', label: 'Ẩm thực' },
  { value: 'culture', label: 'Văn hóa di sản' },
  { value: 'nature', label: 'Thiên nhiên' },
  { value: 'shopping', label: 'Mua sắm' },
  { value: 'nightlife', label: 'Về đêm' },
  { value: 'adventure', label: 'Mạo hiểm' },
  { value: 'relax', label: 'Nghỉ dưỡng' },
  { value: 'photography', label: 'Chụp ảnh' }
];

const TRANSPORT_OPTIONS = [
  { value: 'flight', label: 'Máy bay' },
  { value: 'coach', label: 'Xe khách / Xe du lịch' },
  { value: 'train', label: 'Tàu hỏa' },
  { value: 'motorbike', label: 'Xe máy' },
  { value: 'car', label: 'Ô tô tự lái' },
  { value: 'other', label: 'Khác / Đi bộ' }
];

const PACKING_CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'clothing', label: 'Quần áo' },
  { key: 'devices', label: 'Thiết bị' },
  { key: 'tools', label: 'Đồ cá nhân' },
  { key: 'accessories', label: 'Phụ kiện' },
  { key: 'documents', label: 'Giấy tờ & Tiền' },
  { key: 'medical', label: 'Y tế & Thuốc' }
];

const TripPlanner = () => {
  const { addTrip, fetchTrips } = useTrips();
  const navigate = useNavigate();

  // 1. Basic Trip Info
  const [tripInfo, setTripInfo] = useState({
    title: '',
    startLocation: '',
    endLocation: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 86400000 * 3), 'yyyy-MM-dd'),
    notes: '',
    travelerCount: 2,
    transportMode: 'flight',
    preferences: ['food', 'relax']
  });

  // 2. Cost Breakdown
  const [showCostAccordion, setShowCostAccordion] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  useEffect(() => {
    friendService.getFriends().then(f => setFriendsList(f || [])).catch(() => {});
  }, []);

  const toggleSelectFriend = (friendId) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const [costBreakdown, setCostBreakdown] = useState({
    scope: 'PERSON', // 'PERSON' or 'GROUP'
    transport: 500000,
    meals: 400000,
    attractions: 250000,
    accommodation: 600000,
    contingency: 150000
  });

  // Layout mode: 'split' (Left Panel with Tabs + Large Map) or 'columns' (3 Columns on wide screens)
  const [layoutMode, setLayoutMode] = useState('split');

  // Active Tab: 'schedule', 'info', or 'packing'
  const [activeSideTab, setActiveSideTab] = useState('schedule');

  // Hourly Timeline Activities
  const [scheduleItems, setScheduleItems] = useState([]);

  // Packing Checklist
  const [packingList, setPackingList] = useState([]);
  const [packingCategoryFilter, setPackingCategoryFilter] = useState('all');
  const [newPackingName, setNewPackingName] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Fetch packing catalog from DB on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const catalog = await itineraryService.getPackingCatalog();
        if (catalog && catalog.length > 0) {
          setPackingList(
            catalog.map((item, idx) => ({
              id: item.id || `pack_${idx}`,
              itemName: item.name,
              category: item.category || 'other',
              quantity: item.defaultQuantity || 1,
              notes: item.notes || '',
              selected: idx < 12 // Pre-select first 12 essential items by default
            }))
          );
        }
      } catch (err) {
        console.warn('Failed to load packing catalog:', err);
      }
    }
    loadCatalog();
  }, []);

  // Compute Days
  const computeDays = () => {
    if (!tripInfo.startDate || !tripInfo.endDate) return 1;
    const diff = Math.ceil((new Date(tripInfo.endDate) - new Date(tripInfo.startDate)) / 86400000) + 1;
    return diff > 0 ? diff : 1;
  };

  // Cost Computations
  const perPersonCostSum =
    Number(costBreakdown.transport || 0) +
    Number(costBreakdown.meals || 0) +
    Number(costBreakdown.attractions || 0) +
    Number(costBreakdown.accommodation || 0) +
    Number(costBreakdown.contingency || 0);

  const totalCalculatedCost =
    costBreakdown.scope === 'GROUP'
      ? perPersonCostSum
      : perPersonCostSum * (tripInfo.travelerCount || 1);

  // Preference Toggle
  const togglePreference = (val) => {
    setTripInfo((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(val)
        ? prev.preferences.filter((p) => p !== val)
        : [...prev.preferences, val]
    }));
  };

  // Add Location from Map
  const handleLocationAdd = (loc) => {
    const defaultTime = `${String(8 + (scheduleItems.length % 5) * 2).padStart(2, '0')}:00`;
    const newItem = {
      tripLocId: `trip_loc_${Date.now()}_${scheduleItems.length}`,
      locationId: loc.id,
      name: loc.name || 'Điểm đến mới',
      customName: loc.name || '',
      address: loc.address || '',
      latitude: loc.latitude ?? loc.lat,
      longitude: loc.longitude ?? loc.lng,
      imageUrl: loc.imageUrl || loc.image,
      startTime: defaultTime,
      durationMinutes: 90,
      travelMinutes: 20,
      note: ''
    };
    setScheduleItems((prev) => [...prev, newItem]);
  };

  // Add Custom Activity (e.g., ăn uống, nghỉ ngơi, di chuyển)
  const handleAddCustomActivity = () => {
    const defaultTime = `${String(8 + (scheduleItems.length % 5) * 2).padStart(2, '0')}:00`;
    const newItem = {
      tripLocId: `custom_act_${Date.now()}`,
      locationId: null,
      name: 'Hoạt động tự do',
      customName: 'Ăn uống / Nghỉ ngơi',
      startTime: defaultTime,
      durationMinutes: 60,
      travelMinutes: 15,
      note: ''
    };
    setScheduleItems((prev) => [...prev, newItem]);
  };

  // Remove Activity
  const handleLocationRemove = (tripLocId) => {
    setScheduleItems((prev) => prev.filter((item) => item.tripLocId !== tripLocId));
  };

  // Update Activity Field
  const updateScheduleItem = (tripLocId, field, value) => {
    setScheduleItems((prev) =>
      prev.map((item) => (item.tripLocId === tripLocId ? { ...item, [field]: value } : item))
    );
  };

  // Packing Checklist Handlers
  const togglePackingItemSelect = (id) => {
    setPackingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const updatePackingField = (id, field, value) => {
    setPackingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddCustomPackingItem = () => {
    if (!newPackingName.trim()) return;
    const newItem = {
      id: `custom_pack_${Date.now()}`,
      itemName: newPackingName.trim(),
      category: packingCategoryFilter === 'all' ? 'other' : packingCategoryFilter,
      quantity: 1,
      notes: '',
      selected: true
    };
    setPackingList((prev) => [newItem, ...prev]);
    setNewPackingName('');
  };

  // Ensure Location is persisted in backend DB
  const ensurePersistedLocation = async (loc) => {
    if (/^\d+$/.test(String(loc.locationId || loc.id))) return loc;
    if (!loc.name || loc.name === 'Hoạt động tự do') return loc;

    try {
      const created = await locationService.createManual({
        name: loc.name,
        address: loc.address || '',
        latitude: loc.latitude || 21.0285,
        longitude: loc.longitude || 105.8542,
        category: 'manual',
        region: tripInfo.endLocation || 'Việt Nam',
        imageUrl: loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
        estimatedCost: 0,
        suggestedDuration: `${loc.durationMinutes || 60} phút`
      });
      return { ...loc, locationId: created.id };
    } catch {
      return loc;
    }
  };

  // Save Full Trip Plan
  const handleSaveTrip = async () => {
    if (!tripInfo.title.trim()) {
      setToast('Vui lòng nhập tên chuyến đi!');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    if (!tripInfo.startLocation.trim()) {
      setToast('Vui lòng nhập điểm xuất phát!');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    setSaving(true);
    try {
      // 1. Persist any unpersisted map locations
      const persistedItems = [];
      for (const item of scheduleItems) {
        persistedItems.push(await ensurePersistedLocation(item));
      }

      const mainDestination =
        tripInfo.endLocation.trim() ||
        (persistedItems.length > 0 ? persistedItems[0].name : tripInfo.title);

      // Selected Packing Items to Save
      const selectedPackingToSave = packingList
        .filter((item) => item.selected)
        .map((item) => ({
          itemName: item.itemName,
          category: item.category,
          quantity: Math.max(1, Number(item.quantity) || 1),
          notes: item.notes,
          isPacked: false
        }));

      // Payload for Backend
      const payload = {
        name: tripInfo.title.trim(),
        destination: mainDestination,
        startLocation: tripInfo.startLocation.trim(),
        endLocation: tripInfo.endLocation.trim() || mainDestination,
        startDate: tripInfo.startDate ? `${tripInfo.startDate}T00:00:00.000Z` : null,
        endDate: tripInfo.endDate ? `${tripInfo.endDate}T23:59:59.000Z` : null,
        totalDays: computeDays(),
        travelerCount: Math.max(1, Number(tripInfo.travelerCount) || 1),
        transportMode: tripInfo.transportMode,
        costScope: costBreakdown.scope,
        costTransport: Number(costBreakdown.transport || 0),
        costMeals: Number(costBreakdown.meals || 0),
        costAttractions: Number(costBreakdown.attractions || 0),
        costAccommodation: Number(costBreakdown.accommodation || 0),
        costContingency: Number(costBreakdown.contingency || 0),
        budget: totalCalculatedCost,
        preferences: tripInfo.preferences,
        description: tripInfo.notes.trim() || null,
        items: persistedItems.map((item) => ({
          locationId: item.locationId || null,
          customName: item.customName || item.name || null,
          startTime: item.startTime ? `${tripInfo.startDate}T${item.startTime}:00.000Z` : null,
          durationMinutes: Number(item.durationMinutes) || null,
          travelMinutes: Number(item.travelMinutes) || null,
          note: item.note || null
        })),
        packingItems: selectedPackingToSave,
        collaboratorIds: selectedFriendIds
      };

      // 2. Call backend API to save to MySQL through Prisma
      const savedTrip = await itineraryService.create(payload);

      // 3. Keep TripContext & LocalStorage synchronized
      const tripForContext = {
        ...savedTrip,
        id: savedTrip.id || Date.now().toString(),
        title: tripInfo.title,
        name: tripInfo.title,
        locations: persistedItems,
        items: savedTrip.items || persistedItems,
        packingItems: savedTrip.packingItems || selectedPackingToSave,
        costBreakdown,
        totalCost: totalCalculatedCost
      };
      await addTrip(tripForContext);
      await fetchTrips();

      navigate(`/trip/${tripForContext.id}`);
    } catch (err) {
      console.error('Save manual plan error:', err);
      setToast('Có lỗi khi lưu kế hoạch vào cơ sở dữ liệu. Vui lòng thử lại!');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const filteredPackingItems =
    packingCategoryFilter === 'all'
      ? packingList
      : packingList.filter((item) => item.category === packingCategoryFilter);

  // Render Section 1: Trip Info Form
  const renderTripInfoForm = () => (
    <div className="trip-planner-form">
      {/* Trip Title */}
      <div className="trip-planner-field">
        <label className="trip-planner-label">Tên chuyến đi <span className="text-danger">*</span></label>
        <input
          type="text"
          placeholder="Ví dụ: Du lịch Đà Nẵng - Hội An 4 ngày 3 đêm"
          className="trip-planner-input"
          value={tripInfo.title}
          onChange={(e) => setTripInfo({ ...tripInfo, title: e.target.value })}
        />
      </div>

      {/* Start and End Locations */}
      <div className="trip-planner-grid-2">
        <div className="trip-planner-field">
          <label className="trip-planner-label">Điểm khởi hành <span className="text-danger">*</span></label>
          <input
            type="text"
            placeholder="TP. Hà Nội"
            className="trip-planner-input"
            value={tripInfo.startLocation}
            onChange={(e) => setTripInfo({ ...tripInfo, startLocation: e.target.value })}
          />
        </div>
        <div className="trip-planner-field">
          <label className="trip-planner-label">Điểm đến chính</label>
          <input
            type="text"
            placeholder="Đà Nẵng"
            className="trip-planner-input"
            value={tripInfo.endLocation}
            onChange={(e) => setTripInfo({ ...tripInfo, endLocation: e.target.value })}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="trip-planner-grid-2">
        <div className="trip-planner-field">
          <label className="trip-planner-label">Ngày bắt đầu</label>
          <input
            type="date"
            className="trip-planner-date-input"
            value={tripInfo.startDate}
            onChange={(e) => setTripInfo({ ...tripInfo, startDate: e.target.value })}
          />
        </div>
        <div className="trip-planner-field">
          <label className="trip-planner-label">
            Ngày kết thúc <span className="trip-planner-days-tag">{computeDays()} ngày</span>
          </label>
          <input
            type="date"
            className="trip-planner-date-input"
            value={tripInfo.endDate}
            onChange={(e) => setTripInfo({ ...tripInfo, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Travelers & Transport */}
      <div className="trip-planner-grid-2">
        <div className="trip-planner-field">
          <label className="trip-planner-label">
            <Users size={14} /> Số lượng người
          </label>
          <div className="trip-planner-counter">
            <button
              type="button"
              className="trip-planner-counter-btn"
              onClick={() =>
                setTripInfo((prev) => ({
                  ...prev,
                  travelerCount: Math.max(1, prev.travelerCount - 1)
                }))
              }
            >
              -
            </button>
            <span className="trip-planner-counter-val">{tripInfo.travelerCount} người</span>
            <button
              type="button"
              className="trip-planner-counter-btn"
              onClick={() =>
                setTripInfo((prev) => ({
                  ...prev,
                  travelerCount: prev.travelerCount + 1
                }))
              }
            >
              +
            </button>
          </div>
        </div>

        <div className="trip-planner-field">
          <label className="trip-planner-label">
            <Compass size={14} /> Phương tiện
          </label>
          <select
            className="trip-planner-select"
            value={tripInfo.transportMode}
            onChange={(e) => setTripInfo({ ...tripInfo, transportMode: e.target.value })}
          >
            {TRANSPORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Travel Preferences */}
      <div className="trip-planner-field">
        <label className="trip-planner-label">Sở thích du lịch</label>
        <div className="trip-planner-prefs-grid">
          {PREFERENCE_OPTIONS.map((pref) => {
            const isChecked = tripInfo.preferences.includes(pref.value);
            return (
              <label
                key={pref.value}
                className={`trip-planner-pref-checkbox-label ${isChecked ? 'checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => togglePreference(pref.value)}
                />
                <span>{pref.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Collapsible Cost Breakdown Accordion */}
      <div className="trip-planner-cost-accordion">
        <div
          className="trip-planner-cost-header"
          onClick={() => setShowCostAccordion(!showCostAccordion)}
        >
          <div className="trip-planner-cost-header-left">
            <DollarSign size={16} color="#10b981" />
            <span>Chi tiết chi phí dự tính</span>
          </div>
          <div className="trip-planner-cost-header-summary">
            <span>{totalCalculatedCost.toLocaleString()} đ</span>
            <ChevronDown
              size={16}
              style={{
                transform: showCostAccordion ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>
        </div>

        {showCostAccordion && (
          <div className="trip-planner-cost-body">
            <div className="trip-planner-scope-selector">
              <label>
                <input
                  type="radio"
                  name="costScope"
                  value="PERSON"
                  checked={costBreakdown.scope === 'PERSON'}
                  onChange={() => setCostBreakdown({ ...costBreakdown, scope: 'PERSON' })}
                />
                Tính theo mỗi người
              </label>
              <label>
                <input
                  type="radio"
                  name="costScope"
                  value="GROUP"
                  checked={costBreakdown.scope === 'GROUP'}
                  onChange={() => setCostBreakdown({ ...costBreakdown, scope: 'GROUP' })}
                />
                Tính cho cả đoàn
              </label>
            </div>

            <div className="trip-planner-cost-item">
              <span className="trip-planner-cost-item-label">Di chuyển:</span>
              <div className="trip-planner-cost-input-wrap">
                <input
                  type="number"
                  step="50000"
                  className="trip-planner-cost-input"
                  value={costBreakdown.transport}
                  onChange={(e) =>
                    setCostBreakdown({ ...costBreakdown, transport: Number(e.target.value) || 0 })
                  }
                />
                <span className="trip-planner-currency">đ</span>
              </div>
            </div>

            <div className="trip-planner-cost-item">
              <span className="trip-planner-cost-item-label">Ăn uống:</span>
              <div className="trip-planner-cost-input-wrap">
                <input
                  type="number"
                  step="50000"
                  className="trip-planner-cost-input"
                  value={costBreakdown.meals}
                  onChange={(e) =>
                    setCostBreakdown({ ...costBreakdown, meals: Number(e.target.value) || 0 })
                  }
                />
                <span className="trip-planner-currency">đ</span>
              </div>
            </div>

            <div className="trip-planner-cost-item">
              <span className="trip-planner-cost-item-label">Vé tham quan:</span>
              <div className="trip-planner-cost-input-wrap">
                <input
                  type="number"
                  step="50000"
                  className="trip-planner-cost-input"
                  value={costBreakdown.attractions}
                  onChange={(e) =>
                    setCostBreakdown({ ...costBreakdown, attractions: Number(e.target.value) || 0 })
                  }
                />
                <span className="trip-planner-currency">đ</span>
              </div>
            </div>

            <div className="trip-planner-cost-item">
              <span className="trip-planner-cost-item-label">Lưu trú / Khách sạn:</span>
              <div className="trip-planner-cost-input-wrap">
                <input
                  type="number"
                  step="50000"
                  className="trip-planner-cost-input"
                  value={costBreakdown.accommodation}
                  onChange={(e) =>
                    setCostBreakdown({
                      ...costBreakdown,
                      accommodation: Number(e.target.value) || 0
                    })
                  }
                />
                <span className="trip-planner-currency">đ</span>
              </div>
            </div>

            <div className="trip-planner-cost-item">
              <span className="trip-planner-cost-item-label">Dự phòng phát sinh:</span>
              <div className="trip-planner-cost-input-wrap">
                <input
                  type="number"
                  step="50000"
                  className="trip-planner-cost-input"
                  value={costBreakdown.contingency}
                  onChange={(e) =>
                    setCostBreakdown({
                      ...costBreakdown,
                      contingency: Number(e.target.value) || 0
                    })
                  }
                />
                <span className="trip-planner-currency">đ</span>
              </div>
            </div>

            <div className="trip-planner-cost-calc-box">
              <div className="trip-planner-calc-row">
                <span>Mỗi người:</span>
                <span>{perPersonCostSum.toLocaleString()} đ</span>
              </div>
              {costBreakdown.scope === 'PERSON' && (
                <div className="trip-planner-calc-row">
                  <span>Số lượng khách:</span>
                  <span>x {tripInfo.travelerCount}</span>
                </div>
              )}
              <div className="trip-planner-calc-row total">
                <span>Tổng chi phí dự kiến:</span>
                <span>{totalCalculatedCost.toLocaleString()} đ</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Friends Selection */}
      <div className="trip-planner-friends-section">
        <label className="trip-planner-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} color="var(--primary)" /> Mời bạn bè cùng đi
          </span>
          {selectedFriendIds.length > 0 && (
            <span className="trip-planner-friend-count-badge">
              Đã chọn {selectedFriendIds.length} người
            </span>
          )}
        </label>

        {friendsList.length > 0 ? (
          <div className="trip-planner-friends-list">
            {friendsList.map((friend) => {
              const isSelected = selectedFriendIds.includes(String(friend.id));
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => toggleSelectFriend(String(friend.id))}
                  className={`trip-planner-friend-chip ${isSelected ? 'selected' : ''}`}
                >
                  <img
                    src={friend.avatar || '/avatars/traveler.svg'}
                    alt={friend.name}
                    className="trip-planner-friend-avatar"
                  />
                  <span className="trip-planner-friend-name">{friend.name}</span>
                  {isSelected ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} color="#94a3b8" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="trip-planner-friends-empty">
            Chưa có bạn bè trong danh sách. Bạn vẫn có thể tạo link mời sau khi lưu chuyến đi.
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="trip-planner-field">
        <label className="trip-planner-label">Ghi chú hành trình</label>
        <textarea
          placeholder="Những lưu ý quan trọng cần nhớ..."
          className="trip-planner-textarea"
          value={tripInfo.notes}
          onChange={(e) => setTripInfo({ ...tripInfo, notes: e.target.value })}
        />
      </div>
    </div>
  );

  // Render Section 2: Hourly Timeline Schedule
  const renderScheduleTimeline = () => (
    <div className="trip-planner-schedule-wrapper">
      <div className="trip-planner-schedule-header">
        <div className="trip-planner-schedule-hint">
          <span>Click bản đồ hoặc bấm nút để thêm điểm dừng</span>
        </div>
        <button
          type="button"
          className="btn btn-outline trip-planner-add-act-btn"
          onClick={handleAddCustomActivity}
        >
          <Plus size={14} /> Thêm hoạt động
        </button>
      </div>

      {scheduleItems.length === 0 ? (
        <div className="trip-planner-empty-hint">
          <Navigation size={28} style={{ opacity: 0.4, margin: '0 auto 8px auto', display: 'block' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Chưa có điểm dừng nào trong lịch trình.</p>
          <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Hãy nhấp vào bản đồ để chọn địa điểm hoặc bấm nút "+ Thêm hoạt động" bên trên.</p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={scheduleItems}
          onReorder={setScheduleItems}
          className="trip-planner-reorder-group"
        >
          {scheduleItems.map((item, idx) => (
            <Reorder.Item key={item.tripLocId} value={item} className="trip-planner-reorder-item">
              <div className="trip-planner-schedule-item">
                <div className="trip-planner-item-top">
                  <div className="trip-planner-drag-handle" title="Kéo để đổi thứ tự">
                    <GripVertical size={16} />
                  </div>
                  <div className="trip-planner-item-badge">{idx + 1}</div>
                  <input
                    type="text"
                    className="trip-planner-item-name-input"
                    value={item.customName || item.name}
                    onChange={(e) =>
                      updateScheduleItem(item.tripLocId, 'customName', e.target.value)
                    }
                    placeholder="Tên địa điểm / Hoạt động"
                  />
                  <button
                    type="button"
                    onClick={() => handleLocationRemove(item.tripLocId)}
                    className="trip-planner-item-remove"
                    title="Xóa điểm này khỏi lịch trình"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Structured Parameters Row */}
                <div className="trip-planner-params-row">
                  <div className="trip-planner-param-col">
                    <span className="trip-planner-param-label">Giờ đến:</span>
                    <input
                      type="time"
                      className="trip-planner-param-input"
                      value={item.startTime || '08:00'}
                      onChange={(e) =>
                        updateScheduleItem(item.tripLocId, 'startTime', e.target.value)
                      }
                    />
                  </div>

                  <div className="trip-planner-param-col">
                    <span className="trip-planner-param-label">Thời lượng:</span>
                    <div className="trip-planner-param-input-wrap">
                      <input
                        type="number"
                        min="10"
                        step="10"
                        className="trip-planner-param-input"
                        value={item.durationMinutes || 60}
                        onChange={(e) =>
                          updateScheduleItem(
                            item.tripLocId,
                            'durationMinutes',
                            Number(e.target.value) || 0
                          )
                        }
                      />
                      <span className="trip-planner-param-suffix">phút</span>
                    </div>
                  </div>

                  <div className="trip-planner-param-col">
                    <span className="trip-planner-param-label">Di chuyển tiếp:</span>
                    <div className="trip-planner-param-input-wrap">
                      <input
                        type="number"
                        min="0"
                        step="5"
                        className="trip-planner-param-input"
                        value={item.travelMinutes ?? 15}
                        onChange={(e) =>
                          updateScheduleItem(
                            item.tripLocId,
                            'travelMinutes',
                            Number(e.target.value) || 0
                          )
                        }
                      />
                      <span className="trip-planner-param-suffix">phút</span>
                    </div>
                  </div>
                </div>

                {/* Note for Item */}
                <input
                  type="text"
                  placeholder="Ghi chú (vé tham quan, ăn uống, trang phục...)"
                  className="trip-planner-item-note-input"
                  value={item.note || ''}
                  onChange={(e) =>
                    updateScheduleItem(item.tripLocId, 'note', e.target.value)
                  }
                />
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      <button
        type="button"
        className="trip-planner-add-custom-btn"
        onClick={handleAddCustomActivity}
      >
        <Plus size={16} /> Thêm hoạt động / Điểm dừng tự do
      </button>
    </div>
  );

  // Render Section 3: Packing Checklist
  const renderPackingList = () => (
    <div className="trip-planner-packing-wrapper">
      {/* Category Pills Filter */}
      <div className="trip-planner-packing-filter">
        {PACKING_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={`trip-planner-cat-pill ${
              packingCategoryFilter === cat.key ? 'active' : ''
            }`}
            onClick={() => setPackingCategoryFilter(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Quick toggle all */}
      <div className="trip-planner-packing-actions">
        <button
          type="button"
          onClick={() => {
            setPackingList((prev) =>
              prev.map((p) => {
                if (packingCategoryFilter === 'all' || p.category === packingCategoryFilter) {
                  return { ...p, selected: true };
                }
                return p;
              })
            );
          }}
          className="btn btn-outline trip-planner-btn-mini"
        >
          Chọn tất cả
        </button>
        <button
          type="button"
          onClick={() => {
            setPackingList((prev) =>
              prev.map((p) => {
                if (packingCategoryFilter === 'all' || p.category === packingCategoryFilter) {
                  return { ...p, selected: false };
                }
                return p;
              })
            );
          }}
          className="btn btn-outline trip-planner-btn-mini"
        >
          Bỏ chọn
        </button>
      </div>

      {/* Add Custom Packing Item Bar */}
      <div className="trip-planner-packing-add-bar">
        <input
          type="text"
          placeholder="Thêm món đồ cần chuẩn bị riêng..."
          className="trip-planner-packing-add-input"
          value={newPackingName}
          onChange={(e) => setNewPackingName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPackingItem()}
        />
        <button
          type="button"
          className="btn btn-primary trip-planner-packing-add-btn"
          onClick={handleAddCustomPackingItem}
        >
          <Plus size={15} /> Thêm
        </button>
      </div>

      {/* Checklist Items */}
      <div className="trip-planner-packing-list">
        {filteredPackingItems.length === 0 ? (
          <div className="trip-planner-empty-hint">Không có món đồ nào trong nhóm này.</div>
        ) : (
          filteredPackingItems.map((item) => (
            <div key={item.id} className="trip-planner-packing-row">
              <input
                type="checkbox"
                className="trip-planner-pack-check"
                checked={Boolean(item.selected)}
                onChange={() => togglePackingItemSelect(item.id)}
              />
              <span
                className={`trip-planner-pack-name ${item.selected ? '' : 'unchecked'}`}
                onClick={() => togglePackingItemSelect(item.id)}
                title={item.itemName}
              >
                {item.itemName}
              </span>
              <input
                type="number"
                min="1"
                className="trip-planner-pack-qty"
                title="Số lượng"
                value={item.quantity}
                onChange={(e) =>
                  updatePackingField(item.id, 'quantity', Number(e.target.value) || 1)
                }
              />
              <input
                type="text"
                placeholder="Ghi chú"
                className="trip-planner-pack-notes"
                value={item.notes || ''}
                onChange={(e) => updatePackingField(item.id, 'notes', e.target.value)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Layout className="layout-main-planner">
      <div className="trip-planner-root">
        {toast && (
          <div className="trip-planner-toast">
            {toast}
          </div>
        )}

        {/* TOP TOOLBAR HEADER */}
        <header className="trip-planner-topbar">
          <div className="trip-planner-topbar-left">
            <Link to="/" className="trip-planner-back-btn" title="Quay lại Dashboard">
              <ArrowLeft size={16} />
            </Link>
            <div className="trip-planner-heading-group">
              <span className="trip-planner-tag">Kế hoạch thủ công</span>
              <input
                type="text"
                className="trip-planner-topbar-title-input"
                placeholder="Đặt tên chuyến đi của bạn..."
                value={tripInfo.title}
                onChange={(e) => setTripInfo({ ...tripInfo, title: e.target.value })}
              />
            </div>
          </div>

          <div className="trip-planner-topbar-center">
            <div className="trip-planner-stat-pill" title="Tổng thời gian chuyến đi">
              <Calendar size={13} />
              <span>{computeDays()} ngày</span>
            </div>
            <div className="trip-planner-stat-pill" title="Số điểm dừng trên bản đồ">
              <MapPin size={13} />
              <span>{scheduleItems.length} điểm dừng</span>
            </div>
            <div className="trip-planner-stat-pill" title="Tổng chi phí dự kiến">
              <DollarSign size={13} />
              <span>{totalCalculatedCost.toLocaleString()} đ</span>
            </div>
          </div>

          <div className="trip-planner-topbar-right">
            <button
              type="button"
              className="btn btn-outline trip-planner-mode-btn"
              onClick={() => setLayoutMode((prev) => (prev === 'split' ? 'columns' : 'split'))}
              title={layoutMode === 'split' ? 'Chuyển sang chế độ 3 cột (màn hình rộng)' : 'Chuyển sang chế độ tập trung bản đồ'}
            >
              {layoutMode === 'split' ? <Columns3 size={15} /> : <Maximize2 size={15} />}
              <span className="trip-planner-btn-label">
                {layoutMode === 'split' ? 'Chế độ 3 cột' : 'Tập trung bản đồ'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSaveTrip}
              disabled={saving}
              className="btn btn-primary trip-planner-save-btn"
            >
              <Save size={16} />
              <span>{saving ? 'Đang lưu...' : 'Lưu kế hoạch'}</span>
            </button>
          </div>
        </header>

        {/* MAIN WORKSPACE BODY */}
        {layoutMode === 'split' ? (
          /* SPLIT MODE: Left Side Panel with 3 Tabs + Large Right Map (Never squeezed!) */
          <div className="trip-planner-split-container">
            {/* LEFT TABBED PANEL */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              className="card trip-planner-unified-side-panel"
            >
              {/* Tab Navigation */}
              <div className="trip-planner-tabs">
                <button
                  type="button"
                  className={`trip-planner-tab-btn ${activeSideTab === 'schedule' ? 'active' : ''}`}
                  onClick={() => setActiveSideTab('schedule')}
                >
                  <Clock size={15} />
                  <span>Lịch trình ({scheduleItems.length})</span>
                </button>
                <button
                  type="button"
                  className={`trip-planner-tab-btn ${activeSideTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveSideTab('info')}
                >
                  <Info size={15} />
                  <span>Thông tin & Chi phí</span>
                </button>
                <button
                  type="button"
                  className={`trip-planner-tab-btn ${activeSideTab === 'packing' ? 'active' : ''}`}
                  onClick={() => setActiveSideTab('packing')}
                >
                  <Briefcase size={15} />
                  <span>Đồ cần mang ({packingList.filter((p) => p.selected).length})</span>
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="trip-planner-panel-content">
                {activeSideTab === 'schedule' && renderScheduleTimeline()}
                {activeSideTab === 'info' && renderTripInfoForm()}
                {activeSideTab === 'packing' && renderPackingList()}
              </div>
            </motion.div>

            {/* EXPANSIVE INTERACTIVE MAP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="trip-planner-map-container"
            >
              <MapComponent
                selectedLocations={scheduleItems.filter((i) => i.latitude && i.longitude)}
                onLocationAdd={handleLocationAdd}
                onLocationRemove={(id) => handleLocationRemove(id)}
              />
              <div className="trip-planner-map-badge">
                <Navigation size={13} color="var(--primary)" />
                <span>Bấm vào vị trí bất kỳ trên bản đồ để thêm điểm dừng vào lịch trình</span>
              </div>
            </motion.div>
          </div>
        ) : (
          /* 3-COLUMN MODE: Left Form + Center Map + Right Schedule/Packing (For large screens) */
          <div className="trip-planner-columns-container">
            {/* Column 1: Info Form */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              className="card trip-planner-col-form"
            >
              <div className="trip-planner-col-title">
                <Info size={16} color="var(--primary)" />
                <span>Chi tiết chuyến đi</span>
              </div>
              <div className="trip-planner-panel-content">
                {renderTripInfoForm()}
              </div>
            </motion.div>

            {/* Column 2: Center Map */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="trip-planner-map-container"
            >
              <MapComponent
                selectedLocations={scheduleItems.filter((i) => i.latitude && i.longitude)}
                onLocationAdd={handleLocationAdd}
                onLocationRemove={(id) => handleLocationRemove(id)}
              />
              <div className="trip-planner-map-badge">
                <Navigation size={13} color="var(--primary)" />
                <span>Bấm vào bản đồ để thêm điểm dừng</span>
              </div>
            </motion.div>

            {/* Column 3: Schedule / Packing Tabs */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="card trip-planner-col-side"
            >
              <div className="trip-planner-tabs">
                <button
                  type="button"
                  className={`trip-planner-tab-btn ${activeSideTab === 'schedule' ? 'active' : ''}`}
                  onClick={() => setActiveSideTab('schedule')}
                >
                  <Clock size={15} />
                  <span>Lịch trình ({scheduleItems.length})</span>
                </button>
                <button
                  type="button"
                  className={`trip-planner-tab-btn ${activeSideTab === 'packing' ? 'active' : ''}`}
                  onClick={() => setActiveSideTab('packing')}
                >
                  <Briefcase size={15} />
                  <span>Đồ cần mang ({packingList.filter((p) => p.selected).length})</span>
                </button>
              </div>
              <div className="trip-planner-panel-content">
                {activeSideTab === 'packing' ? renderPackingList() : renderScheduleTimeline()}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TripPlanner;
