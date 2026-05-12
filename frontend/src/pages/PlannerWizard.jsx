import React, { useEffect, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, DollarSign, Sparkles, ChevronRight, 
  ChevronLeft, Loader2, Save, Wand2, Tag
} from 'lucide-react';
import { locationService } from '../services/locationService';
import { itineraryService } from '../services/itineraryService';
import DestinationPicker from './DestinationPicker';
import TimelineEditor from './TimelineEditor';
import './PlannerWizard.css';

const PREFERENCE_OPTIONS = [
  { value: 'beach', label: '🏖️ Biển', icon: '🏖️' },
  { value: 'mountain', label: '⛰️ Núi', icon: '⛰️' },
  { value: 'food', label: '🍜 Ẩm thực', icon: '🍜' },
  { value: 'culture', label: '🏛️ Văn hóa', icon: '🏛️' },
  { value: 'nature', label: '🌿 Thiên nhiên', icon: '🌿' },
  { value: 'shopping', label: '🛍️ Mua sắm', icon: '🛍️' },
  { value: 'nightlife', label: '🌙 Về đêm', icon: '🌙' },
  { value: 'adventure', label: '🧗 Mạo hiểm', icon: '🧗' },
  { value: 'relax', label: '🧘 Nghỉ dưỡng', icon: '🧘' },
  { value: 'photography', label: '📸 Chụp ảnh', icon: '📸' },
];

const PlannerWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [tripInfo, setTripInfo] = useState({
    destination: initialDestination,
    name: initialDestination ? `Du lịch ${initialDestination}` : '',
    startDate: '',
    endDate: '',
    totalDays: Number.isFinite(initialTotalDays) && initialTotalDays > 0 ? initialTotalDays : 3,
    budget: initialBudget,
    preferences: initialPrefs
  });

  // Step 2: Suggestions + selection
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);

  // Step 3: Timeline plan
  const [autoPlan, setAutoPlan] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [showEditTripInfo, setShowEditTripInfo] = useState(false);

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

  // Step 1: AI generates an initial editable plan
  const handleNextToStep2 = async () => {
    if (!tripInfo.destination.trim()) {
      setToast('Vui lòng nhập địa điểm bạn muốn đi!');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    setLoading(true);
    try {
      const data = await locationService.getSuggestions(
        tripInfo.destination,
        computeDays(),
        tripInfo.budget ? Number(tripInfo.budget) : null,
        tripInfo.preferences
      );
      let nextSuggestions = data.suggestions || [];
      // Fallback when AI cannot infer destination reliably.
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
          budget: tripInfo.budget ? Number(tripInfo.budget) : null,
          preferences: tripInfo.preferences,
          selectedLocationIds: preselected.map((l) => l.id).filter(Boolean)
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
      const plan = await locationService.getAutoPlan({
        region: tripInfo.destination,
        days: computeDays(),
        budget: tripInfo.budget ? Number(tripInfo.budget) : null,
        preferences: tripInfo.preferences,
        selectedLocationIds: selectedLocations.map(l => l.id)
      });
      setAutoPlan(plan);
      setCurrentPlan(plan);
      setStep(3);
    } catch (error) {
      console.error('Auto plan error:', error);
      // Fallback: go to step 3 without auto plan
      setCurrentPlan(null);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // Save itinerary
  const handleSave = async (finalPlan) => {
    setSaving(true);
    try {
      // 1. Create itinerary
      const itinerary = await itineraryService.create({
        name: tripInfo.name || `Du lịch ${tripInfo.destination}`,
        destination: tripInfo.destination,
        startDate: tripInfo.startDate || null,
        endDate: tripInfo.endDate || null,
        totalDays: computeDays(),
        budget: tripInfo.budget ? Number(tripInfo.budget) : null,
        preferences: tripInfo.preferences,
        description: finalPlan?.description || null
      });

      // 2. Add items from the plan
      const allItems = finalPlan?.days?.flatMap(day => 
        day.items.map((item, idx) => ({
          locationId: item.locationId || item.location?.id || null,
          startTime: item.startTime ? `2025-01-01T${item.startTime}:00` : null,
          endTime: item.endTime ? `2025-01-01T${item.endTime}:00` : null,
          note: item.note || null,
          travelMinutes: item.travelMinutesToNext || null
        }))
      ) || selectedLocations.map(loc => ({ locationId: loc.id }));

      for (const item of allItems) {
        if (item.locationId) {
          await itineraryService.addItem(itinerary.id, item);
        }
      }

      navigate(`/trip/${itinerary.id}`);
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
              <div className="card wizard-form-card">
                <div className="wizard-form-header">
                  <div className="wizard-form-icon-wrap">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h2 className="wizard-form-title">Bạn muốn đi đâu?</h2>
                    <p className="wizard-form-subtitle">Nhập thông tin chuyến đi, AI sẽ tự tạo sẵn một lịch trình để bạn chỉnh sửa lại.</p>
                  </div>
                </div>

                <div className="wizard-form-body">
                  {/* Destination - Required */}
                  <div className="wizard-field wizard-field-highlight">
                    <label className="wizard-label">
                      <MapPin size={16} /> Địa điểm <span className="wizard-required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Vũng Tàu, Đà Nẵng, Phú Quốc..."
                      className="wizard-input wizard-input-lg"
                      value={tripInfo.destination}
                      onChange={(e) => setTripInfo({ ...tripInfo, destination: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Trip Name - Optional */}
                  <div className="wizard-field">
                    <label className="wizard-label">
                      <Tag size={16} /> Tên chuyến đi
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Du lịch biển cuối tuần"
                      className="wizard-input"
                      value={tripInfo.name}
                      onChange={(e) => setTripInfo({ ...tripInfo, name: e.target.value })}
                    />
                  </div>

                  {/* Dates - Optional */}
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

                  {/* Budget - Optional */}
                  <div className="wizard-field">
                    <label className="wizard-label">
                      <DollarSign size={16} /> Ngân sách (VNĐ)
                    </label>
                    <input
                      type="number"
                      placeholder="Ví dụ: 5000000"
                      className="wizard-input"
                      value={tripInfo.budget}
                      onChange={(e) => setTripInfo({ ...tripInfo, budget: e.target.value })}
                    />
                  </div>

                  {/* Preferences - Optional */}
                  <div className="wizard-field">
                    <label className="wizard-label">
                      <Sparkles size={16} /> Sở thích
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
                plan={autoPlan}
                selectedLocations={selectedLocations}
                totalDays={computeDays()}
                destination={tripInfo.destination}
                onPlanChange={setCurrentPlan}
                onAddCustomLocation={(loc) => setSelectedLocations((prev) => {
                  const key = String(loc?.id || `${loc?.name || ''}_${loc?.latitude}_${loc?.longitude}`);
                  const exists = prev.some((p) => String(p._clientKey || p.id) === key || String(p.id) === String(loc.id));
                  if (exists) return prev;
                  return [...prev, { ...loc, _clientKey: key }];
                })}
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
