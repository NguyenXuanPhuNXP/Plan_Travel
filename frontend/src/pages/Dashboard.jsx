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
  Navigation
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays } from 'date-fns';
import './Dashboard.css';
import { tripStatusLabel } from '../utils/tripStatus';
import { destinationImage, handleImageError } from '../utils/destinationImages';

const Dashboard = () => {
  const { user } = useAuth();
  const { trips } = useTrips();

  const upcomingTrip = trips.find(t => t.status === 'generated') || trips.find(t => t.status === 'draft');

  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const getDaysLeft = (dateStr) => {
    try {
      if (!dateStr) return '';
      const diff = differenceInCalendarDays(new Date(dateStr), new Date());
      if (diff > 0) return `Còn ${diff} ngày nữa`;
      if (diff === 0) return 'Khởi hành hôm nay!';
      return 'Đã qua ngày khởi hành';
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
              {getGreeting()}, {(user?.fullName || user?.name)?.split(' ').at(-1) || 'bạn'}
            </h1>
            <p className="dashboard-subtitle">
              Khám phá các điểm đến và quản lý lịch trình cho chuyến đi tiếp theo của bạn.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link to="/planner/map" className="btn btn-primary dashboard-new-trip-btn">
              <MapPin size={18} />
              <span>Lập kế hoạch thủ công</span>
            </Link>
            <Link to="/planner" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fff' }}>
              <Plus size={18} />
              <span>Lập kế hoạch AI</span>
            </Link>
          </div>
        </div>

        {/* Featured Trip Card */}
        {upcomingTrip ? (
          <div className="dashboard-featured-hero">
            <img alt="" onError={handleImageError}
              className="dashboard-hero-bg"
              src={destinationImage(upcomingTrip.destination, getLocationsArray(upcomingTrip)[0]?.image)}
            />
            <div className="dashboard-hero-overlay" />
            <div className="dashboard-hero-content">
              <div className="dashboard-hero-top">
                <span className="dashboard-hero-status">{tripStatusLabel(upcomingTrip.status)}</span>
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
              <h2 className="dashboard-hero-empty-title">{trips.length ? 'Sẵn sàng cho hành trình tiếp theo?' : 'Bạn chưa có kế hoạch nào'}</h2>
              <p className="dashboard-hero-empty-desc">
                Bắt đầu tạo lịch trình và lựa chọn các điểm đến thú vị ngay hôm nay.
              </p>
              <div className="dashboard-empty-actions">
                <Link to="/planner/map" className="btn btn-primary">
                  <MapPin size={18} /> Lập kế hoạch thủ công
                </Link>
                <Link to="/planner" className="btn btn-outline">
                  <Plus size={18} /> Lập kế hoạch AI
                </Link>
              </div>
            </div>
            <Link to="/explore?q=H%E1%BB%99i%20An" className="dashboard-inspiration" aria-label="Khám phá Hội An">
              <img src={destinationImage('Hội An')} alt="Phố cổ Hội An" onError={handleImageError} />
              <span>Hội An, Việt Nam <ArrowRight size={20} /></span>
            </Link>
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
                        src={destinationImage(trip.destination, locs[0]?.image)}
                        onError={handleImageError} loading="lazy"
                        alt={trip.title || trip.name}
                        className="dashboard-postcard-img"
                      />
                      <div className="dashboard-postcard-tag">
                        {tripStatusLabel(trip.status)}
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
              <Link to={`/explore?q=${encodeURIComponent(dest.name)}`} key={dest.id} className="dashboard-dest-card">
                <img src={destinationImage(dest.name)} alt={dest.name} className="dashboard-dest-img" onError={handleImageError} loading="lazy" />
                <div className="dashboard-dest-overlay" />
                <div className="dashboard-dest-info">
                  <h3 className="dashboard-dest-name">{dest.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Dashboard;
