import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Compass,
  Map as MapIcon,
  Sparkles,
  History,
  User,
  Bell,
  PlusCircle,
  CompassIcon
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const menuItems = [
    { key: 'dashboard', icon: Compass, label: 'Bảng điều khiển', path: '/', matchStartsWith: ['/'] },
    { key: 'planner-ai', icon: Sparkles, label: 'Lập kế hoạch (AI)', path: '/planner', matchStartsWith: ['/planner', '/ai-planner'] },
    { key: 'planner-manual', icon: MapIcon, label: 'Lập kế hoạch (Bản đồ)', path: '/planner/map', matchStartsWith: ['/planner/map'] },
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
    if (item.key === 'planner-manual') return path === '/planner/map';
    if (item.key === 'planner-ai') return path === '/planner' || path === '/ai-planner';
    return item.matchStartsWith?.some((prefix) => path.startsWith(prefix));
  };

  return (
    <aside className="sidebar-container">
      <div className="sidebar-group">
        <div className="sidebar-section-title">Menu chính</div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = isMenuItemActive(item);
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} className="sidebar-link-icon" />
                <span>{item.label}</span>
                {item.key === 'planner-ai' && <span className="sidebar-ai-tag">AI</span>}
              </NavLink>
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

      <div className="sidebar-cta-card">
        <h4 className="sidebar-cta-title">Tạo kế hoạch mới</h4>
        <p className="sidebar-cta-text">Lên lịch trình thông minh và đồng hành cùng bạn bè trên mọi chuyến đi.</p>
        <NavLink to="/planner" className="btn btn-primary sidebar-cta-btn">
          <PlusCircle size={16} /> Bắt đầu ngay
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
