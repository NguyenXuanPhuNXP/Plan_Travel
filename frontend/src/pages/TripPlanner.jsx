import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import MapComponent from '../components/Map/MapComponent';
import { useTrips } from '../context/TripContext';
import { useNavigate, Link } from 'react-router-dom';
import { itineraryService } from '../services/itineraryService';
import { locationService } from '../services/locationService';
import { motion, Reorder } from 'framer-motion';
import {
  Save,
  MapPin,
  DollarSign,
  X,
  GripVertical,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import './TripPlanner.css';

const TripPlanner = () => {
  const { addTrip, fetchTrips } = useTrips();
  const navigate = useNavigate();

  const [tripInfo, setTripInfo] = useState({
    title: '',
    startLocation: '',
    endLocation: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 86400000 * 3), 'yyyy-MM-dd'),
    budget: '',
    notes: ''
  });

  const [selectedLocations, setSelectedLocations] = useState([]);
  const [toast, setToast] = useState('');

  const handleLocationAdd = (loc) => {
    setSelectedLocations(prev => {
      const locKey = String(loc.id || `${loc.name}_${loc.lat}_${loc.lng}`);
      const exists = prev.some((item) => {
        const itemKey = String(item.id || `${item.name}_${item.lat}_${item.lng}`);
        return itemKey === locKey;
      });
      if (exists) return prev;
      return [...prev, { ...loc, tripLocId: `trip_loc_${Date.now()}_${prev.length}` }];
    });
  };

  const handleLocationRemove = (tripLocId) => {
    setSelectedLocations(prev => prev.filter(
      l => String(l.tripLocId) !== String(tripLocId) && String(l.id) !== String(tripLocId)
    ));
  };

  const computeDays = () => {
    if (!tripInfo.startDate || !tripInfo.endDate) return null;
    const diff = Math.ceil((new Date(tripInfo.endDate) - new Date(tripInfo.startDate)) / 86400000) + 1;
    return diff > 0 ? diff : null;
  };

  const ensurePersistedLocation = async (loc) => {
    if (/^\d+$/.test(String(loc.id))) return loc;

    const created = await locationService.createManual({
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude ?? loc.lat,
      longitude: loc.longitude ?? loc.lng,
      category: loc.category || 'manual',
      region: tripInfo.endLocation,
      imageUrl: loc.imageUrl || loc.image,
      estimatedCost: loc.estimatedCost || 0,
      suggestedDuration: loc.suggestedDuration
    });

    return {
      ...loc,
      id: created.id,
      name: created.name || loc.name,
      address: created.address || loc.address,
      lat: created.latitude ?? loc.lat,
      lng: created.longitude ?? loc.lng,
      latitude: created.latitude ?? loc.latitude,
      longitude: created.longitude ?? loc.longitude,
      image: created.imageUrl || loc.image,
      imageUrl: created.imageUrl || loc.imageUrl,
      estimatedCost: created.estimatedCost ?? loc.estimatedCost,
      suggestedDuration: created.suggestedDuration || loc.suggestedDuration
    };
  };

  const handleSaveTrip = async () => {
    if (!tripInfo.title || !tripInfo.startLocation || selectedLocations.length === 0) {
      setToast('Vui lòng nhập tên chuyến đi, điểm đi và chọn ít nhất một điểm đến.');
      setTimeout(() => setToast(''), 2500);
      return;
    }

    try {
      const persistedLocations = [];
      for (const loc of selectedLocations) {
        persistedLocations.push(await ensurePersistedLocation(loc));
      }

      const destinationNames = persistedLocations.map((loc) => loc.name).filter(Boolean);
      const mainDestination = destinationNames.slice(0, 3).join(', ');
      const finalDestination = tripInfo.endLocation.trim() || destinationNames[destinationNames.length - 1] || mainDestination;

      const newTrip = await addTrip({
        name: tripInfo.title,
        startDate: tripInfo.startDate,
        endDate: tripInfo.endDate,
        totalDays: computeDays(),
        budget: tripInfo.budget ? Number(tripInfo.budget) : null,
        description: tripInfo.notes,
        destination: mainDestination,
        startLocation: tripInfo.startLocation.trim(),
        endLocation: finalDestination
      });

      for (let i = 0; i < persistedLocations.length; i++) {
        const loc = persistedLocations[i];
        await itineraryService.addItem(newTrip.id, {
          locationId: loc.id,
          note: `Điểm dừng ${i + 1}`
        });
      }

      await fetchTrips();
      navigate(`/trip/${newTrip.id}`);
    } catch (err) {
      console.error(err);
      setToast('Có lỗi khi lưu kế hoạch. Vui lòng thử lại.');
      setTimeout(() => setToast(''), 2500);
    }
  };

  return (
    <Layout>
      <div className="trip-planner-container">
        {toast && (
          <div className="card" style={{ position: 'fixed', right: 20, top: 90, zIndex: 3000, padding: '0.75rem 1rem' }}>
            {toast}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card trip-planner-form-card"
        >
          <div className="trip-planner-breadcrumb">
            <Link to="/" className="trip-planner-breadcrumb-link"><ArrowLeft size={14} /> Dashboard</Link>
            <ChevronRight size={14} />
            <span>Lập kế hoạch thủ công</span>
          </div>

          <h2 className="trip-planner-title">Chi tiết chuyến đi</h2>

          <div className="trip-planner-form">
            <div>
              <label className="trip-planner-label">Tên chuyến đi</label>
              <input
                type="text"
                placeholder="Ví dụ: Du lịch Hà Nội 3 ngày 2 đêm"
                className="btn-outline trip-planner-input"
                value={tripInfo.title}
                onChange={(e) => setTripInfo({ ...tripInfo, title: e.target.value })}
              />
            </div>

            <div>
              <label className="trip-planner-label">Điểm đi</label>
              <input
                type="text"
                placeholder="Ví dụ: TP. Hồ Chí Minh"
                className="btn-outline trip-planner-input"
                value={tripInfo.startLocation}
                onChange={(e) => setTripInfo({ ...tripInfo, startLocation: e.target.value })}
              />
            </div>

            <div>
              <label className="trip-planner-label">Điểm kết thúc</label>
              <input
                type="text"
                placeholder="Để trống để lấy theo điểm dừng cuối"
                className="btn-outline trip-planner-input"
                value={tripInfo.endLocation}
                onChange={(e) => setTripInfo({ ...tripInfo, endLocation: e.target.value })}
              />
            </div>

            <div className="trip-planner-date-grid">
              <div>
                <label className="trip-planner-label">Ngày bắt đầu</label>
                <input
                  type="date"
                  className="btn-outline trip-planner-date-input"
                  value={tripInfo.startDate}
                  onChange={(e) => setTripInfo({ ...tripInfo, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="trip-planner-label">Ngày kết thúc</label>
                <input
                  type="date"
                  className="btn-outline trip-planner-date-input"
                  value={tripInfo.endDate}
                  onChange={(e) => setTripInfo({ ...tripInfo, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="trip-planner-label">Ngân sách dự kiến (VNĐ)</label>
              <div className="trip-planner-input-group">
                <DollarSign size={16} className="trip-planner-input-icon" />
                <input
                  type="number"
                  placeholder="5000000"
                  className="btn-outline trip-planner-input-with-icon"
                  value={tripInfo.budget}
                  onChange={(e) => setTripInfo({ ...tripInfo, budget: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="trip-planner-label">Ghi chú</label>
              <textarea
                placeholder="Ghi lại những điều cần lưu ý cho chuyến đi..."
                className="btn-outline trip-planner-textarea"
                value={tripInfo.notes}
                onChange={(e) => setTripInfo({ ...tripInfo, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="trip-planner-form-footer">
            <button
              onClick={handleSaveTrip}
              className="btn btn-primary trip-planner-save-btn"
            >
              <Save size={18} /> Lưu kế hoạch
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="trip-planner-map-container"
        >
          <MapComponent
            selectedLocations={selectedLocations}
            onLocationAdd={handleLocationAdd}
            onLocationRemove={handleLocationRemove}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card trip-planner-locations-card"
        >
          <h3 className="trip-planner-locations-title">
            <MapPin size={18} color="var(--primary)" /> Điểm đến ({selectedLocations.length})
          </h3>

          {selectedLocations.length === 0 ? (
            <div className="trip-planner-locations-empty">
              <p>Mẹo: click vào bản đồ hoặc tìm kiếm để thêm nhiều điểm đến cho lịch trình.</p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={selectedLocations}
              onReorder={setSelectedLocations}
              className="trip-planner-locations-list"
            >
              {selectedLocations.map((loc, idx) => (
                <Reorder.Item
                  key={loc.tripLocId || loc.id}
                  value={loc}
                >
                  <div className="trip-planner-location-item">
                    <GripVertical size={16} color="var(--text-muted)" />
                    <div className="trip-planner-location-info">
                      <div className="trip-planner-location-name">{loc.name}</div>
                      <div className="trip-planner-location-sub">{idx + 1}. Điểm đến</div>
                    </div>
                    <button
                      onClick={() => handleLocationRemove(loc.tripLocId || loc.id)}
                      className="trip-planner-location-remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}

          <div className="trip-planner-tip">
            <div className="trip-planner-tip-title">Gợi ý</div>
            <p className="trip-planner-tip-content">
              Có thể thêm nhiều điểm đến và kéo thả để đổi thứ tự. Điểm kết thúc sẽ tự lấy theo điểm cuối nếu bạn không nhập riêng.
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default TripPlanner;
