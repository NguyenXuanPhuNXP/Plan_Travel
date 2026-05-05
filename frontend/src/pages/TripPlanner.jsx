import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import MapComponent from '../components/Map/MapComponent';
import { useTrips } from '../context/TripContext';
import { useNavigate, Link } from 'react-router-dom';
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
  const { addTrip } = useTrips();
  const navigate = useNavigate();

  const [tripInfo, setTripInfo] = useState({
    title: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 86400000 * 3), 'yyyy-MM-dd'),
    budget: '',
    notes: ''
  });

  const [selectedLocations, setSelectedLocations] = useState([]);

  const handleLocationAdd = (loc) => {
    setSelectedLocations(prev => [...prev, { ...loc, tripLocId: `trip_loc_${Date.now()}` }]);
  };

  const handleLocationRemove = (tripLocId) => {
    setSelectedLocations(prev => prev.filter(l => l.tripLocId !== tripLocId || l.id !== tripLocId));
  };

  const handleSaveTrip = () => {
    if (!tripInfo.title || selectedLocations.length === 0) {
      alert('Vui lòng nhập tên chuyến đi và chọn ít nhất một địa điểm');
      return;
    }

    const newTrip = addTrip({
      ...tripInfo,
      locations: selectedLocations
    });

    navigate(`/trip/${newTrip.id}`);
  };

  return (
    <Layout>
      <div className="trip-planner-container">
        {/* Left Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card trip-planner-form-card"
        >
          <div className="trip-planner-breadcrumb">
            <Link to="/" className="trip-planner-breadcrumb-link"><ArrowLeft size={14} /> Dashboard</Link>
            <ChevronRight size={14} />
            <span>Lập kế hoạch</span>
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

            {/* <div>
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
            </div> */}

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

        {/* Center Map */}
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

        {/* Right Locations List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card trip-planner-locations-card"
        >
          <h3 className="trip-planner-locations-title">
            <MapPin size={18} color="var(--primary)" /> Điểm dừng ({selectedLocations.length})
          </h3>

          {selectedLocations.length === 0 ? (
            <div className="trip-planner-locations-empty">
              <p>Mẹo: Click vào bản đồ hoặc tìm kiếm để thêm điểm dừng.</p>
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
                      <div className="trip-planner-location-sub">{idx + 1}. Stop</div>
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
              Bạn có thể kéo thả để thay đổi thứ tự các địa điểm trong lịch trình của mình.
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default TripPlanner;
