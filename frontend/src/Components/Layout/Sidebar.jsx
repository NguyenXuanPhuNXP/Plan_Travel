import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Compass,
  Map as MapIcon,
  Sparkles,
  History,
  User,
  PlusCircle,
  CompassIcon,
  Shield,
  Newspaper,
  Store
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 1 || user?.role === 'admin';
  const isBusiness = user?.role === 2 || user?.role === 'business';

  const travelerItems = [
    { key: 'dashboard', icon: Compass, label: 'Bảng điều khiển', path: '/dashboard', matchStartsWith: ['/dashboard'] },
    { key: 'planner-manual', icon: MapIcon, label: 'Lập kế hoạch thủ công', path: '/planner/map', matchStartsWith: ['/planner/map', '/planner/manual'] },
    { key: 'planner-ai', icon: Sparkles, label: 'Lập kế hoạch (AI)', path: '/planner', matchStartsWith: ['/planner', '/ai-planner'] },
    { key: 'explore', icon: CompassIcon, label: 'Khám phá điểm đến', path: '/explore', matchStartsWith: ['/explore'] },
    { key: 'community', icon: Newspaper, label: 'Bản tin chuyến đi', path: '/community', matchStartsWith: ['/community'] },
    { key: 'history', icon: History, label: 'Danh sách chuyến đi', path: '/history', matchStartsWith: ['/history', '/trip'] },
  ];
  const menuItems = [
    ...(isBusiness || isAdmin ? [] : travelerItems),
    { key: 'business-places', icon: Store, label: 'Cơ sở du lịch', path: '/business/places', matchStartsWith: ['/business/places'] },
    ...(isBusiness ? [
      { key: 'business-dashboard', icon: Store, label: 'Tổng quan cơ sở', path: '/business', matchStartsWith: ['/business'] },
      { key: 'business-reviews', icon: Newspaper, label: 'Đánh giá và phản hồi', path: '/business/reviews', matchStartsWith: ['/business/reviews'] },
      { key: 'business-reports', icon: History, label: 'Báo cáo hoạt động', path: '/business/reports', matchStartsWith: ['/business/reports'] },
      { key: 'business-registration', icon: PlusCircle, label: 'Hồ sơ Business', path: '/business/registration', matchStartsWith: ['/business/registration'] },
    ] : []),
  ];

  const profileItems = [
    { icon: User, label: 'Hồ sơ cá nhân', path: '/profile' },
    { icon: Store, label: user?.role === 2 || user?.role === 'business' ? 'Quản lý cơ sở' : 'Đăng ký Business', path: user?.role === 2 || user?.role === 'business' ? '/business' : '/business/registration' },
  ];

  const isMenuItemActive = (item) => {
    const path = location.pathname;
    if (item.key === 'dashboard') return path === '/dashboard';
    if (item.key === 'business-dashboard') return path === '/business';
    if (item.key === 'business-reviews') return path === '/business/reviews';
    if (item.key === 'business-reports') return path === '/business/reports';
    if (item.key === 'business-registration') return path === '/business/registration' || path.endsWith('/edit');
    if (item.key === 'planner-manual') return path === '/planner/map' || path === '/planner/manual';
    if (item.key === 'planner-ai') return path === '/planner' || path === '/ai-planner';
    return item.matchStartsWith?.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  };

  return (
    <aside className="sidebar-container">
      <div className="sidebar-group">
        <div className="sidebar-section-title">Menu chính</div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = isMenuItemActive(item);
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon size={18} className="sidebar-link-icon" />
                <span>{item.label}</span>
                {item.key === 'planner-ai' && <span className="sidebar-ai-tag">AI</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-group">
        <div className="sidebar-section-title">Tài khoản & Kết nối</div>
        <nav className="sidebar-nav">
          {profileItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} className="sidebar-link-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {isAdmin && (
        <div className="sidebar-group">
          <div className="sidebar-section-title">Quản trị hệ thống</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/admin"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Shield size={18} className="sidebar-link-icon" style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600 }}>Admin Dashboard</span>
            </NavLink>
          </nav>
        </div>
      )}

      {!isBusiness && !isAdmin && <div className="sidebar-cta-card">
        <h4 className="sidebar-cta-title">Tạo kế hoạch mới</h4>
        <p className="sidebar-cta-text">Tự do lên kế hoạch thủ công chi tiết hoặc để AI gợi ý thông minh.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          <Link to="/planner/map" className="btn btn-primary sidebar-cta-btn">
            <PlusCircle size={16} /> Lập kế hoạch thủ công
          </Link>
          <Link to="/planner" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <Sparkles size={16} /> Lập kế hoạch (AI)
          </Link>
        </div>
      </div>}
      <a href="/images/credits.html" target="_blank" rel="noreferrer" className="sidebar-image-credits">Nguồn ảnh điểm đến</a>
    </aside>
  );
};

export default Sidebar;
