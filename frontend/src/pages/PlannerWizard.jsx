import React, { useEffect, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, DollarSign, Sparkles, ChevronRight,
  ChevronLeft, Loader2, Save, Wand2, Tag, Users, Car, Plus, Minus,
} from 'lucide-react';
import { locationService } from '../services/locationService';
import { itineraryService } from '../services/itineraryService';
import { friendService } from '../services/friendService';
import { useTrips } from '../context/TripContext';
import DestinationPicker from './DestinationPicker';
import TimelineEditor from './TimelineEditor';
import { aiTripDates, aiPlanItems } from '../utils/aiPlan';
import { aiPlanCosts, aiPlanDescription } from '../utils/aiPlanDetails';
import AiPlanOverview from '../Components/AiPlanOverview';
import { createSampleAiPlan } from '../services/sampleAiPlan';
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

const PlannerWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addTrip, fetchTrips } = useTrips();
  const [step, setStep] = useState(1);
  const loading = false;
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

  const [_friendsList, setFriendsList] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  useEffect(() => {
    friendService.getFriends().then(f => setFriendsList(f || [])).catch(() => {});
  }, []);

  const _toggleSelectFriend = (friendId) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  // Step 2: Suggestions + selection
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);

  // Step 3: Timeline plan
  const [_autoPlan, setAutoPlan] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [planNotice, setPlanNotice] = useState('');
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

  const togglePreference = (pref) => {
    setTripInfo(prev => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter(p => p !== pref)
        : [...prev.preferences, pref]
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
    if (loading) return;
    try { aiTripDates(tripInfo.startDate, tripInfo.endDate, computeDays()); }
    catch (error) { setToast(error.message); return; }
    if (!Number.isFinite(Number(tripInfo.budget || 0)) || Number(tripInfo.budget || 0) < 0) { setToast('Ngân sách phải là số không âm.'); return; }
    if (!tripInfo.destination.trim()) {
      setToast('Vui lòng nhập địa điểm bạn muốn đi!');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    renderSamplePlan();
  };

  const renderSamplePlan = (locations = []) => {
    const plan = createSampleAiPlan({ destination: tripInfo.destination, days: computeDays(), budget: tripInfo.budget, travelerCount: tripInfo.travelerCount, transportMode: tripInfo.transportMode, locations });
    const stops = plan.days.flatMap(day => day.items.map(item => item.location).filter(Boolean));
    const uniqueStops = [...new Map(stops.map(stop => [stop.id, stop])).values()];
    setSuggestions(uniqueStops);
    setSelectedLocations(uniqueStops);
    setAutoPlan(plan);
    setCurrentPlan(plan);
    setPlanNotice(plan.description);
    setStep(3);
  };

  const handleNextToStep3 = () => renderSamplePlan(selectedLocations);

  const getEffectiveBudget = () => {
    if (tripInfo.budget !== '') return Number(tripInfo.budget);
    return null;
  };

  const saveManualPlan = async () => {

    const itinerary = await itineraryService.create({
      name: tripInfo.name || `Du lịch ${tripInfo.destination}`,
      destination: tripInfo.destination,
      startDate: tripInfo.startDate || null,
      endDate: tripInfo.endDate || null,
      totalDays: computeDays(),
      budget: getEffectiveBudget(),
      travelerCount: Number(tripInfo.travelerCount) || 1,
      transportMode: tripInfo.transportMode || 'flight',
      costScope: 'GROUP',
      ...aiPlanCosts(currentPlan),
      preferences: tripInfo.preferences,
      packingItems: [],
      collaboratorIds: selectedFriendIds,
      description: null,
      items: selectedLocations
        .filter((loc) => loc?.id)
        .map((loc) => ({ locationId: loc.id }))
    });

    return itinerary;
  };

  const saveAIPlan = async (finalPlan) => {
    const dates = aiTripDates(tripInfo.startDate, tripInfo.endDate, computeDays());
    const allItems = aiPlanItems(finalPlan, dates.startDate);


    const itinerary = await itineraryService.create({
      name: tripInfo.name || finalPlan?.planName || `Du lịch ${tripInfo.destination}`,
      destination: tripInfo.destination,
      startDate: dates.startDate,
      endDate: dates.endDate,
      totalDays: computeDays(),
      budget: getEffectiveBudget(),
      travelerCount: Number(tripInfo.travelerCount) || 1,
      transportMode: tripInfo.transportMode || 'flight',
      costScope: 'GROUP',
      ...aiPlanCosts(finalPlan),
      preferences: tripInfo.preferences,
      packingItems: [],
      collaboratorIds: selectedFriendIds,
      description: aiPlanDescription(finalPlan),
      items: allItems
    });

    return itinerary;
  };

  // Save itinerary
  const handleSave = async (finalPlan) => {
    if (saving) return;
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

                  <div className="wizard-field">
                    <label className="wizard-label" htmlFor="ai-total-budget"><DollarSign size={16} /> Tổng ngân sách cả chuyến đi (VNĐ)</label>
                    <input id="ai-total-budget" className="wizard-input" type="number" min="0" max="999999999999" value={tripInfo.budget} onChange={e => setTripInfo(p => ({ ...p, budget: e.target.value }))} placeholder="Ví dụ: 10000000" />
                    <p className="text-muted">Tổng cho tất cả thành viên. AI sẽ đề xuất phân bổ di chuyển, lưu trú, ăn uống, hoạt động và dự phòng.</p>
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
                      <><Wand2 size={18} /> Xem kế hoạch mẫu</>
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
                    <>Tạo lại lịch trình mẫu <ChevronRight size={18} /></>
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
              {planNotice && <p role="status" className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>{planNotice}</p>}
              <AiPlanOverview plan={currentPlan} budget={getEffectiveBudget()} />
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
                        <label className="wizard-label" style={{ marginTop: '0.75rem' }}><DollarSign size={16} /> Tổng ngân sách cả chuyến đi (VNĐ)</label>
                        <input type="number" min="0" max="999999999999" className="wizard-input" value={tripInfo.budget} onChange={(e) => setTripInfo((p) => ({ ...p, budget: e.target.value }))} />
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
