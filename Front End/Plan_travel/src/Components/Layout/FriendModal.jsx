import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, UserPlus, Users, Check, Trash2, UserCheck } from 'lucide-react';
import { friendService } from '../../services/friendService';
import { useNotifications } from '../../context/NotificationContext';
import './FriendModal.css';

const FriendModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('friends'); // friends, add, requests
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { pushNotification } = useNotifications();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, notifData] = await Promise.all([
        friendService.getFriends(),
        friendService.getNotifications()
      ]);
      setFriends(friendsData || []);
      setRequests(notifData?.friendRequests || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách bạn bè:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'add' && searchQuery.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await friendService.searchUsers(searchQuery);
          setSearchResults(res || []);
        } catch (error) {
          console.error("Lỗi tìm kiếm user:", error);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, activeTab]);

  const handleAddFriend = async (userId, name) => {
    try {
      await friendService.sendFriendRequest(userId);
      pushNotification({ id: `add_${userId}`, title: "Thành công", message: `Đã gửi lời mời kết bạn đến ${name}` });
      // Update local state
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, requestStatus: 'sent' } : u));
    } catch (error) {
      pushNotification({ id: `err_${userId}`, title: "Lỗi", message: error.response?.data?.message || "Không thể gửi lời mời." });
    }
  };

  const handleAcceptRequest = async (userId, name) => {
    try {
      await friendService.acceptFriendRequest(userId);
      pushNotification({ id: `acc_${userId}`, title: "Thành công", message: `Đã chấp nhận kết bạn với ${name}` });
      loadData();
    } catch (error) {
      pushNotification({ id: `err_${userId}`, title: "Lỗi", message: "Lỗi khi chấp nhận." });
    }
  };

  const handleRejectRequest = async (userId) => {
    try {
      await friendService.rejectFriendRequest(userId);
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveFriend = async (userId) => {
    if (window.confirm("Bạn có chắc muốn hủy kết bạn?")) {
      try {
        await friendService.removeFriend(userId);
        loadData();
      } catch (error) {
        console.error(error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="friend-modal-overlay">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="friend-modal-card"
      >
        <div className="friend-modal-header">
          <h2 className="friend-modal-title"><Users size={20} /> Bạn bè</h2>
          <button onClick={onClose} className="friend-modal-close"><X size={20} /></button>
        </div>

        <div className="friend-modal-body">
          <div className="friend-tabs">
            <button className={`friend-tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
              Danh sách
            </button>
            <button className={`friend-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
              Lời mời {requests.length > 0 && <span className="friend-badge">{requests.length}</span>}
            </button>
            <button className={`friend-tab ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
              Tìm bạn
            </button>
          </div>

          {activeTab === 'friends' && (
            <div className="friend-list">
              {loading ? <p>Đang tải...</p> : friends.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Bạn chưa có người bạn nào.</p> : (
                friends.map(friend => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-item-info">
                      <img src={friend.avatar || '/avatars/traveler.svg'} alt={friend.name} className="friend-avatar" />
                      <div>
                        <div className="friend-name">{friend.name}</div>
                        <div className="friend-email">{friend.email}</div>
                      </div>
                    </div>
                    <div className="friend-actions">
                      <button className="btn btn-outline friend-btn" onClick={() => handleRemoveFriend(friend.id)} title="Hủy kết bạn">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="friend-list">
              {requests.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Không có lời mời nào.</p> : (
                requests.map(req => (
                  <div key={req.id} className="friend-item">
                    <div className="friend-item-info">
                      <img src={req.user.avatar || '/avatars/traveler.svg'} alt={req.user.name} className="friend-avatar" />
                      <div>
                        <div className="friend-name">{req.user.name}</div>
                        <div className="friend-email">Đã gửi lời mời cho bạn</div>
                      </div>
                    </div>
                    <div className="friend-actions">
                      <button className="btn btn-primary friend-btn" onClick={() => handleAcceptRequest(req.id, req.user.name)}>
                        <Check size={16} /> Đồng ý
                      </button>
                      <button className="btn btn-outline friend-btn" onClick={() => handleRejectRequest(req.id)}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <>
              <div className="friend-search-container">
                <Search size={18} className="friend-search-icon" />
                <input 
                  type="text" 
                  placeholder="Nhập email hoặc tên..." 
                  className="friend-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="friend-list">
                {searchResults.length === 0 && searchQuery.length > 2 && !loading ? (
                  <p style={{color: 'var(--text-muted)'}}>Không tìm thấy ai.</p>
                ) : (
                  searchResults.map(user => (
                    <div key={user.id} className="friend-item">
                      <div className="friend-item-info">
                        <img src={user.avatar || '/avatars/traveler.svg'} alt={user.name} className="friend-avatar" />
                        <div>
                          <div className="friend-name">{user.name}</div>
                          <div className="friend-email">{user.email}</div>
                        </div>
                      </div>
                      <div className="friend-actions">
                        {user.isFriend ? (
                          <span className="friend-email" style={{color: 'var(--primary)'}}><UserCheck size={16}/> Bạn bè</span>
                        ) : user.requestStatus === 'sent' ? (
                          <span className="friend-email" style={{color: 'var(--text-muted)'}}>Đã gửi yêu cầu</span>
                        ) : user.requestStatus === 'received' ? (
                          <button className="btn btn-primary friend-btn" onClick={() => handleAcceptRequest(user.id, user.name)}>
                            <Check size={16} /> Đồng ý
                          </button>
                        ) : (
                          <button className="btn btn-outline friend-btn" onClick={() => handleAddFriend(user.id, user.name)}>
                            <UserPlus size={16} /> Kết bạn
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
};

export default FriendModal;
