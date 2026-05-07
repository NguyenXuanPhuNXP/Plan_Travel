import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  History, 
  User, 
  Settings, 
  PlusCircle,
  Compass,
  Sparkles,
  Bell
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển', path: '/', matchStartsWith: ['/'] },
    { key: 'planner-ai', icon: Sparkles, label: 'Lập kế hoạch (AI)', path: '/planner', matchStartsWith: ['/planner'] },
    { key: 'planner-manual', icon: MapIcon, label: 'Lập kế hoạch (Thủ công)', path: '/planner/map', matchStartsWith: ['/planner/map'] },
    { key: 'history', icon: History, label: 'Lịch sử chuyến đi', path: '/history', matchStartsWith: ['/history', '/trip'] },
    { key: 'explore', icon: Compass, label: 'Khám phá', path: '/explore', matchStartsWith: ['/explore'] },
  ];

  const profileItems = [
    { icon: User, label: 'Hồ sơ cá nhân', path: '/profile' },
    { icon: Bell, label: 'Thông báo', path: '/notifications' },
    { icon: Settings, label: 'Cài đặt', path: '/settings' },
  ];

  const isMenuItemActive = (item) => {
    const path = location.pathname;
    if (item.key === 'dashboard') return path === '/';
    if (item.key === 'planner-manual') return path === '/planner/map';
    if (item.key === 'planner-ai') return path === '/planner';
    return item.matchStartsWith?.some((prefix) => path.startsWith(prefix));
  };

  return (
    <aside className="sidebar-container">
      <div>
        <div className="sidebar-section-title">
          Menu chính
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = isMenuItemActive(item);

            return (
            <NavLink
              key={item.key}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-section-title">
          Tài khoản
        </div>
        <nav className="sidebar-nav">
          {profileItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="card sidebar-cta-card">
        <h4 className="sidebar-cta-title">Sẵn sàng đi?</h4>
        <p className="sidebar-cta-text">Bắt đầu tạo kế hoạch cho chuyến đi tiếp theo của bạn ngay bây giờ.</p>
        <NavLink to="/planner" className="btn sidebar-cta-btn">
          <PlusCircle size={18} /> Tạo mới
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
