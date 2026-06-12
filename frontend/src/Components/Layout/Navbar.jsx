import React, { useRef, useEffect, useCallback } from 'react';
import { LogOut, User, Bell, Search, MapPin, Sparkles, Loader2, Users, ChevronDown } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const [showFriendModal, setShowFriendModal] = React.useState(false);
  const userName = user?.fullName || user?.name || 'Người dùng';
  const userAvatar = user?.avatarUrl || user?.avatar || '/avatars/traveler.svg';
  const [avatarSrc, setAvatarSrc] = React.useState(userAvatar);

  const userDropdownRef = useRef(null);
  const searchDropdownRef = useRef(null);

  React.useEffect(() => {
    setAvatarSrc(userAvatar);
  }, [userAvatar]);

  // Close dropdowns when clicking outside
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

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const results = await locationService.searchDestinations(searchQuery, 5);
          setSearchResults(results);
          setShowDropdown(true);
        } catch (err) {
          console.error("Global search error:", err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (loc) => {
    setSearchQuery('');
    setShowDropdown(false);
    const params = new URLSearchParams({
      q: loc.name || searchQuery,
      locationId: String(loc.primaryLocationId || loc.locationId || loc.id),
      region: loc.region || loc.city || loc.province || loc.name || ''
    });
    navigate(`/explore?${params.toString()}`);
  };

  const handleOpenFriendModal = () => {
    setShowUserDropdown(false);
    setShowFriendModal(true);
  };

  const handleGoToProfile = () => {
    setShowUserDropdown(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setShowUserDropdown(false);
    logout();
  };

  return (
    <>
      <header className="glass navbar-header">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            Travel<span className="navbar-brand-text">Plan</span>
          </Link>

          <div className="navbar-search-container" ref={searchDropdownRef}>
            <Search size={18} className="navbar-search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm địa điểm..."
              className="navbar-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 2 && setShowDropdown(true)}
            />

            {/* Dropdown Results */}
            {showDropdown && (
              <div className="navbar-search-dropdown glass">
                {isSearching ? (
                  <div className="navbar-search-loading">
                    <Loader2 size={16} className="animate-spin" />
                    <span>AI đang tìm kiếm...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="navbar-search-results">
                    <div className="navbar-search-header">
                      <Sparkles size={12} />
                      Gợi ý thông minh
                    </div>
                    {searchResults.map(loc => (
                      <div
                        key={loc.id}
                        className="navbar-search-item"
                        onClick={() => handleResultClick(loc)}
                      >
                        <MapPin size={14} className="navbar-search-item-icon" />
                        <div className="navbar-search-item-info">
                          <div className="navbar-search-item-name">{loc.name}</div>
                          <div className="navbar-search-item-region">{loc.region || loc.city || loc.province}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="navbar-search-no-results">
                    Không tìm thấy địa điểm phù hợp
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="navbar-right">
          {/* <Link to="/notifications" className="navbar-bell" title="Thông báo">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="navbar-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </Link> */}

          {user ? (
            <div className="navbar-user" ref={userDropdownRef}>
              <div
                className="navbar-user-trigger"
                onClick={() => setShowUserDropdown(prev => !prev)}
              >
                <div className="navbar-user-info">
                  <div className="navbar-user-name">{userName}</div>
                  <div className="navbar-user-role">Pro Traveler</div>
                </div>
                <img
                  src={avatarSrc}
                  alt={userName}
                  className="navbar-user-avatar"
                  onError={() => setAvatarSrc('/avatars/traveler.svg')}
                />
                <ChevronDown size={16} className={`navbar-chevron ${showUserDropdown ? 'open' : ''}`} />
              </div>

              {showUserDropdown && (
                <div className="navbar-user-dropdown glass">
                  <div className="navbar-user-dropdown-item" onClick={handleGoToProfile}>
                    <User size={16} /> <span>Trang cá nhân</span>
                  </div>
                  <div className="navbar-user-dropdown-item" onClick={handleOpenFriendModal}>
                    <Users size={16} /> <span>Bạn bè & Lời mời</span>
                  </div>
                  <div className="navbar-user-dropdown-divider" />
                  <div className="navbar-user-dropdown-item navbar-user-dropdown-logout" onClick={handleLogout}>
                    <LogOut size={16} /> <span>Đăng xuất</span>
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

      {/* FriendModal rendered OUTSIDE header to avoid z-index conflicts */}
      <FriendModal isOpen={showFriendModal} onClose={() => setShowFriendModal(false)} />
    </>
  );
};

export default Navbar;
