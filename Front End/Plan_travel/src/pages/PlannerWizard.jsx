import React, { useEffect, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, DollarSign, Sparkles, ChevronRight, 
  ChevronLeft, Loader2, Save, Wand2, Tag, Users, Car,
  ChevronDown, ChevronUp, Briefcase, CheckSquare, Square,
  Check, Plus, Minus
} from 'lucide-react';
import { locationService } from '../services/locationService';
import { itineraryService } from '../services/itineraryService';
import { friendService } from '../services/friendService';
import { useTrips } from '../context/TripContext';
import DestinationPicker from './DestinationPicker';
import TimelineEditor from './TimelineEditor';
import './PlannerWizard.css';

const PREFERENCE_OPTIONS = [
  { value: 'beach', label: 'Biển' },
  { value: 'mountain', label: 'Núi' },
  { value: 'food', label: 'Ẩm thực' },
  { value: 'culture', label: 'Văn hóa' },
  { value: 'nature', label: 'Thiên nhiên' },
  { value: 'shopping', label: 'Mua sắm' },
  { value: 'nightlife', label: 'Về đêm' },
  { value: 'adventure', label: 'Mạo hiểm' },
  { value: 'relax', label: 'Nghỉ dưỡng' },
  { value: 'photography', label: 'Chụp ảnh' },
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

const PlannerWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addTrip, fetchTrips } = useTrips();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Step 1: Trip info - pre-fill destination from URL if available
  const initialDestination = searchParams.get('destination') || '';
  const initialBudget = searchParams.get('budget') || '';
  const initialTotalDays = Number(searchParams.get('totalDays') || 3);
  const initialPrefs = (searchParams.get('preferences') || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const initialRegion = searchParams.get('region') || '';
  const initialLocationId = searchParams.get('locationId') || '';
  
  const [tripInfo, setTripInfo] = useState({
    destination: initialRegion || initialDestination,
    name: (initialRegion || initialDestination) ? `Du lịch ${initialRegion || initialDestination}` : '',
    startDate: '',
    endDate: '',
    totalDays: Number.isFinite(initialTotalDays) && initialTotalDays > 0 ? initialTotalDays : 3,
    budget: initialBudget,
    preferences: initialPrefs,
    travelerCount: 2,
    transportMode: 'flight'
  });

  // Cost breakdown
  const [showCostAccordion, setShowCostAccordion] = useState(false);
  const [costBreakdown, setCostBreakdown] = useState({
    scope: 'PERSON', // 'PERSON' or 'GROUP'
    transport: 500000,
    meals: 400000,
    attractions: 250000,
    accommodation: 600000,
    contingency: 150000
  });

  // Packing list
  const [showPackingAccordion, setShowPackingAccordion] = useState(false);
  const [packingList, setPackingList] = useState([]);
  const [packingCategoryFilter, setPackingCategoryFilter] = useState('all');
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

  useEffect(() => {
    async function loadCatalog() {
      try {
        const catalog = await itineraryService.getPackingCatalog();
        if (catalog && catalog.length > 0) {
          setPackingList(
            catalog.map((item, idx) => ({
              id: item.id || `pack_${idx}`,
              itemName: item.name,
              category: item.category || 'clothing',
              quantity: item.defaultQuantity || 1,
              notes: item.notes || '',
              selected: idx < 10
            }))
          );
        }
      } catch (err) {
        console.warn('Failed to load packing catalog in wizard:', err);
      }
    }
    loadCatalog();
  }, []);

  // Step 2: Suggestions + selection
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);

  // Step 3: Timeline plan
  const [autoPlan, setAutoPlan] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [showEditTripInfo, setShowEditTripInfo] = useState(false);

  // Computed days from dates
  const computeDays = () => {
    if (tripInfo.startDate && tripInfo.endDate) {
      const diff = Math.ceil(
        (new Date(tripInfo.endDate) - new Date(tripInfo.startDate)) / (1000 * 60 * 60 * 24)
      ) + 1;
      return diff > 0 ? diff : tripInfo.totalDays;
    }
    return tripInfo.totalDays;
  };

  const perPersonCostSum =
    Number(costBreakdown.transport || 0) +
    Number(costBreakdown.meals || 0) +
    Number(costBreakdown.attractions || 0) +
    Number(costBreakdown.accommodation || 0) +
    Number(costBreakdown.contingency || 0);

  const totalCalculatedCost =
    costBreakdown.scope === 'GROUP'
      ? perPersonCostSum
      : perPersonCostSum * (Number(tripInfo.travelerCount) || 1);

  const buildFallbackPlan = (locs) => {
    const days = Array.from({ length: computeDays() }, (_, i) => ({
      dayNumber: i + 1,
      title: `Ngày ${i + 1}`,
      items: []
    }));
    locs.forEach((loc, idx) => {
      const dayIdx = idx % days.length;
      const slot = days[dayIdx].items.length;
      days[dayIdx].items.push({
        locationName: loc.name,
        locationId: loc.id,
        location: loc,
        startTime: `${String(8 + slot * 2).padStart(2, '0')}:00`,
        endTime: `${String(9 + slot * 2).padStart(2, '0')}:00`,
        note: '',
        travelMinutesToNext: 20
      });
    });
    return {
      planName: tripInfo.name || `Kế hoạch ${tripInfo.destination}`,
      description: `AI đã chuẩn bị lịch trình ban đầu cho ${tripInfo.destination}. Bạn có thể chỉnh sửa lại theo nhu cầu cá nhân.`,
      days
    };
  };

  const togglePreference = (pref) => {
    setTripInfo(prev => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter(p => p !== pref)
        : [...prev.preferences, pref]
    }));
  };

  const [newPackingName, setNewPackingName] = useState('');

  const togglePackingItem = (id) => {
    setPackingList(prev => prev.map(p => String(p.id) === String(id) ? { ...p, selected: !p.selected } : p));
  };

  const selectAllPackingInFilter = (select) => {
    setPackingList(prev => prev.map(p => {
      if (packingCategoryFilter === 'all' || p.category === packingCategoryFilter) {
        return { ...p, selected: select };
      }
      return p;
    }));
  };

  const handleAddCustomPacking = () => {
    if (!newPackingName.trim()) return;
    const newItem = {
      id: `pack_custom_${Date.now()}`,
      itemName: newPackingName.trim(),
      category: packingCategoryFilter === 'all' ? 'tools' : packingCategoryFilter,
      quantity: 1,
      notes: '',
      selected: true
    };
    setPackingList(prev => [newItem, ...prev]);
    setNewPackingName('');
  };

  const updatePackingQty = (id, delta) => {
    setPackingList(prev => prev.map(p => {
      if (String(p.id) === String(id)) {
        const nextQty = Math.max(1, (Number(p.quantity) || 1) + delta);
        return { ...p, quantity: nextQty };
      }
      return p;
    }));
  };

  useEffect(() => {
    if (tripInfo.startDate && tripInfo.endDate) {
      const nextDays = computeDays();
      if (nextDays !== tripInfo.totalDays) {
        setTripInfo((prev) => ({ ...prev, totalDays: nextDays }));
      }
    }
  }, [tripInfo.startDate, tripInfo.endDate]);

  // Handle pre-selected location from Explore page
  useEffect(() => {
    const fetchPreselectedLocation = async () => {
      if (initialLocationId && selectedLocations.length === 0) {
        try {
          const loc = await locationService.getLocationById(initialLocationId);
          if (loc) {
            setSelectedLocations([loc]);
            if (!tripInfo.destination) {
              setTripInfo(prev => ({
                ...prev,
                destination: loc.region || loc.city || loc.name,
                name: `Chuyến đi ${loc.name}`
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch preselected location:", err);
        }
      }
    };
    fetchPreselectedLocation();
  }, [initialLocationId]);

  // Step 1: AI generates an initial editable plan
  const handleNextToStep2 = async () => {
    if (!tripInfo.destination.trim()) {
      setToast('Vui lòng nhập địa điểm bạn muốn đi!');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    setLoading(true);
    try {
      const effectiveBudget = totalCalculatedCost > 0 ? totalCalculatedCost : (tripInfo.budget ? Number(tripInfo.budget) : null);
      const data = await locationService.getSuggestions(
        tripInfo.destination,
        computeDays(),
        effectiveBudget,
        tripInfo.preferences
      );
      let nextSuggestions = data.suggestions || [];
      if (nextSuggestions.length === 0) {
        const fallback = await locationService.searchLocations(tripInfo.destination);
        nextSuggestions = fallback.locations || fallback || [];
      }
      if (nextSuggestions.length === 0) {
        setToast('Chưa tìm thấy địa điểm phù hợp. Thử địa điểm cụ thể hơn nhé.');
        setTimeout(() => setToast(''), 3000);
        return;
      }
      const preselected = nextSuggestions.slice(0, Math.max(3, Math.min(8, computeDays() * 2)));
      setSuggestions(nextSuggestions);
      setSelectedLocations(preselected);

      try {
        const plan = await locationService.getAutoPlan({
          region: tripInfo.destination,
          days: computeDays(),
          budget: effectiveBudget,
          preferences: tripInfo.preferences,
          selectedLocationIds: preselected.map((l) => l.id).filter(Boolean),
          focusLocationId: initialLocationId
        });
        setAutoPlan(plan);
        setCurrentPlan(plan);
      } catch (planError) {
        const fallbackPlan = buildFallbackPlan(preselected);
        setAutoPlan(fallbackPlan);
        setCurrentPlan(fallbackPlan);
      }
      setStep(3);
    } catch (error) {
      console.error('Fetch suggestions error:', error);
      setToast('AI chưa tạo được kế hoạch lúc này. Vui lòng thử lại.');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → 3: Generate auto plan
  const handleNextToStep3 = async () => {
    setLoading(true);
    try {
      const effectiveBudget = totalCalculatedCost > 0 ? totalCalculatedCost : (tripInfo.budget ? Number(tripInfo.budget) : null);
      const plan = await locationService.getAutoPlan({
        region: tripInfo.destination,
        days: computeDays(),
        budget: effectiveBudget,
        preferences: tripInfo.preferences,
        selectedLocationIds: selectedLocations.map(l => l.id),
        focusLocationId: initialLocationId
      });
      setAutoPlan(plan);
      setCurrentPlan(plan);
      setStep(3);
    } catch (error) {
      console.error('Auto plan error:', error);
      setCurrentPlan(null);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveBudget = () => {
    if (totalCalculatedCost > 0) return totalCalculatedCost;
    if (tripInfo.budget) return Number(tripInfo.budget);
    return null;
  };

  const saveManualPlan = async () => {
    const selectedPacking = packingList
      .filter((item) => item.selected)
      .map((item) => ({
        itemName: item.itemName,
        category: item.category,
        quantity: Number(item.quantity) || 1,
        notes: item.notes || ''
      }));

    const itinerary = await itineraryService.create({
      name: tripInfo.name || `Du lịch ${tripInfo.destination}`,
      destination: tripInfo.destination,
      startDate: tripInfo.startDate || null,
      endDate: tripInfo.endDate || null,
      totalDays: computeDays(),
      budget: getEffectiveBudget(),
      travelerCount: Number(tripInfo.travelerCount) || 1,
      transportMode: tripInfo.transportMode || 'flight',
      costScope: costBreakdown.scope,
      costTransport: Number(costBreakdown.transport || 0),
      costMeals: Number(costBreakdown.meals || 0),
      costAttractions: Number(costBreakdown.attractions || 0),
      costAccommodation: Number(costBreakdown.accommodation || 0),
      costContingency: Number(costBreakdown.contingency || 0),
      totalCost: getEffectiveBudget(),
      preferences: tripInfo.preferences,
      packingItems: selectedPacking,
      collaboratorIds: selectedFriendIds,
      description: null,
      items: selectedLocations
        .filter((loc) => loc?.id)
        .map((loc) => ({ locationId: loc.id }))
    });

    return itinerary;
  };

  const saveAIPlan = async (finalPlan) => {
    const allItems = finalPlan?.days?.flatMap((day, dayIndex) =>
      (day?.items || []).map((item) => ({
        locationId: item?.locationId || item?.location?.id || null,
        startTime: item?.startTime ? `2025-01-01T${item.startTime}:00` : null,
        endTime: item?.endTime ? `2025-01-01T${item.endTime}:00` : null,
        note: `[DAY:${Number(day?.dayNumber || dayIndex + 1)}] ${item?.note || ''}`.trim(),
        travelMinutes: item?.travelMinutesToNext ?? null
      }))
    ) || [];

    const selectedPacking = packingList
      .filter((item) => item.selected)
      .map((item) => ({
        itemName: item.itemName,
        category: item.category,
        quantity: Number(item.quantity) || 1,
        notes: item.notes || ''
      }));

    const itinerary = await itineraryService.create({
      name: tripInfo.name || finalPlan?.planName || `Du lịch ${tripInfo.destination}`,
      destination: tripInfo.destination,
      startDate: tripInfo.startDate || null,
      endDate: tripInfo.endDate || null,
      totalDays: computeDays(),
      budget: getEffectiveBudget(),
      travelerCount: Number(tripInfo.travelerCount) || 1,
      transportMode: tripInfo.transportMode || 'flight',
      costScope: costBreakdown.scope,
      costTransport: Number(costBreakdown.transport || 0),
      costMeals: Number(costBreakdown.meals || 0),
      costAttractions: Number(costBreakdown.attractions || 0),
      costAccommodation: Number(costBreakdown.accommodation || 0),
      costContingency: Number(costBreakdown.contingency || 0),
      totalCost: getEffectiveBudget(),
      preferences: tripInfo.preferences,
      packingItems: selectedPacking,
      collaboratorIds: selectedFriendIds,
      description: finalPlan?.description || null,
      items: allItems.filter((item) => item.locationId)
    });

    return itinerary;
  };

  // Save itinerary
  const handleSave = async (finalPlan) => {
    setSaving(true);
    try {
      const hasAIPlan = Boolean(finalPlan?.days?.length);
      const itinerary = hasAIPlan ? await saveAIPlan(finalPlan) : await saveManualPlan();
      if (itinerary) {
        addTrip(itinerary);
      }
      await fetchTrips();
      navigate('/history');
    } catch (error) {
      console.error('Save error:', error);
      setToast('Có lỗi khi lưu. Vui lòng thử lại.');
      setTimeout(() => setToast(''), 2500);
    } finally {
      setSaving(false);
    }
  };

  const filteredPackingItems = packingList.filter(
    item => packingCategoryFilter === 'all' || item.category === packingCategoryFilter
  );

  return (
    <Layout>
      <div className="wizard-container">
        {toast && (
          <div className="card" style={{ position: 'fixed', right: 20, top: 90, zIndex: 3000, padding: '0.75rem 1rem' }}>
            {toast}
          </div>
        )}
        {/* Progress Steps */}
        <div className="wizard-progress">
          {[
            { num: 1, label: 'Thông tin', icon: MapPin },
            { num: 2, label: 'Chọn địa điểm', icon: Sparkles },
            { num: 3, label: 'Lịch trình', icon: Calendar }
          ].map(({ num, label, icon: Icon }) => (
            <div key={num} className={`wizard-step-indicator ${step >= num ? 'active' : ''} ${step === num ? 'current' : ''}`}>
              <div className="wizard-step-circle">
                {step > num ? '✓' : <Icon size={18} />}
              </div>
              <span className="wizard-step-label">{label}</span>
              {num < 3 && <ChevronRight size={16} className="wizard-step-arrow" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="wizard-step-content"
            >
              {/* Quick Switch Banner to Manual Planner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                borderRadius: '12px',
                border: '1px solid #c7d2fe',
                marginBottom: '1.25rem',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <MapPin size={24} color="#4338ca" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '1rem' }}>
                      Bạn muốn tự do thiết kế lịch trình trên bản đồ?
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4338ca' }}>
                      Chọn điểm dừng trực quan, phân chia chi phí từng người và chỉnh sửa thời gian cụ thể.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/planner/map')}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  <MapPin size={16} /> Lập kế hoạch thủ công →
                </button>
              </div>

              <div className="card wizard-form-card">
                <div className="wizard-form-header">
                  <div className="wizard-form-icon-wrap">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h2 className="wizard-form-title">Thông tin kế hoạch chuyến đi</h2>
                    <p className="wizard-form-subtitle">Điền thông tin cơ bản hoặc để AI hỗ trợ gợi ý lịch trình thông minh.</p>
                  </div>
                </div>

                <div className="wizard-form-body">
                  {/* Destination - Required */}
                  <div className="wizard-field wizard-field-highlight">
                    <label className="wizard-label">
                      <MapPin size={16} /> Địa điểm đến <span className="wizard-required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Vũng Tàu, Đà Nẵng, Phú Quốc, Sapa..."
                      className="wizard-input wizard-input-lg"
                      value={tripInfo.destination}
                      onChange={(e) => setTripInfo({ ...tripInfo, destination: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Trip Name */}
                  <div className="wizard-field">
                    <label className="wizard-label">
                      <Tag size={16} /> Tên chuyến đi
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Du lịch biển cuối tuần cùng bạn bè"
                      className="wizard-input"
                      value={tripInfo.name}
                      onChange={(e) => setTripInfo({ ...tripInfo, name: e.target.value })}
                    />
                  </div>

                  {/* Dates */}
                  <div className="wizard-field-row">
                    <div className="wizard-field">
                      <label className="wizard-label">
                        <Calendar size={16} /> Ngày đi
                      </label>
                      <input
                        type="date"
                        className="wizard-input"
                        value={tripInfo.startDate}
                        onChange={(e) => setTripInfo({ ...tripInfo, startDate: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label className="wizard-label">
                        <Calendar size={16} /> Ngày về
                      </label>
                      <input
                        type="date"
                        className="wizard-input"
                        value={tripInfo.endDate}
                        onChange={(e) => setTripInfo({ ...tripInfo, endDate: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field wizard-field-small">
                      <label className="wizard-label">Số ngày</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="wizard-input"
                        value={tripInfo.totalDays}
                        onChange={(e) => setTripInfo({ ...tripInfo, totalDays: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Travelers & Transport */}
                  <div className="wizard-field-row">
                    <div className="wizard-field">
                      <label className="wizard-label">
                        <Users size={16} /> Số lượng người đi
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 0.75rem' }}
                          onClick={() => setTripInfo(p => ({ ...p, travelerCount: Math.max(1, (Number(p.travelerCount) || 1) - 1) }))}
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className="wizard-input"
                          style={{ textAlign: 'center', fontWeight: 700 }}
                          value={tripInfo.travelerCount}
                          onChange={(e) => setTripInfo({ ...tripInfo, travelerCount: Math.max(1, Number(e.target.value) || 1) })}
                        />
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.5rem 0.75rem' }}
                          onClick={() => setTripInfo(p => ({ ...p, travelerCount: (Number(p.travelerCount) || 1) + 1 }))}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="wizard-field">
                      <label className="wizard-label">
                        <Car size={16} /> Phương tiện di chuyển
                      </label>
                      <select
                        className="wizard-input"
                        value={tripInfo.transportMode}
                        onChange={(e) => setTripInfo({ ...tripInfo, transportMode: e.target.value })}
                      >
                        {TRANSPORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Detailed Cost Breakdown (Collapsible Accordion) */}
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    marginTop: '0.5rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowCostAccordion(prev => !prev)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem 0',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <DollarSign size={18} color="var(--primary)" />
                        <span>Chi tiết chi phí & Dự toán ngân sách</span>
                        <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          Tổng: {totalCalculatedCost.toLocaleString()} VNĐ
                        </span>
                      </div>
                      {showCostAccordion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showCostAccordion && (
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                        {/* Cost Scope Toggle */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Áp dụng:</span>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="wizard_cost_scope"
                              checked={costBreakdown.scope === 'PERSON'}
                              onChange={() => setCostBreakdown(p => ({ ...p, scope: 'PERSON' }))}
                            />
                            Tính theo từng người (x {tripInfo.travelerCount} người)
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="wizard_cost_scope"
                              checked={costBreakdown.scope === 'GROUP'}
                              onChange={() => setCostBreakdown(p => ({ ...p, scope: 'GROUP' }))}
                            />
                            Tính chung cả nhóm
                          </label>
                        </div>

                        {/* Cost Inputs Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Di chuyển</label>
                            <input
                              type="number"
                              className="wizard-input"
                              value={costBreakdown.transport}
                              onChange={(e) => setCostBreakdown(p => ({ ...p, transport: Number(e.target.value) || 0 }))}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Ăn uống</label>
                            <input
                              type="number"
                              className="wizard-input"
                              value={costBreakdown.meals}
                              onChange={(e) => setCostBreakdown(p => ({ ...p, meals: Number(e.target.value) || 0 }))}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Tham quan</label>
                            <input
                              type="number"
                              className="wizard-input"
                              value={costBreakdown.attractions}
                              onChange={(e) => setCostBreakdown(p => ({ ...p, attractions: Number(e.target.value) || 0 }))}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Lưu trú</label>
                            <input
                              type="number"
                              className="wizard-input"
                              value={costBreakdown.accommodation}
                              onChange={(e) => setCostBreakdown(p => ({ ...p, accommodation: Number(e.target.value) || 0 }))}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Dự phòng</label>
                            <input
                              type="number"
                              className="wizard-input"
                              value={costBreakdown.contingency}
                              onChange={(e) => setCostBreakdown(p => ({ ...p, contingency: Number(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.75rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px dashed #cbd5e1',
                          fontSize: '0.875rem'
                        }}>
                          <span>{costBreakdown.scope === 'PERSON' ? `Mỗi người: ${perPersonCostSum.toLocaleString()} VNĐ × ${tripInfo.travelerCount} người` : 'Chi phí cả nhóm:'}</span>
                          <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                            Tổng: {totalCalculatedCost.toLocaleString()} VNĐ
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Preferences */}
                  <div className="wizard-field">
                    <label className="wizard-label">
                      <Sparkles size={16} /> Sở thích du lịch (Chọn nhiều)
                    </label>
                    <div className="wizard-prefs-grid">
                      {PREFERENCE_OPTIONS.map((pref) => (
                        <button
                          key={pref.value}
                          className={`wizard-pref-tag ${tripInfo.preferences.includes(pref.value) ? 'active' : ''}`}
                          onClick={() => togglePreference(pref.value)}
                          type="button"
                        >
                          {pref.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Packing Checklist (Collapsible) */}
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    marginTop: '0.5rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowPackingAccordion(prev => !prev)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem 0',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Briefcase size={18} color="var(--primary)" />
                        <span>Danh sách đồ cần mang theo ({packingList.filter(p => p.selected).length} món đã chọn)</span>
                      </div>
                      {showPackingAccordion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showPackingAccordion && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                        {/* Category filter */}
                        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                          {PACKING_CATEGORIES.map(cat => (
                            <button
                              key={cat.key}
                              type="button"
                              className={`btn ${packingCategoryFilter === cat.key ? 'btn-primary' : 'btn-outline'}`}
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                              onClick={() => setPackingCategoryFilter(cat.key)}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        {/* Quick action buttons & custom add */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => selectAllPackingInFilter(true)}
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                            >
                              Chọn tất cả
                            </button>
                            <button
                              type="button"
                              onClick={() => selectAllPackingInFilter(false)}
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                            >
                              Bỏ chọn
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem', flex: 1, maxWidth: 300 }}>
                            <input
                              type="text"
                              value={newPackingName}
                              onChange={(e) => setNewPackingName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomPacking(); } }}
                              placeholder="+ Thêm món khác..."
                              style={{ flex: 1, fontSize: '0.8rem', padding: '0.25rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: 4 }}
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomPacking}
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                            >
                              Thêm
                            </button>
                          </div>
                        </div>

                        {/* Items list */}
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {filteredPackingItems.map(item => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.4rem 0.6rem',
                                background: '#fff',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.85rem'
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.selected)}
                                  onChange={() => togglePackingItem(item.id)}
                                />
                                <span style={{ textDecoration: item.selected ? 'none' : 'line-through', color: item.selected ? 'inherit' : 'var(--text-muted)' }}>
                                  {item.itemName}
                                </span>
                              </label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  onClick={() => updatePackingQty(item.id, -1)}
                                  style={{ padding: '0.1rem 0.35rem', border: '1px solid #cbd5e1', background: '#f1f5f9', borderRadius: 4, cursor: 'pointer' }}
                                >
                                  -
                                </button>
                                <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updatePackingQty(item.id, 1)}
                                  style={{ padding: '0.1rem 0.35rem', border: '1px solid #cbd5e1', background: '#f1f5f9', borderRadius: 4, cursor: 'pointer' }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="wizard-form-footer">
                  <button
                    onClick={handleNextToStep2}
                    disabled={loading || !tripInfo.destination.trim()}
                    className="btn btn-primary wizard-next-btn"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin" size={18} /> AI đang tạo kế hoạch...</>
                    ) : (
                      <><Wand2 size={18} /> AI tạo kế hoạch trước</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="wizard-step-content"
            >
              <DestinationPicker
                suggestions={suggestions}
                selectedLocations={selectedLocations}
                onSelect={(loc) => setSelectedLocations(prev => {
                  const exists = prev.some((l) => String(l._clientKey || l.id) === String(loc._clientKey || loc.id));
                  if (exists) return prev;
                  return [...prev, loc];
                })}
                onDeselect={(locId) => setSelectedLocations(prev => prev.filter(l => String(l._clientKey || l.id) !== String(locId)))}
                destination={tripInfo.destination}
              />
              <div className="wizard-nav-buttons">
                <button onClick={() => setStep(1)} className="btn btn-outline wizard-back-btn">
                  <ChevronLeft size={18} /> Quay lại
                </button>
                <button
                  onClick={handleNextToStep3}
                  disabled={loading || selectedLocations.length === 0}
                  className="btn btn-primary wizard-next-btn"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={18} /> AI đang tạo lịch trình...</>
                  ) : (
                    <>Tạo lịch trình <ChevronRight size={18} /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="wizard-step-content"
            >
              <TimelineEditor
                plan={currentPlan}
                selectedLocations={selectedLocations}
                totalDays={computeDays()}
                destination={tripInfo.destination}
                onPlanChange={(updatedPlan) => setCurrentPlan(updatedPlan)}
                onAddCustomLocation={(loc) => {
                  setSelectedLocations((prev) => {
                    const exists = prev.some((l) => String(l._clientKey || l.id) === String(loc._clientKey || loc.id));
                    if (exists) return prev;
                    return [...prev, loc];
                  });
                }}
              />
              {currentPlan?.days && Number(tripInfo.budget) > 0 && (
                <div className="wizard-budget-preview">
                  <div className="budget-preview-header">
                    <span>Ước tính chi phí điểm tham quan:</span>
                    <strong>
                      {currentPlan.days.reduce((acc, day) => acc + day.items.reduce((dAcc, item) => dAcc + (item.location?.estimatedCost || 0), 0), 0).toLocaleString()} VNĐ
                      {' '}/ {Number(tripInfo.budget).toLocaleString()} VNĐ
                    </strong>
                  </div>
                  <div className="budget-progress-bar">
                    <div 
                      className="budget-progress-fill"
                      style={{ 
                        width: `${Math.min(100, (currentPlan.days.reduce((acc, day) => acc + day.items.reduce((dAcc, item) => dAcc + (item.location?.estimatedCost || 0), 0), 0) / Number(tripInfo.budget)) * 100)}%` 
                      }}
                    />
                  </div>
                  {(currentPlan.days.reduce((acc, day) => acc + day.items.reduce((dAcc, item) => dAcc + (item.location?.estimatedCost || 0), 0), 0) / Number(tripInfo.budget)) > 1 && (
                    <p className="budget-warning">⚠️ Đã vượt quá ngân sách dự kiến!</p>
                  )}
                </div>
              )}
              <div className="wizard-nav-buttons">
                <button onClick={() => setStep(2)} className="btn btn-outline wizard-back-btn">
                  <ChevronLeft size={18} /> Chỉnh danh sách địa điểm
                </button>
                <button onClick={() => setShowEditTripInfo(true)} className="btn btn-outline">
                  Sửa thông tin
                </button>
                <button
                  onClick={() => handleSave(currentPlan)}
                  disabled={saving}
                  className="btn btn-primary wizard-save-btn"
                >
                  {saving ? (
                    <><Loader2 className="animate-spin" size={18} /> Đang lưu...</>
                  ) : (
                    <><Save size={18} /> Lưu kế hoạch</>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {showEditTripInfo && (
                  <div className="trip-details-modal-overlay">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="card trip-details-modal-card"
                    >
                      <div className="trip-details-modal-header">
                        <h2 className="trip-details-modal-title">Sửa thông tin kế hoạch</h2>
                        <button onClick={() => setShowEditTripInfo(false)} className="trip-details-modal-close">×</button>
                      </div>
                      <div className="trip-details-modal-body">
                        <label className="wizard-label"><Tag size={16} /> Tên chuyến đi</label>
                        <input className="wizard-input" value={tripInfo.name} onChange={(e) => setTripInfo((p) => ({ ...p, name: e.target.value }))} />
                        <label className="wizard-label" style={{ marginTop: '0.75rem' }}><MapPin size={16} /> Địa điểm</label>
                        <input className="wizard-input" value={tripInfo.destination} onChange={(e) => setTripInfo((p) => ({ ...p, destination: e.target.value }))} />
                        <div className="wizard-field-row" style={{ marginTop: '0.75rem' }}>
                          <div className="wizard-field">
                            <label className="wizard-label"><Calendar size={16} /> Ngày đi</label>
                            <input type="date" className="wizard-input" value={tripInfo.startDate} onChange={(e) => setTripInfo((p) => ({ ...p, startDate: e.target.value }))} />
                          </div>
                          <div className="wizard-field">
                            <label className="wizard-label"><Calendar size={16} /> Ngày về</label>
                            <input type="date" className="wizard-input" value={tripInfo.endDate} onChange={(e) => setTripInfo((p) => ({ ...p, endDate: e.target.value }))} />
                          </div>
                          <div className="wizard-field wizard-field-small">
                            <label className="wizard-label">Số ngày</label>
                            <input type="number" min="1" max="30" className="wizard-input" value={tripInfo.totalDays} onChange={(e) => setTripInfo((p) => ({ ...p, totalDays: Number(e.target.value) }))} />
                          </div>
                        </div>
                        <label className="wizard-label" style={{ marginTop: '0.75rem' }}><DollarSign size={16} /> Ngân sách (VNĐ)</label>
                        <input type="number" className="wizard-input" value={tripInfo.budget} onChange={(e) => setTripInfo((p) => ({ ...p, budget: e.target.value }))} />
                      </div>
                      <div className="trip-details-modal-footer">
                        <button onClick={() => setShowEditTripInfo(false)} className="btn btn-outline trip-details-modal-btn">Đóng</button>
                        <button onClick={() => setShowEditTripInfo(false)} className="btn btn-primary trip-details-modal-btn trip-details-modal-btn-confirm">Lưu</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default PlannerWizard;
