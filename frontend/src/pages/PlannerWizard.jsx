import React, { useEffect, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import { useNavigate } from 'react-router-dom';
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Step 1: Trip info
  const [tripInfo, setTripInfo] = useState({
    destination: '',
    name: '',
    startDate: '',
    endDate: '',
    totalDays: 3,
    budget: '',
    preferences: []
  });

  // Step 2: Suggestions + selection
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);

  // Step 3: Timeline plan
  const [autoPlan, setAutoPlan] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);

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

  // Step 1 → 2: Fetch suggestions
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
      setSuggestions(data.suggestions || []);
      setStep(2);
    } catch (error) {
      console.error('Fetch suggestions error:', error);
      setToast('Có lỗi khi tìm gợi ý. Vui lòng thử lại.');
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
                    <p className="wizard-form-subtitle">Nhập địa điểm và AI sẽ gợi ý những nơi tuyệt vời nhất</p>
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
                      <><Loader2 className="animate-spin" size={18} /> Đang tìm gợi ý...</>
                    ) : (
                      <><Wand2 size={18} /> Tìm gợi ý AI</>
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
              />
              <div className="wizard-nav-buttons">
                <button onClick={() => setStep(2)} className="btn btn-outline wizard-back-btn">
                  <ChevronLeft size={18} /> Quay lại
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default PlannerWizard;
