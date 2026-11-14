import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ChevronLeft, User, Users, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../../services/chatService';
import { friendService } from '../../services/friendService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import './ChatWidget.css';

const ChatWidget = () => {
  const { user } = useAuth();
  const { pushNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' | 'friends'
  const [activeFriend, setActiveFriend] = useState(null); // The friend currently chatting with (1-1)
  const [activeTrip, setActiveTrip] = useState(null); // The trip group currently chatting with
  const [recentChats, setRecentChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [tripGroups, setTripGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef(null);
  const chatSnapshotRef = useRef(new Map());
  const initializedRef = useRef(false);
  const activeFriendRef = useRef(null);
  const activeTripRef = useRef(null);
  const isOpenRef = useRef(false);
  const pushNotificationRef = useRef(pushNotification);

  useEffect(() => {
    pushNotificationRef.current = pushNotification;
  }, [pushNotification]);

  useEffect(() => {
    activeFriendRef.current = activeFriend;
  }, [activeFriend]);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Listen to open-trip-chat custom window event
  useEffect(() => {
    const handleOpenTripChat = async (e) => {
      const { itineraryId, tripName } = e.detail || {};
      if (!itineraryId) return;
      setIsOpen(true);
      setActiveTab('groups');
      setActiveFriend(null);

      try {
        const groups = await chatService.getTripGroups();
        setTripGroups(groups || []);
        const found = (groups || []).find(g => String(g.id) === String(itineraryId) || String(g.tripId) === String(itineraryId));
        if (found) {
          setActiveTrip(found);
        } else {
          setActiveTrip({
            id: String(itineraryId),
            tripId: String(itineraryId),
            name: tripName || 'Nhóm chuyến đi',
            memberCount: 2
          });
        }
      } catch (_err) {
        setActiveTrip({
          id: String(itineraryId),
          tripId: String(itineraryId),
          name: tripName || 'Nhóm chuyến đi',
          memberCount: 2
        });
      }
    };

    window.addEventListener('open-trip-chat', handleOpenTripChat);
    return () => window.removeEventListener('open-trip-chat', handleOpenTripChat);
  }, []);

  // Load friends, recent chats, and trip groups periodically
  useEffect(() => {
    if (!user) return;
    chatSnapshotRef.current = new Map();
    initializedRef.current = false;

    const detectNewMessages = (chatsData) => {
      const currentUserId = String(user.id);
      const nextSnapshot = new Map();

      (chatsData || []).forEach((chat) => {
        const friendId = String(chat.friendId);
        const lastMessageAt = chat.lastMessageAt ? new Date(chat.lastMessageAt).getTime() : 0;
        nextSnapshot.set(friendId, lastMessageAt);

        const previousAt = chatSnapshotRef.current.get(friendId) || 0;
        const isIncoming = String(chat.senderId || '') !== currentUserId;
        const isActiveConversation = isOpenRef.current && String(activeFriendRef.current?.id || '') === friendId;

        if (
          initializedRef.current &&
          chat.unreadCount > 0 &&
          isIncoming &&
          lastMessageAt > previousAt &&
          !isActiveConversation
        ) {
          pushNotificationRef.current({
            id: `message_${friendId}_${lastMessageAt}`,
            type: 'message',
            title: `Tin nhắn mới từ ${chat.friendName || 'Bạn bè'}`,
            message: chat.lastMessage || 'Bạn có một tin nhắn mới.',
            createdAt: chat.lastMessageAt || new Date().toISOString()
          });
        }
      });

      chatSnapshotRef.current = nextSnapshot;
      initializedRef.current = true;
    };

    const loadData = async () => {
      try {
        const [friendsData, chatsData, groupsData] = await Promise.all([
          friendService.getFriends().catch(() => []),
          chatService.getRecentChats().catch(() => []),
          chatService.getTripGroups().catch(() => [])
        ]);

        detectNewMessages(chatsData || []);
        setFriends(friendsData || []);
        setRecentChats(chatsData || []);
        setTripGroups(groupsData || []);

        const unread = (chatsData || []).reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setTotalUnread(unread);
      } catch (error) {
        console.error("Failed to load chat data:", error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Load 1-1 conversation messages when a friend is selected
  useEffect(() => {
    if (!activeFriend) return;

    const loadMessages = async () => {
      try {
        const msgs = await chatService.getMessages(activeFriend.id);
        setMessages(msgs || []);

        if (msgs.some(m => m.receiverId === String(user.id) && !m.isRead)) {
          await chatService.markAsRead(activeFriend.id);
          setRecentChats(prev => prev.map(c =>
            c.friendId === activeFriend.id ? { ...c, unreadCount: 0 } : c
          ));
          setTotalUnread(prev => Math.max(0, prev - msgs.filter(m => m.receiverId === String(user.id) && !m.isRead).length));
          chatService.getRecentChats()
            .then((chatsData) => setRecentChats(chatsData || []))
            .catch((error) => console.error("Failed to refresh recent chats:", error));
        }
      } catch (error) {
        console.error("Failed to load friend messages:", error);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [activeFriend, user]);

  // Load Trip Group conversation messages when a trip is selected
  useEffect(() => {
    if (!activeTrip) return;

    const loadGroupMessages = async () => {
      try {
        const tripId = activeTrip.tripId || activeTrip.id;
        const msgs = await chatService.getTripGroupMessages(tripId);
        setMessages(msgs || []);
      } catch (error) {
        console.error("Failed to load trip group messages:", error);
      }
    };

    loadGroupMessages();
    const interval = setInterval(loadGroupMessages, 3000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      if (activeFriend) {
        const msg = await chatService.sendMessage(activeFriend.id, content);
        setMessages(prev => [...prev, msg]);
        chatService.getRecentChats()
          .then((chatsData) => setRecentChats(chatsData || []))
          .catch(console.error);
      } else if (activeTrip) {
        const tripId = activeTrip.tripId || activeTrip.id;
        const msg = await chatService.sendTripGroupMessage(tripId, content);
        setMessages(prev => [...prev, msg]);
        chatService.getTripGroups()
          .then((groups) => setTripGroups(groups || []))
          .catch(console.error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleOpenFriendChat = (friend) => {
    setActiveTrip(null);
    setActiveFriend(friend);
  };

  const handleOpenTripChat = (trip) => {
    setActiveFriend(null);
    setActiveTrip(trip);
  };

  const handleBackToList = () => {
    setActiveFriend(null);
    setActiveTrip(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveFriend(null);
    setActiveTrip(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!user) return null;

  // Merge recent chats and friends
  const displayFriendList = friends.map(f => {
    const recent = recentChats.find(c => c.friendId === String(f.id));
    return {
      id: String(f.id),
      name: f.name,
      avatar: f.avatar,
      lastMessage: recent?.lastMessage || '',
      unreadCount: recent?.unreadCount || 0,
      lastMessageAt: recent?.lastMessageAt || 0
    };
  }).sort((a, b) => {
    if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
    return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
  });

  const isChatting = Boolean(activeFriend || activeTrip);

  return (
    <div className="chat-widget-container">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="chat-panel"
          >
            {/* Header */}
            <div className="chat-header">
              {isChatting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleBackToList}
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}
                    aria-label="Quay lại"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <div className="chat-header-title-box">
                    <h3>{activeTrip ? activeTrip.name : activeFriend.name}</h3>
                    <span className="chat-header-subtitle">
                      {activeTrip ? `${activeTrip.memberCount || 2} thành viên trong nhóm` : 'Đang trò chuyện trực tiếp'}
                    </span>
                  </div>
                </div>
              ) : (
                <h3><MessageCircle size={20} /> Tin nhắn & Nhóm lập kế hoạch</h3>
              )}
              <div className="chat-header-actions">
                <button type="button" onClick={handleClose} aria-label="Đóng tin nhắn"><X size={18} /></button>
              </div>
            </div>

            {/* Tabs (when not inside a conversation) */}
            {!isChatting && (
              <div className="chat-tabs">
                <button
                  type="button"
                  className={`chat-tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  <Users size={16} /> Nhóm chuyến đi
                  <span className="chat-tab-badge">{tripGroups.length}</span>
                </button>
                <button
                  type="button"
                  className={`chat-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                  onClick={() => setActiveTab('friends')}
                >
                  <User size={16} /> Bạn bè
                  {totalUnread > 0 && <span className="chat-tab-badge">{totalUnread}</span>}
                </button>
              </div>
            )}

            {/* Body */}
            {!isChatting ? (
              activeTab === 'groups' ? (
                /* Trip Groups List */
                <div className="chat-trip-list">
                  {tripGroups.length > 0 ? (
                    tripGroups.map(trip => (
                      <button
                        key={trip.id}
                        type="button"
                        className="chat-trip-item"
                        onClick={() => handleOpenTripChat(trip)}
                      >
                        <div className="chat-trip-avatar-icon">
                          <Users size={20} />
                        </div>
                        <div className="chat-trip-info">
                          <p className="chat-trip-name">{trip.name}</p>
                          <div className="chat-trip-meta">
                            <span className="chat-trip-members-badge">
                              {trip.memberCount || 2} thành viên
                            </span>
                            {trip.destination && (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>• {trip.destination}</span>
                            )}
                          </div>
                          {trip.lastMessage && (
                            <p className="chat-trip-last-message">
                              {trip.lastMessageSender ? `${trip.lastMessageSender}: ` : ''}{trip.lastMessage}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="chat-empty-state">
                      <Users size={44} opacity={0.4} />
                      <p>Chưa có nhóm chuyến đi nào.<br />Khi bạn tạo kế hoạch và thêm bạn bè, nhóm chat sẽ tự động xuất hiện tại đây!</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Friends List */
                <div className="chat-friend-list">
                  {displayFriendList.length > 0 ? (
                    displayFriendList.map(friend => (
                      <button
                        key={friend.id}
                        type="button"
                        className="chat-friend-item"
                        onClick={() => handleOpenFriendChat(friend)}
                      >
                        <img src={friend.avatar || '/avatars/traveler.svg'} alt={friend.name} className="chat-friend-avatar" />
                        <div className="chat-friend-info">
                          <p className="chat-friend-name">{friend.name}</p>
                          {friend.lastMessage && (
                            <p className="chat-friend-last-message">{friend.lastMessage}</p>
                          )}
                        </div>
                        {friend.unreadCount > 0 && (
                          <div className="chat-friend-unread">{friend.unreadCount}</div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="chat-empty-state">
                      <User size={44} opacity={0.4} />
                      <p>Bạn chưa có bạn bè nào.<br />Hãy kết bạn để cùng trò chuyện và lên kế hoạch!</p>
                    </div>
                  )}
                </div>
              )
            ) : (
              /* Conversation Messages */
              <div className="chat-conversation">
                <div className="chat-messages">
                  {messages.length > 0 ? (
                    messages.map((msg, idx) => {
                      const isSent = msg.senderId === String(user.id);
                      const isSystem = msg.content?.startsWith('[Hệ thống]');

                      if (isSystem) {
                        return (
                          <div key={msg.id || idx} className="chat-system-message">
                            {msg.content.replace('[Hệ thống]', '').trim()}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id || idx}
                          className={`chat-message-row ${isSent ? 'sent' : 'received'}`}
                        >
                          {!isSent && (
                            <img
                              src={msg.senderAvatar || '/avatars/traveler.svg'}
                              alt={msg.senderName || 'Thành viên'}
                              className="chat-message-avatar"
                            />
                          )}
                          <div className="chat-message-content-box">
                            {!isSent && activeTrip && msg.senderName && (
                              <span className="chat-message-sender-name">{msg.senderName}</span>
                            )}
                            <div className={`chat-message-bubble ${isSent ? 'chat-message-sent' : 'chat-message-received'}`}>
                              {msg.content}
                              <div className="chat-message-time">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="chat-empty-state" style={{ padding: '24px' }}>
                      <p>
                        {activeTrip
                          ? 'Chưa có tin nhắn trong nhóm. Hãy cùng bạn bè thảo luận kế hoạch chuyến đi nào!'
                          : `Hãy gửi lời chào đến ${activeFriend?.name}!`}
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder={activeTrip ? "Nhắn cho cả nhóm chuyến đi..." : "Nhập tin nhắn..."}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <button type="submit" disabled={!newMessage.trim()} aria-label="Gửi tin nhắn">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          type="button"
          className="chat-widget-button"
          onClick={() => setIsOpen(true)}
          aria-label="Mở tin nhắn"
        >
          <MessageCircle size={26} />
          {totalUnread > 0 && (
            <div className="chat-widget-badge">
              {totalUnread > 9 ? '9+' : totalUnread}
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
