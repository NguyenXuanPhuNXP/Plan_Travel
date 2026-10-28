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
  Car,
  Plane,
  Train,
  CheckSquare,
  Square
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

  // 3. Right Panel Active Tab: 'schedule' or 'packing'
  const [activeSideTab, setActiveSideTab] = useState('schedule');

  // 4. Hourly Timeline Activities
  const [scheduleItems, setScheduleItems] = useState([]);

  // 5. Packing Checklist
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

  return (
    <Layout>
      <div className="trip-planner-container">
        {toast && (
          <div className="card" style={{ position: 'fixed', right: 20, top: 80, zIndex: 3000, padding: '0.75rem 1.25rem', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, borderRadius: 8 }}>
            {toast}
          </div>
        )}

        {/* LEFT COLUMN: Trip Information & Cost Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card trip-planner-form-card"
        >
          <div className="trip-planner-breadcrumb">
            <Link to="/" className="trip-planner-breadcrumb-link">
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <ChevronRight size={14} />
            <span>Lập kế hoạch thủ công</span>
          </div>

          <h2 className="trip-planner-title">Chi tiết chuyến đi</h2>

          <div className="trip-planner-form">
            {/* Trip Title */}
            <div>
              <label className="trip-planner-label">Tên chuyến đi *</label>
              <input
                type="text"
                placeholder="Ví dụ: Du lịch Đà Nẵng - Hội An 4 ngày 3 đêm"
                className="trip-planner-input"
                value={tripInfo.title}
                onChange={(e) => setTripInfo({ ...tripInfo, title: e.target.value })}
              />
            </div>

            {/* Start and End Locations */}
            <div className="trip-planner-date-grid">
              <div>
                <label className="trip-planner-label">Điểm khởi hành *</label>
                <input
                  type="text"
                  placeholder="TP. Hà Nội"
                  className="trip-planner-input"
                  value={tripInfo.startLocation}
                  onChange={(e) => setTripInfo({ ...tripInfo, startLocation: e.target.value })}
                />
              </div>
              <div>
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
            <div className="trip-planner-date-grid">
              <div>
                <label className="trip-planner-label">Ngày bắt đầu</label>
                <input
                  type="date"
                  className="trip-planner-date-input"
                  value={tripInfo.startDate}
                  onChange={(e) => setTripInfo({ ...tripInfo, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="trip-planner-label">Ngày kết thúc ({computeDays()} ngày)</label>
                <input
                  type="date"
                  className="trip-planner-date-input"
                  value={tripInfo.endDate}
                  onChange={(e) => setTripInfo({ ...tripInfo, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Travelers & Transport */}
            <div className="trip-planner-row-2col">
              <div>
                <label className="trip-planner-label">
                  <Users size={14} /> Số lượng người đi
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

              <div>
                <label className="trip-planner-label">
                  <Compass size={14} /> Phương tiện di chuyển
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

            {/* Travel Preferences Multi-Select */}
            <div>
              <label className="trip-planner-label">Sở thích du lịch (chọn nhiều)</label>
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
                    <input
                      type="number"
                      step="50000"
                      className="trip-planner-cost-input"
                      value={costBreakdown.transport}
                      onChange={(e) =>
                        setCostBreakdown({ ...costBreakdown, transport: Number(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="trip-planner-cost-item">
                    <span className="trip-planner-cost-item-label">Ăn uống:</span>
                    <input
                      type="number"
                      step="50000"
                      className="trip-planner-cost-input"
                      value={costBreakdown.meals}
                      onChange={(e) =>
                        setCostBreakdown({ ...costBreakdown, meals: Number(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="trip-planner-cost-item">
                    <span className="trip-planner-cost-item-label">Vé tham quan:</span>
                    <input
                      type="number"
                      step="50000"
                      className="trip-planner-cost-input"
                      value={costBreakdown.attractions}
                      onChange={(e) =>
                        setCostBreakdown({ ...costBreakdown, attractions: Number(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="trip-planner-cost-item">
                    <span className="trip-planner-cost-item-label">Lưu trú / Khách sạn:</span>
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
                  </div>

                  <div className="trip-planner-cost-item">
                    <span className="trip-planner-cost-item-label">Dự phòng phát sinh:</span>
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


            {/* Friends / Collaborators Selection */}
            <div className="trip-planner-friends-section">
              <label className="trip-planner-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={16} color="var(--primary)" /> Mời bạn bè cùng lập kế hoạch
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
              <p className="trip-planner-friends-hint">
                💡 Khi lưu, bạn bè được chọn sẽ tự động được thêm vào nhóm cùng lập kế hoạch và tham gia nhóm chat chung của chuyến đi.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="trip-planner-label">Ghi chú hành trình</label>
              <textarea
                placeholder="Những lưu ý quan trọng cần nhớ..."
                className="trip-planner-textarea"
                value={tripInfo.notes}
                onChange={(e) => setTripInfo({ ...tripInfo, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="trip-planner-form-footer">
            <button
              onClick={handleSaveTrip}
              disabled={saving}
              className="btn btn-primary trip-planner-save-btn"
            >
              <Save size={18} /> {saving ? 'Đang lưu vào CSDL...' : 'Lưu kế hoạch chuyến đi'}
            </button>
          </div>
        </motion.div>

        {/* CENTER COLUMN: Interactive Map */}
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
        </motion.div>

        {/* RIGHT COLUMN: Hourly Timeline & Packing Checklist Tabs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card trip-planner-side-card"
        >
          {/* Top Tabs */}
          <div className="trip-planner-tabs">
            <button
              className={`trip-planner-tab-btn ${activeSideTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveSideTab('schedule')}
            >
              <Clock size={15} /> Lịch trình theo giờ ({scheduleItems.length})
            </button>
            <button
              className={`trip-planner-tab-btn ${activeSideTab === 'packing' ? 'active' : ''}`}
              onClick={() => setActiveSideTab('packing')}
            >
              <Briefcase size={15} /> Đồ cần mang ({packingList.filter((p) => p.selected).length})
            </button>
          </div>

          {/* TAB 1: HOURLY TIMELINE */}
          {activeSideTab === 'schedule' && (
            <div>
              <div className="trip-planner-schedule-header">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Click vào bản đồ hoặc bấm nút để thêm mốc hoạt động
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.775rem' }}
                  onClick={handleAddCustomActivity}
                >
                  <Plus size={14} /> Thêm hoạt động
                </button>
              </div>

              {scheduleItems.length === 0 ? (
                <div className="trip-planner-empty-hint">
                  <p>Chưa có điểm dừng nào trong lịch trình.</p>
                  <p>Hãy click vào bản đồ để chọn địa điểm hoặc bấm "+ Thêm hoạt động" để tự tạo.</p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={scheduleItems}
                  onReorder={setScheduleItems}
                  style={{ listStyle: 'none', padding: 0, marginTop: '0.75rem' }}
                >
                  {scheduleItems.map((item, idx) => (
                    <Reorder.Item key={item.tripLocId} value={item}>
                      <div className="trip-planner-schedule-item">
                        <div className="trip-planner-item-top">
                          <GripVertical size={16} color="var(--text-muted)" style={{ cursor: 'grab' }} />
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
                            title="Xóa điểm này"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        {/* Hourly Time Inputs */}
                        <div className="trip-planner-time-row">
                          <div className="trip-planner-time-col">
                            <label>Bắt đầu:</label>
                            <input
                              type="time"
                              className="trip-planner-time-input"
                              value={item.startTime || '08:00'}
                              onChange={(e) =>
                                updateScheduleItem(item.tripLocId, 'startTime', e.target.value)
                              }
                            />
                          </div>

                          <div className="trip-planner-time-col">
                            <label>Thời lượng (phút):</label>
                            <input
                              type="number"
                              min="10"
                              step="10"
                              className="trip-planner-time-input"
                              value={item.durationMinutes || 60}
                              onChange={(e) =>
                                updateScheduleItem(
                                  item.tripLocId,
                                  'durationMinutes',
                                  Number(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          <div className="trip-planner-time-col">
                            <label>Di chuyển tiếp (phút):</label>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              className="trip-planner-time-input"
                              value={item.travelMinutes ?? 15}
                              onChange={(e) =>
                                updateScheduleItem(
                                  item.tripLocId,
                                  'travelMinutes',
                                  Number(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* Note for Item */}
                        <input
                          type="text"
                          placeholder="Ghi chú (vé, lưu ý ăn uống, trang phục...)"
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
                style={{ marginTop: '0.5rem' }}
              >
                <Plus size={16} /> Thêm hoạt động / Điểm dừng tự do
              </button>
            </div>
          )}

          {/* TAB 2: PACKING CHECKLIST */}
          {activeSideTab === 'packing' && (
            <div>
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
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPackingList(prev => prev.map(p => {
                      if (packingCategoryFilter === 'all' || p.category === packingCategoryFilter) {
                        return { ...p, selected: true };
                      }
                      return p;
                    }));
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPackingList(prev => prev.map(p => {
                      if (packingCategoryFilter === 'all' || p.category === packingCategoryFilter) {
                        return { ...p, selected: false };
                      }
                      return p;
                    }));
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
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
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={handleAddCustomPackingItem}
                >
                  <Plus size={15} /> Thêm
                </button>
              </div>

              {/* Checklist Items */}
              <div className="trip-planner-packing-list" style={{ marginTop: '0.65rem' }}>
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
                        className={`trip-planner-pack-name ${item.selected ? '' : 'checked'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => togglePackingItemSelect(item.id)}
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
          )}
        </motion.div>
      </div>
    </Layout>
  );
};

export default TripPlanner;
