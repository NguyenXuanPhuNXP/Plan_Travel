import React, { useRef, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Shield,
  Camera,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  CheckCircle,
  Loader2
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || user?.avatar || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState('');
  const avatarInput = useRef(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    setError('');
    try {
      await updateProfile({ fullName: formData.name, email: formData.email, phone: formData.phone, avatarUrl: formData.avatarUrl });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally { setIsSaving(false); }
  };

  const sections = [
    { title: 'Cài đặt tài khoản', icon: Settings, items: ['Đổi mật khẩu', 'Xác thực 2 yếu tố', 'Quản lý thiết bị'] },
    { title: 'Thông báo', icon: Bell, items: ['Cài đặt email', 'Thông báo đẩy', 'Cập nhật tin tức'] },
    { title: 'Quyền riêng tư', icon: Shield, items: ['Chế độ riêng tư', 'Chia sẻ lịch trình', 'Dữ liệu cá nhân'] },
  ];

  return (
    <Layout>
      <div className="profile-container">
        <h1 className="profile-title">Hồ sơ người dùng</h1>

        <div className="profile-grid">
          {/* Avatar & Sidebar */}
          <div className="profile-sidebar">
            <div className="card profile-card-center">
              <div className="profile-avatar-container">
                <img
                  src={user?.avatarUrl || user?.avatar || '/avatars/traveler.svg'}
                  alt={user?.fullName || user?.name || 'Ảnh đại diện'}
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/avatars/traveler.svg'; }}
                  className="profile-avatar-img"
                />
                <button type="button" className="profile-avatar-btn" aria-label="Đổi ảnh đại diện" onClick={() => avatarInput.current?.focus()}>
                  <Camera size={16} />
                </button>
              </div>
              <h2 className="profile-name">{user?.fullName || user?.name}</h2>
              <p className="profile-member-since">Thành viên từ 2026</p>
              <button onClick={logout} className="btn btn-outline profile-logout-btn">
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>

            <div className="card profile-settings-card">
              {sections.map((section, idx) => (
                <div key={idx} className="profile-settings-section">
                  <div className="profile-settings-header">
                    <section.icon size={14} /> {section.title}
                  </div>
                  <div className="profile-settings-list">
                    {section.items.map((item, i) => (
                      <button key={i} className="profile-settings-item">
                        {item} <ChevronRight size={14} color="var(--text-muted)" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Form */}
          <div className="card profile-edit-card">
            <h3 className="profile-edit-title">Thông tin cá nhân</h3>

            <form onSubmit={handleSave} className="profile-form">
              {error && <p role="alert">{error}</p>}
              <div>
                <label className="profile-label">Tên hiển thị</label>
                <div className="profile-input-group">
                  <User size={18} className="profile-icon" />
                  <input
                    type="text"
                    className="btn-outline profile-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="profile-label">Email liên hệ</label>
                <div className="profile-input-group">
                  <Mail size={18} className="profile-icon" />
                  <input
                    type="email"
                    className="btn-outline profile-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="profile-label">Số điện thoại</label>
                <input
                  type="tel"
                  maxLength={20}
                  className="btn-outline profile-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="profile-form-footer">
                <label className="profile-label">Ảnh đại diện (URL)
                  <input ref={avatarInput} type="url" maxLength={500} className="btn-outline profile-input" value={formData.avatarUrl} onChange={event => setFormData({ ...formData, avatarUrl: event.target.value })} />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary profile-submit-btn"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Success Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="profile-toast"
            >
              <CheckCircle size={20} color="var(--secondary)" />
              Đã cập nhật thông tin thành công!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Profile;
