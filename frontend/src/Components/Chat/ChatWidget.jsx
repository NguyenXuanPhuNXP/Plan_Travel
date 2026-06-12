import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ChevronLeft, User, Users } from 'lucide-react';
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
  const [activeFriend, setActiveFriend] = useState(null); // The friend currently chatting with
  const [recentChats, setRecentChats] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const chatSnapshotRef = useRef(new Map());
  const initializedRef = useRef(false);
  const activeFriendRef = useRef(null);
  const isOpenRef = useRef(false);
  const pushNotificationRef = useRef(pushNotification);

  useEffect(() => {
    pushNotificationRef.current = pushNotification;
  }, [pushNotification]);

  useEffect(() => {
    activeFriendRef.current = activeFriend;
  }, [activeFriend]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Load friends and recent chats when widget is opened or periodically
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
        const [friendsData, chatsData] = await Promise.all([
          friendService.getFriends(),
          chatService.getRecentChats()
        ]);
        detectNewMessages(chatsData || []);
        setFriends(friendsData || []);
        setRecentChats(chatsData || []);

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

  // Load conversation messages when a friend is selected
  useEffect(() => {
    if (!activeFriend) return;

    const loadMessages = async () => {
      try {
        const msgs = await chatService.getMessages(activeFriend.id);
        setMessages(msgs || []);
        
        // Mark as read if any unread
        if (msgs.some(m => m.receiverId === String(user.id) && !m.isRead)) {
          await chatService.markAsRead(activeFriend.id);
          // Update total unread locally
          setRecentChats(prev => prev.map(c => 
            c.friendId === activeFriend.id ? { ...c, unreadCount: 0 } : c
          ));
          setTotalUnread(prev => Math.max(0, prev - msgs.filter(m => m.receiverId === String(user.id) && !m.isRead).length));
          chatService.getRecentChats()
            .then((chatsData) => setRecentChats(chatsData || []))
            .catch((error) => console.error("Failed to refresh recent chats:", error));
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    loadMessages();

    // Poll for conversation updates
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [activeFriend, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeFriend) return;

    const content = newMessage.trim();
    setNewMessage(''); // optimistic clear

    try {
      const msg = await chatService.sendMessage(activeFriend.id, content);
      setMessages(prev => [...prev, msg]);
      chatService.getRecentChats()
        .then((chatsData) => setRecentChats(chatsData || []))
        .catch((error) => console.error("Failed to refresh recent chats:", error));
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleOpenChat = (friend) => {
    setActiveFriend(friend);
  };

  const handleBackToList = () => {
    setActiveFriend(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveFriend(null);
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

  // Merge recent chats and friends to show a cohesive list
  const displayList = friends.map(f => {
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
    // Sort by unread first, then by last message time
    if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
    return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
  });

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
              {activeFriend ? (
                <>
                  <h3>
                    <button type="button" onClick={handleBackToList} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <ChevronLeft size={20} />
                    </button>
                    {activeFriend.name}
                  </h3>
                </>
              ) : (
                <h3><MessageCircle size={20} /> Tin nhắn</h3>
              )}
              <div className="chat-header-actions">
                <button type="button" onClick={handleClose} aria-label="Đóng tin nhắn"><X size={18} /></button>
              </div>
            </div>

            {/* Body */}
            {!activeFriend ? (
              <div className="chat-friend-list">
                {displayList.length > 0 ? (
                  displayList.map(friend => (
                    <button key={friend.id} type="button" className="chat-friend-item" onClick={() => handleOpenChat(friend)}>
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
                    <Users size={48} opacity={0.5} />
                    <p>Bạn chưa có bạn bè nào.<br/>Hãy thêm bạn bè để trò chuyện!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="chat-conversation">
                <div className="chat-messages">
                  {messages.length > 0 ? (
                    messages.map((msg, idx) => {
                      const isSent = msg.senderId === String(user.id);
                      return (
                        <div key={msg.id || idx} className={`chat-message-bubble ${isSent ? 'chat-message-sent' : 'chat-message-received'}`}>
                          {msg.content}
                          <div className="chat-message-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="chat-empty-state" style={{ padding: '16px' }}>
                      <p>Hãy gửi lời chào đến {activeFriend.name}!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <form className="chat-input-area" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder="Nhập tin nhắn..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <button type="submit" disabled={!newMessage.trim()}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button type="button" className="chat-widget-button" onClick={() => setIsOpen(true)} aria-label="Mở tin nhắn">
          <MessageCircle size={28} />
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
