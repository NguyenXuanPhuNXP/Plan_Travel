import React from 'react';
import Layout from '../components/Layout/Layout';
import { Bell, CalendarClock, RefreshCw, Trash2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import './Notifications.css';

const Notifications = () => {
  const {
    notifications,
    enabled,
    setEnabled,
    markAllRead,
    clearNotifications
  } = useNotifications();

  return (
    <Layout>
      <div className="notifications-page">
        <div className="card notifications-header">
          <div>
            <h1 className="notifications-title"><Bell size={24} /> Thông báo</h1>
            <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              Nhắc chuyến đi sắp tới và các thay đổi trong kế hoạch.
            </p>
          </div>
          <div className="notifications-actions">
            <label className="notification-toggle">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Bật thông báo nổi
            </label>
            <button className="btn btn-outline" onClick={markAllRead}>Đánh dấu đã đọc</button>
            <button className="btn btn-outline" onClick={clearNotifications}><Trash2 size={16} /> Xóa</button>
          </div>
        </div>

        <div className="notification-list">
          {notifications.map((item) => (
            <div className={`notification-item ${item.read ? '' : 'unread'}`} key={item.id}>
              <div className="notification-icon">
                {item.type === 'plan_update' ? <RefreshCw size={18} /> : <CalendarClock size={18} />}
              </div>
              <div>
                <h3 className="notification-title">{item.title}</h3>
                <p className="notification-message">{item.message}</p>
                <div className="notification-time">{new Date(item.createdAt).toLocaleString('vi-VN')}</div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="card">
              <p style={{ color: 'var(--text-muted)' }}>
                Chưa có thông báo mới. Khi có lịch sắp diễn ra hoặc kế hoạch thay đổi, mọi thứ sẽ nằm ở đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
