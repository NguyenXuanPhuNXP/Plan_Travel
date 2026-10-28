import React, { useState, useEffect } from 'react';
import Layout from '../Components/Layout/Layout';
import { useTrips } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  CalendarDays,
  Trash2,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import './TripHistory.css';

const TripHistory = () => {
  const safeFormatDate = (value) => {
    if (!value) return '--/--/----';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '--/--/----' : format(date, 'dd/MM/yyyy');
  };
  const { trips, deleteTrip, fetchTrips, loading } = useTrips();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const filteredTrips = trips.filter(trip => {
    const title = trip.title || trip.name || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || trip.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'var(--primary)';
      case 'ongoing': return 'var(--secondary)';
      case 'completed': return 'var(--text-muted)';
      default: return 'var(--text-main)';
    }
  };

  const tabs = [
    { id: 'all', label: 'Tất cả', icon: TrendingUp },
    { id: 'upcoming', label: 'Sắp tới', icon: CalendarDays },
    { id: 'ongoing', label: 'Đang đi', icon: Clock },
    { id: 'completed', label: 'Hoàn thành', icon: CheckCircle2 },
  ];

  return (
    <Layout>
      <div className="trip-history-container">
        <div className="trip-history-header">
          <div>
            <h1 className="trip-history-title">Lịch sử chuyến đi</h1>
            <p className="trip-history-subtitle">Quản lý và xem lại tất cả các hành trình của bạn.</p>
          </div>
          <Link to="/planner" className="btn btn-primary">
            Tạo kế hoạch mới
          </Link>
        </div>

        {/* Filters */}
        <div className="trip-history-filters">
          <div className="trip-history-search">
            <Search size={18} className="trip-history-search-icon" />
            <input 
              type="text" 
              placeholder="Tìm kiếm chuyến đi..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="trip-history-search-input"
            />
          </div>
          
          <div className="trip-history-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`trip-history-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trips Grid */}
        <div className="trip-history-grid">
          <AnimatePresence>
            {loading && trips.length === 0 ? (
              <div className="trip-history-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Loader2 className="animate-spin" size={20} />
                <span>Đang tải danh sách chuyến đi...</span>
              </div>
            ) : filteredTrips.length > 0 ? filteredTrips.map((trip) => {
              const tripTitle = trip.title || trip.name || 'Chuyến đi chưa đặt tên';
              const locations = Array.isArray(trip.locations) && trip.locations.length > 0
                ? trip.locations
                : (Array.isArray(trip.items) ? trip.items : []);
              const firstLocName = (locations[0]?.name || locations[0]?.customName || 'Chưa có điểm').split(',')[0];
              const budgetVal = Number(trip.budget != null ? trip.budget : (trip.totalCost != null ? trip.totalCost : 0));

              return (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card trip-history-card"
              >
                <div className="trip-history-status-row">
                  <div 
                    className="trip-history-badge"
                    style={{ color: getStatusColor(trip.status) }}
                  >
                    {tabs.find(t => t.id === trip.status)?.label || trip.status}
                  </div>
                  {trip.owner && String(trip.owner.id) !== String(user?.id) && (
                    <div 
                      className="trip-history-badge trip-history-badge-shared"
                      title="Chuyến đi chung"
                    >
                      Nhóm của {trip.owner.name}
                    </div>
                  )}
                </div>
                
                <div className="trip-history-content">
                  <div className="trip-history-card-header">
                    <h3 className="trip-history-card-title">{tripTitle}</h3>
                    <button onClick={() => deleteTrip(trip.id)} className="trip-history-delete-btn" title="Xóa">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="trip-history-meta">
                    <div className="trip-history-meta-item">
                      <Calendar size={16} />
                      <span>{safeFormatDate(trip.startDate)} - {safeFormatDate(trip.endDate)}</span>
                    </div>
                    <div className="trip-history-meta-item">
                      <MapPin size={16} />
                      <span>{locations.length} điểm đến · {firstLocName}...</span>
                    </div>
                  </div>

                  <div className="trip-history-footer">
                    <div className="trip-history-budget">
                      <span>Ngân sách: </span>
                      {budgetVal.toLocaleString()}đ
                    </div>
                    <Link to={`/trip/${trip.id}`} className="trip-history-detail-link">
                      Chi tiết <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
            }) : (
              <div className="trip-history-empty">
                <p>Không tìm thấy chuyến đi nào khớp với lựa chọn.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default TripHistory;
