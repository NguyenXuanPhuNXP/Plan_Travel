import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Compass, 
  Map as MapIcon, 
  Sparkles,
  History, 
  User, 
  PlusCircle
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { icon: Compass, label: 'Bảng điều khiển', path: '/' },
    { icon: MapIcon, label: 'Lập kế hoạch', path: '/planner' },
    { icon: Sparkles, label: 'Lập kế hoạch bằng AI', path: '/ai-planner', isAi: true },
    { icon: History, label: 'Lịch sử chuyến đi', path: '/history' },
  ];

  const profileItems = [
    { icon: User, label: 'Hồ sơ cá nhân', path: '/profile' },
  ];

  return (
    <aside className="sidebar-container">
      <div className="sidebar-group">
        <div className="sidebar-section-title">
          Menu
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} className="sidebar-link-icon" />
              <span>{item.label}</span>
              {item.isAi && <span className="sidebar-ai-tag">AI</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-group">
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
              <item.icon size={18} className="sidebar-link-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-cta-card">
        <h4 className="sidebar-cta-title">Tạo kế hoạch mới</h4>
        <p className="sidebar-cta-text">Tạo lịch trình và thêm các điểm dừng chân cho chuyến đi của bạn.</p>
        <NavLink to="/planner" className="btn btn-primary sidebar-cta-btn">
          <PlusCircle size={16} /> Bắt đầu ngay
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
