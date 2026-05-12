import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
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
    name: user?.name || '',
    email: user?.email || '',
    bio: 'Professional traveler and explorer. Passionate about discovering new cultures and cuisines.'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    updateProfile({ name: formData.name, email: formData.email });
    setIsSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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
                  src={user?.avatar} 
                  alt={user?.name} 
                  className="profile-avatar-img"
                />
                <button className="profile-avatar-btn">
                  <Camera size={16} />
                </button>
              </div>
              <h2 className="profile-name">{user?.name}</h2>
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
                <label className="profile-label">Giới thiệu bản thân</label>
                <textarea
                  className="btn-outline profile-textarea"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>

              <div className="profile-form-footer">
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
