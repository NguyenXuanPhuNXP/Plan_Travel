import React, { useRef, useEffect, useCallback, useState } from 'react';
import { LogOut, User, Bell, Search, MapPin, Sparkles, Loader2, Users, ChevronDown, Compass, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import { locationService } from '../../services/locationService';
import FriendModal from './FriendModal';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const userName = user?.fullName || user?.name || 'Lữ khách';
  const userAvatar = user?.avatarUrl || user?.avatar || '/avatars/traveler.svg';
  const [avatarSrc, setAvatarSrc] = useState(userAvatar);

  const userDropdownRef = useRef(null);
  const searchDropdownRef = useRef(null);

  useEffect(() => {
    setAvatarSrc(userAvatar);
  }, [userAvatar]);

  const handleClickOutside = useCallback((e) => {
    if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
      setShowUserDropdown(false);
    }
    if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          if (locationService?.searchDestinations) {
            const results = await locationService.searchDestinations(searchQuery, 5);
            setSearchResults(results);
          } else {
            // fallback search
            const all = await locationService.getAll();
            const filtered = (all || []).filter(l => l.name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
            setSearchResults(filtered);
          }
          setShowDropdown(true);
        } catch (err) {
          console.error('Search error:', err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (loc) => {
    setSearchQuery('');
    setShowDropdown(false);
    navigate(`/explore?q=${encodeURIComponent(loc.name)}`);
  };

  const handleOpenFriendModal = () => {
    setShowUserDropdown(false);
    setShowFriendModal(true);
  };

  const handleGoToProfile = () => {
    setShowUserDropdown(false);
    navigate('/profile');
  };

  const handleGoToAdmin = () => {
    setShowUserDropdown(false);
    navigate('/admin');
  };

  const handleLogout = () => {
    setShowUserDropdown(false);
    logout();
  };

  const isAdmin = user?.role === 1 || user?.role === 'admin';

  return (
    <>
      <header className="glass navbar-header">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <div className="navbar-brand-badge">
              <Compass size={20} />
            </div>
            <span className="navbar-brand-name">PlanTravel</span>
          </Link>

          <div className="navbar-search-container" ref={searchDropdownRef}>
            <Search size={16} className="navbar-search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm điểm đến..."
              className="navbar-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowDropdown(true)}
            />

            {showDropdown && (
              <div className="navbar-search-dropdown glass">
                {isSearching ? (
                  <div className="navbar-search-loading">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="navbar-search-results">
                    {searchResults.map(loc => (
                      <div
                        key={loc.id || loc.name}
                        className="navbar-search-item"
                        onClick={() => handleResultClick(loc)}
                      >
                        <MapPin size={14} className="navbar-search-item-icon" />
                        <div className="navbar-search-item-info">
                          <div className="navbar-search-item-name">{loc.name}</div>
                          <div className="navbar-search-item-region">{loc.region || loc.address || 'Việt Nam'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="navbar-search-no-results">
                    Không tìm thấy điểm đến phù hợp
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="navbar-right">
          {/* Notification Bell */}
          <Link to="/notifications" className="navbar-bell" title="Thông báo">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="navbar-bell-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="navbar-user" ref={userDropdownRef}>
              <div
                className="navbar-user-trigger"
                onClick={() => setShowUserDropdown(prev => !prev)}
              >
                <div className="navbar-user-info">
                  <div className="navbar-user-name">{userName}</div>
                </div>
                <img
                  src={avatarSrc}
                  alt={userName}
                  className="navbar-user-avatar"
                  onError={() => setAvatarSrc('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200')}
                />
                <ChevronDown size={15} className={`navbar-chevron ${showUserDropdown ? 'open' : ''}`} />
              </div>

              {showUserDropdown && (
                <div className="navbar-user-dropdown glass">
                  <div className="navbar-user-dropdown-item" onClick={handleGoToProfile}>
                    <User size={15} /> <span>Trang cá nhân</span>
                  </div>
                  <div className="navbar-user-dropdown-item" onClick={handleOpenFriendModal}>
                    <Users size={15} /> <span>Bạn bè & Lời mời</span>
                  </div>
                  {isAdmin && (
                    <div className="navbar-user-dropdown-item" onClick={handleGoToAdmin}>
                      <Shield size={15} /> <span>Quản trị hệ thống</span>
                    </div>
                  )}
                  <div className="navbar-user-dropdown-divider" />
                  <div className="navbar-user-dropdown-item navbar-user-dropdown-logout" onClick={handleLogout}>
                    <LogOut size={15} /> <span>Đăng xuất</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="btn btn-outline">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary">Đăng ký</Link>
            </div>
          )}
        </div>
      </header>

      {/* Friend & Group Modal */}
      <FriendModal isOpen={showFriendModal} onClose={() => setShowFriendModal(false)} />
    </>
  );
};

export default Navbar;
