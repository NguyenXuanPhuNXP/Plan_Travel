import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  History, 
  User, 
  Settings, 
  PlusCircle,
  Compass
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Bảng điều khiển', path: '/' },
    { icon: MapIcon, label: 'Lập kế hoạch', path: '/planner' },
    { icon: History, label: 'Lịch sử chuyến đi', path: '/history' },
    { icon: Compass, label: 'Khám phá', path: '/explore' },
  ];

  const profileItems = [
    { icon: User, label: 'Hồ sơ cá nhân', path: '/profile' },
    { icon: Settings, label: 'Cài đặt', path: '/settings' },
  ];

  return (
    <aside className="sidebar-container">
      <div>
        <div className="sidebar-section-title">
          Menu chính
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
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
