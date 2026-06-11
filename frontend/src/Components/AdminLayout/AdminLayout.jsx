import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { BarChart3, Users, Home, LogOut, Shield, MapPinned } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const name = user?.fullName || user?.name || 'Admin';

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
    { to: '/admin/users', label: 'Quản lý User', icon: Users },
    { to: '/admin/places', label: 'Quản lý địa điểm', icon: MapPinned },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-shell-sidebar">
        <Link to="/admin" className="admin-shell-brand">
          <span className="admin-shell-brand-mark"><Shield size={19} /></span>
          TravelPlan Admin
        </Link>

        <div>
          <div className="admin-shell-section">Quản trị</div>
          <nav className="admin-shell-nav" style={{ marginTop: '0.75rem' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `admin-shell-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="admin-shell-spacer" />

        <Link to="/" className="btn btn-outline admin-shell-back">
          <Home size={16} /> Về trang chính
        </Link>
      </aside>

      <main className="admin-shell-main">
        <header className="admin-shell-topbar">
          <div>
            <div className="admin-shell-topbar-title">Admin Console</div>
            <div style={{ color: '#667085', fontSize: '0.85rem' }}>Không gian quản trị tách biệt khỏi giao diện người dùng</div>
          </div>
          <div className="admin-shell-user">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800 }}>{name}</div>
              <div style={{ color: '#667085', fontSize: '0.82rem' }}>Administrator</div>
            </div>
            <div className="admin-shell-avatar">{name.charAt(0).toUpperCase()}</div>
            <button className="btn btn-outline" onClick={logout} title="Đăng xuất">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="admin-shell-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
