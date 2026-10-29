import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Compass,
  Map as MapIcon,
  Sparkles,
  History,
  User,
  Bell,
  PlusCircle,
  CompassIcon,
  Shield
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const isAdmin = user?.role === 1 || user?.role === 'admin';

  const menuItems = [
    { key: 'dashboard', icon: Compass, label: 'Bảng điều khiển', path: '/', matchStartsWith: ['/'] },
    { key: 'planner-manual', icon: MapIcon, label: 'Lập kế hoạch thủ công', path: '/planner/map', matchStartsWith: ['/planner/map', '/planner/manual'] },
    { key: 'planner-ai', icon: Sparkles, label: 'Lập kế hoạch (AI)', path: '/planner', matchStartsWith: ['/planner', '/ai-planner'] },
    { key: 'explore', icon: CompassIcon, label: 'Khám phá điểm đến', path: '/explore', matchStartsWith: ['/explore'] },
    { key: 'history', icon: History, label: 'Lịch sử chuyến đi', path: '/history', matchStartsWith: ['/history', '/trip'] },
  ];

  const profileItems = [
    { icon: User, label: 'Hồ sơ cá nhân', path: '/profile' },
    { icon: Bell, label: 'Thông báo', path: '/notifications' },
  ];

  const isMenuItemActive = (item) => {
    const path = location.pathname;
    if (item.key === 'dashboard') return path === '/';
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
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="sidebar-notification-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
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

      <div className="sidebar-cta-card">
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
      </div>
    </aside>
  );
};

export default Sidebar;
