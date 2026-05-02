import React from 'react';
import { LogOut, User, Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="glass navbar-header">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          Travel<span className="navbar-brand-text">Plan</span>
        </Link>
        
        <div className="navbar-search-container">
          <Search size={18} className="navbar-search-icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm địa điểm..." 
            className="navbar-search-input"
          />
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-bell">
          <Bell size={20} />
          <span className="navbar-bell-badge"></span>
        </button>

        {user ? (
          <div className="navbar-user">
            <div className="navbar-user-info">
              <div className="navbar-user-name">{user.name}</div>
              <div className="navbar-user-role">Pro Traveler</div>
            </div>
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="navbar-user-avatar"
            />
            <button onClick={logout} className="btn-outline navbar-logout" title="Đăng xuất">
              <LogOut size={18} />
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
