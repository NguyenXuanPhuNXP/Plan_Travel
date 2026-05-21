import React from 'react';
import { LogOut, User, Bell, Search, MapPin, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { locationService } from '../../services/locationService';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const userName = user?.fullName || user?.name || 'Người dùng';
  const userAvatar = user?.avatarUrl || user?.avatar || '/avatars/traveler.svg';
  const [avatarSrc, setAvatarSrc] = React.useState(userAvatar);

  React.useEffect(() => {
    setAvatarSrc(userAvatar);
  }, [userAvatar]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const results = await locationService.hybridSearch(searchQuery, 5);
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
    navigate(`/planner?destination=${encodeURIComponent(loc.name)}&locationId=${loc.id}&region=${encodeURIComponent(loc.region || '')}`);
  };

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
        <Link to="/notifications" className="navbar-bell" title="Thông báo">
          <Bell size={20} />
          <span className="navbar-bell-badge"></span>
        </Link>

        {user ? (
          <div className="navbar-user">
            <Link to="/profile" className="navbar-user-info">
              <div className="navbar-user-name">{userName}</div>
              <div className="navbar-user-role">Pro Traveler</div>
            </Link>
            <Link to="/profile">
              <img
                src={avatarSrc}
                alt={userName}
                className="navbar-user-avatar"
                onError={() => setAvatarSrc('/avatars/traveler.svg')}
              />
            </Link>
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
