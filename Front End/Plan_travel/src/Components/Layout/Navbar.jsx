import React from 'react';
import { LogOut, Bell, Search, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="glass navbar-header">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-badge">
            <Compass size={20} />
          </div>
          <span className="navbar-brand-name">PlanTravel</span>
        </Link>
        
        <div className="navbar-search-container">
          <Search size={16} className="navbar-search-icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm điểm đến..." 
            className="navbar-search-input"
          />
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-bell" title="Thông báo">
          <Bell size={18} />
          <span className="navbar-bell-badge"></span>
        </button>

        {user ? (
          <div className="navbar-user">
            <div className="navbar-user-info">
              <div className="navbar-user-name">{user.name}</div>
            </div>
            <img 
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
              alt={user.name} 
              className="navbar-user-avatar"
            />
            <button onClick={logout} className="navbar-logout" title="Đăng xuất">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="navbar-auth">
            <Link to="/login" className="btn btn-outline">Đăng nhập</Link>
            <Link to="/register" className="btn btn-primary">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
