import React from 'react';
import Layout from '../Components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { TRENDING_DESTINATIONS } from '../utils/mockData';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Plus, 
  Clock, 
  Navigation,
  Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { trips } = useTrips();

  const upcomingTrip = trips.find(t => t.status === 'upcoming') || trips[0];

  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const getDaysLeft = (dateStr) => {
    try {
      if (!dateStr) return '';
      const diff = differenceInDays(new Date(dateStr), new Date());
      if (diff > 0) return `Còn ${diff} ngày nữa`;
      if (diff === 0) return 'Khởi hành hôm nay!';
      return 'Đã kết thúc';
    } catch {
      return '';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const getLocationsArray = (tripObj) => {
    if (!tripObj) return [];
    if (Array.isArray(tripObj.locations)) return tripObj.locations;
    if (Array.isArray(tripObj.items)) return tripObj.items;
    return [];
  };

  return (
    <Layout>
      <div className="dashboard-container">
        {/* Welcome Header */}
        <div className="dashboard-header">
          <div className="dashboard-welcome">
            <h1 className="dashboard-title">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'bạn'} 👋
            </h1>
            <p className="dashboard-subtitle">
              Khám phá các điểm đến và quản lý lịch trình cho chuyến đi tiếp theo của bạn.
            </p>
          </div>

          <Link to="/planner" className="btn btn-primary dashboard-new-trip-btn">
            <Plus size={18} />
            <span>Tạo kế hoạch mới</span>
          </Link>
        </div>

        {/* Featured Trip Card */}
        {upcomingTrip ? (
          <div className="dashboard-featured-hero">
            <div 
              className="dashboard-hero-bg"
              style={{
                backgroundImage: `url(${getLocationsArray(upcomingTrip)[0]?.image || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=1200'})`
              }}
            />
            <div className="dashboard-hero-overlay" />
            <div className="dashboard-hero-content">
              <div className="dashboard-hero-top">
                <span className="badge badge-gold">
                  CHUYẾN ĐI TIÊU ĐIỂM
                </span>
                <span className="dashboard-hero-countdown">
                  <Clock size={13} /> {getDaysLeft(upcomingTrip.startDate)}
                </span>
              </div>

              <div className="dashboard-hero-main">
                <h2 className="dashboard-hero-title">{upcomingTrip.title || upcomingTrip.name}</h2>
                <div className="dashboard-hero-meta">
                  <div className="dashboard-hero-meta-item">
                    <Calendar size={15} />
                    <span>
                      {upcomingTrip.startDate ? format(new Date(upcomingTrip.startDate), 'dd/MM/yyyy') : 'Chưa định ngày'} 
                      {upcomingTrip.endDate ? ` — ${format(new Date(upcomingTrip.endDate), 'dd/MM/yyyy')}` : ''}
                    </span>
                  </div>
                  <div className="dashboard-hero-meta-item">
                    <MapPin size={15} />
                    <span>{getLocationsArray(upcomingTrip).length} điểm đến</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-hero-actions">
                <Link to={`/trip/${upcomingTrip.id}`} className="btn btn-primary">
                  <span>Xem chi tiết</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-hero-empty">
            <div className="dashboard-hero-empty-content">
              <h2 className="dashboard-hero-empty-title">Bạn chưa có kế hoạch nào</h2>
              <p className="dashboard-hero-empty-desc">
                Bắt đầu tạo lịch trình và lựa chọn các điểm đến thú vị ngay hôm nay.
              </p>
              <Link to="/planner" className="btn btn-primary">
                <Plus size={18} /> Tạo kế hoạch đầu tiên
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats Strip */}
        <div className="dashboard-stats-strip">
          <div className="dashboard-stat-box">
            <div className="dashboard-stat-num">{trips.length}</div>
            <div className="dashboard-stat-name">Tổng chuyến đi</div>
          </div>
          <div className="dashboard-stat-divider" />
          <div className="dashboard-stat-box">
            <div className="dashboard-stat-num">
              {trips.reduce((acc, t) => acc + getLocationsArray(t).length, 0)}
            </div>
            <div className="dashboard-stat-name">Điểm đến đã lưu</div>
          </div>
          <div className="dashboard-stat-divider" />
          <div className="dashboard-stat-box">
            <div className="dashboard-stat-num">
              {trips.filter(t => t.status === 'completed').length}
            </div>
            <div className="dashboard-stat-name">Chuyến đi hoàn thành</div>
          </div>
        </div>

        {/* Recent Trips */}
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2 className="dashboard-section-title">Kế hoạch gần đây</h2>
              <p className="dashboard-section-subtitle">Danh sách các chuyến đi đã tạo</p>
            </div>
            <Link to="/history" className="dashboard-view-all">
              <span>Xem tất cả ({trips.length})</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="dashboard-trips-grid">
            {recentTrips.length > 0 ? (
              recentTrips.map((trip) => {
                const locs = getLocationsArray(trip);
                return (
                  <Link key={trip.id} to={`/trip/${trip.id}`} className="card dashboard-trip-postcard">
                    <div className="dashboard-postcard-img-box">
                      <img 
                        src={locs[0]?.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'} 
                        alt={trip.title || trip.name} 
                        className="dashboard-postcard-img"
                      />
                      <div className="dashboard-postcard-tag">
                        {trip.status === 'upcoming' ? 'Sắp tới' : (trip.status === 'ongoing' ? 'Đang đi' : 'Đã đi')}
                      </div>
                    </div>

                    <div className="dashboard-postcard-body">
                      <h3 className="dashboard-postcard-title">{trip.title || trip.name}</h3>
                      <div className="dashboard-postcard-meta">
                        <div className="dashboard-postcard-meta-line">
                          <Calendar size={14} className="dashboard-meta-icon" />
                          <span>{trip.startDate ? format(new Date(trip.startDate), 'dd/MM/yyyy') : 'Chưa định ngày'}</span>
                        </div>
                        <div className="dashboard-postcard-meta-line">
                          <Navigation size={14} className="dashboard-meta-icon" />
                          <span>{locs.length} điểm ghé thăm</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="dashboard-trips-empty card">
                <p>Chưa có chuyến đi nào được lưu. Bấm vào nút "Tạo kế hoạch mới" để bắt đầu.</p>
              </div>
            )}
          </div>
        </section>

        {/* Trending Destinations */}
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2 className="dashboard-section-title">Điểm đến nổi bật</h2>
              <p className="dashboard-section-subtitle">Các địa điểm du lịch phổ biến</p>
            </div>
          </div>

          <div className="dashboard-destinations-grid">
            {TRENDING_DESTINATIONS.map((dest) => (
              <div key={dest.id} className="dashboard-dest-card">
                <img src={dest.image} alt={dest.name} className="dashboard-dest-img" />
                <div className="dashboard-dest-overlay" />
                <div className="dashboard-dest-info">
                  <div className="dashboard-dest-tag">
                    <Flame size={12} /> {dest.trips}+ kế hoạch
                  </div>
                  <h3 className="dashboard-dest-name">{dest.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Dashboard;
