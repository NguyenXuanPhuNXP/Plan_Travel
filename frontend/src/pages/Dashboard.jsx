import React from 'react';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { TRENDING_DESTINATIONS } from '../utils/mockData';
import { locationService } from '../services/locationService';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Plus, Map as MapIcon, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { trips } = useTrips();
  const [hotLocations, setHotLocations] = React.useState([]);

  React.useEffect(() => {
    locationService.getHotLocations(4).then((locations) => {
      if (locations.length > 0) setHotLocations(locations);
    });
  }, []);

  // Get recent trips (last 3)
  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="dashboard-container"
      >
        {/* Welcome Section */}
        <motion.section variants={item}>
          <h1 className="dashboard-header-title">
            Chào buổi tối, {user?.name?.split(' ')[0] || 'bạn'}! 👋
          </h1>
          <p className="dashboard-header-subtitle">
            Bạn đã sẵn sàng cho cuộc phiêu lưu tiếp theo chưa?
          </p>
        </motion.section>

        {/* Quick Actions / Stats */}
        <motion.div variants={item} className="dashboard-stats-grid">
          <div className="card dashboard-card-primary" style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)' }}>
            <h3 className="dashboard-card-title">Lập kế hoạch AI <Sparkles size={16} /></h3>
            <p className="dashboard-card-desc">Gợi ý điểm đến và tự tạo lịch trình thông minh.</p>
            <Link to="/planner" className="btn dashboard-card-btn" style={{ background: 'white', color: 'var(--primary)' }}>
              <Plus size={18} /> Thử ngay
            </Link>
          </div>

          <div className="card dashboard-card-secondary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
            <h3 className="dashboard-card-title" style={{ color: 'white' }}>Lập kế hoạch Thủ công</h3>
            <p className="dashboard-card-desc" style={{ color: 'rgba(255,255,255,0.8)' }}>Tự do chọn điểm trên bản đồ và lên lịch.</p>
            <Link to="/planner/map" className="btn dashboard-card-btn" style={{ background: 'white', color: '#059669', borderColor: 'transparent' }}>
              <MapIcon size={18} /> Tự tạo
            </Link>
          </div>

          <div className="card">
            <div className="dashboard-stat-header">
              <span className="dashboard-stat-label">TỔNG CHUYẾN ĐI</span>
              <div className="dashboard-stat-icon-wrapper-1">
                <MapIcon size={20} />
              </div>
            </div>
            <div className="dashboard-stat-value">{trips.length}</div>
            <Link to="/history" className="dashboard-stat-link">
              Xem chi tiết <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* Recent Trips */}
        <motion.section variants={item}>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Kế hoạch gần đây</h2>
            <Link to="/history" className="dashboard-section-link">Xem tất cả</Link>
          </div>
          
          <div className="dashboard-trips-grid">
            {recentTrips.length > 0 ? recentTrips.map((trip) => {
              const locations = Array.isArray(trip.locations) ? trip.locations : [];
              const tripTitle = trip.title || trip.name || 'Chuyến đi';
              return (
              <Link key={trip.id} to={`/trip/${trip.id}`} className="card dashboard-trip-card">
                <div className="dashboard-trip-img-wrapper">
                  <img 
                    src={locations[0]?.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'} 
                    alt={tripTitle} 
                    className="dashboard-trip-img"
                  />
                  <div className={`dashboard-trip-badge dashboard-trip-badge-${trip.status}`}>
                    {trip.status === 'upcoming' ? 'Sắp tới' : (trip.status === 'ongoing' ? 'Đang đi' : 'Hoàn thành')}
                  </div>
                </div>
                <div className="dashboard-trip-content">
                  <h3 className="dashboard-trip-title">{tripTitle}</h3>
                  <div className="dashboard-trip-meta">
                    <div className="dashboard-trip-meta-item">
                      <Calendar size={14} />
                      {format(new Date(trip.startDate), 'dd/MM/yyyy')}
                    </div>
                    <div className="dashboard-trip-meta-item">
                      <MapPin size={14} />
                      {locations.length} điểm đến
                    </div>
                  </div>
                </div>
              </Link>
            );
            }) : (
              <div className="card dashboard-empty-state">
                <MapIcon size={48} className="dashboard-empty-icon" />
                <h3 className="dashboard-empty-title">Bạn chưa có kế hoạch nào</h3>
                <p className="dashboard-empty-desc">Bắt đầu lên hành trình cho chuyến đi đầu tiên của bạn.</p>
                <Link to="/planner" className="btn btn-primary dashboard-empty-btn">Tạo kế hoạch</Link>
              </div>
            )}
          </div>
        </motion.section>

        {/* Trending Destinations */}
        <motion.section variants={item}>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Điểm đến nổi bật</h2>
            <Link to="/explore" className="dashboard-section-btn">Khám phá thêm</Link>
          </div>
          
          <div className="dashboard-trending-grid">
            {(hotLocations.length > 0 ? hotLocations : TRENDING_DESTINATIONS.slice(0, 4)).map((dest) => (
              <Link key={dest.id} to={`/planner?destination=${encodeURIComponent(dest.name)}`} className="card dashboard-trending-card">
                <img
                  src={dest.imageUrl || dest.image}
                  alt={dest.name}
                  className="dashboard-trending-img"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800';
                  }}
                />
                <div className="dashboard-trending-overlay">
                  <h3 className="dashboard-trending-title">{dest.name}</h3>
                  <div className="dashboard-trending-desc">{dest.planCount ?? dest.trips ?? 0}+ lượt lên kế hoạch</div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </Layout>
  );
};

export default Dashboard;
