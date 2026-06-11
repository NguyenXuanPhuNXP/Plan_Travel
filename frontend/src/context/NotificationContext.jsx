import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useTrips } from './TripContext';
import { useAuth } from './AuthContext';
import '../pages/Notifications.css';

const NotificationContext = createContext();
const STORAGE_KEY = 'travel_notifications';
const ENABLED_KEY = 'travel_notifications_enabled';

const readStored = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const getDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const dayDiff = (target) => {
  const today = getDateOnly(new Date());
  const date = getDateOnly(target);
  if (!today || !date) return null;
  return Math.round((date - today) / 86400000);
};

export const NotificationProvider = ({ children }) => {
  const { trips } = useTrips();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(readStored);
  const [enabled, setEnabled] = useState(localStorage.getItem(ENABLED_KEY) !== 'false');
  const [toast, setToast] = useState(null);
  const seenUpdates = useRef(new Map());
  const seenCollaborators = useRef(new Map());
  const initialized = useRef(false);

  const pushNotification = (item, showPopup = true) => {
    setNotifications((prev) => {
      if (prev.some((n) => n.id === item.id)) return prev;
      const next = [{
        type: 'general',
        ...item,
        createdAt: new Date().toISOString(),
        read: false
      }, ...prev].slice(0, 80);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (enabled && showPopup) {
      setToast(item);
      setTimeout(() => setToast(null), 4200);
    }
  };

  useEffect(() => {
    localStorage.setItem(ENABLED_KEY, String(enabled));
  }, [enabled]);

  useEffect(() => {
    trips.forEach((trip) => {
      const diff = dayDiff(trip.startDate);
      if (diff === 1) {
        pushNotification({
          id: `trip_tomorrow_${trip.id}_${trip.startDate}`,
          type: 'reminder',
          title: `Ngày mai bạn có chuyến đi ${trip.endLocation || trip.destination || trip.title}`,
          message: 'Chuẩn bị hành lý nhẹ nhàng thôi, niềm vui để hệ thống nhắc giúp bạn.',
        });
      }
      if (diff === 0) {
        const firstStop = trip.locations?.[0]?.name;
        pushNotification({
          id: `trip_today_${trip.id}_${trip.startDate}`,
          type: 'reminder',
          title: `Hôm nay lên đường: ${trip.title}`,
          message: firstStop ? `8:00 AM — check-in tại ${firstStop}. Đừng quên mang áo mưa nhé.` : 'Đừng quên giấy tờ, sạc điện thoại và một tâm trạng thật vui.',
        });
      }

      const previousUpdatedAt = seenUpdates.current.get(String(trip.id));
      const ownerId = String(trip.userId || trip.owner?.id || '');
      const currentUserId = String(user?.id || '');
      const collaboratorIds = (trip.collaborators || [])
        .map((member) => String(member.userId || member.user?.id || ''))
        .filter(Boolean)
        .sort();
      const collaboratorSignature = collaboratorIds.join('|');
      const previousCollaborators = seenCollaborators.current.get(String(trip.id));

      if (initialized.current && currentUserId && ownerId && ownerId !== currentUserId && collaboratorIds.includes(currentUserId) && !previousCollaborators) {
        pushNotification({
          id: `group_joined_visible_${trip.id}_${currentUserId}`,
          type: 'group',
          title: `Bạn đã tham gia nhóm kế hoạch`,
          message: `"${trip.title || trip.name}" hiện nằm trong danh sách kế hoạch của bạn.`
        });
      }

      if (initialized.current && currentUserId && ownerId === currentUserId && previousCollaborators !== undefined && previousCollaborators !== collaboratorSignature) {
        pushNotification({
          id: `group_members_changed_${trip.id}_${Date.now()}`,
          type: 'group',
          title: `Nhóm kế hoạch vừa thay đổi`,
          message: `Danh sách thành viên của "${trip.title || trip.name}" đã được cập nhật.`
        });
      }

      if (initialized.current && previousUpdatedAt && previousUpdatedAt !== trip.updatedAt) {
        pushNotification({
          id: `plan_updated_${trip.id}_${trip.updatedAt}`,
          type: 'plan_update',
          title: `Kế hoạch "${trip.title}" vừa có thay đổi`,
          message: 'Có cập nhật mới trong lịch trình. Ghé xem lại để khỏi lỡ nhịp chuyến đi.',
        });
      }
      seenUpdates.current.set(String(trip.id), trip.updatedAt);
      seenCollaborators.current.set(String(trip.id), collaboratorSignature);
    });
    initialized.current = true;
  }, [trips, user?.id]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    enabled,
    setEnabled,
    pushNotification,
    markRead: (id) => {
      setNotifications((prev) => {
        const next = prev.map((n) => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    markAllRead: () => {
      setNotifications((prev) => {
        const next = prev.map((n) => ({ ...n, read: true }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    clearNotifications: () => {
      localStorage.removeItem(STORAGE_KEY);
      setNotifications([]);
    }
  }), [notifications, unreadCount, enabled]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {enabled && toast && (
        <div className="notification-toast">
          <div className="notification-toast-icon"><Bell size={18} /></div>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="notification-toast-close"><X size={16} /></button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
