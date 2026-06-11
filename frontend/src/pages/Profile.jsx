import React, { useEffect, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  User
} from 'lucide-react';
import './Profile.css';

const SAMPLE_AVATARS = [
  { id: 'traveler', src: '/avatars/traveler.svg', label: 'Traveler' },
  { id: 'coast', src: '/avatars/coast.svg', label: 'Coast' },
  { id: 'mountain', src: '/avatars/mountain.svg', label: 'Mountain' }
];

const DEFAULT_AVATAR = SAMPLE_AVATARS[0].src;

const useAvatarPreview = (avatarUrl) => {
  const [avatarSrc, setAvatarSrc] = useState(avatarUrl || DEFAULT_AVATAR);

  useEffect(() => {
    setAvatarSrc(avatarUrl || DEFAULT_AVATAR);
  }, [avatarUrl]);

  return [avatarSrc, () => setAvatarSrc(DEFAULT_AVATAR)];
};

const Profile = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: DEFAULT_AVATAR
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [avatarPreview, fallbackAvatarPreview] = useAvatarPreview(profileData.avatarUrl);

  useEffect(() => {
    setProfileData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatarUrl || DEFAULT_AVATAR
    });
  }, [user]);

  const showSuccess = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSavingProfile(true);
    try {
      await updateProfile(profileData);
      showSuccess('Đã cập nhật thông tin cá nhân.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSavingPassword(true);
    try {
      await changePassword(passwordData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Đã đổi mật khẩu.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <Layout>
      <div className="profile-container">
        <h1 className="profile-title">Hồ sơ cá nhân</h1>

        {errorMessage && <div className="profile-error">{errorMessage}</div>}

        <div className="profile-grid">
          <aside className="profile-sidebar">
            <div className="card profile-card-center">
              <div className="profile-avatar-container">
                <img
                  src={avatarPreview}
                  alt={profileData.fullName || 'Avatar'}
                  className="profile-avatar-img"
                  onError={fallbackAvatarPreview}
                />
              </div>
              <h2 className="profile-name">{profileData.fullName || 'Người dùng'}</h2>
              <p className="profile-member-since">{profileData.email || 'Chưa có email'}</p>

              <div className="profile-avatar-options" aria-label="Avatar mẫu">
                {SAMPLE_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    className={`profile-avatar-option ${profileData.avatarUrl === avatar.src ? 'active' : ''}`}
                    onClick={() => setProfileData((prev) => ({ ...prev, avatarUrl: avatar.src }))}
                    title={avatar.label}
                  >
                    <img src={avatar.src} alt="" />
                  </button>
                ))}
              </div>

              <button onClick={logout} className="btn btn-outline profile-logout-btn">
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          </aside>

          <div className="profile-main">
            <section className="card profile-edit-card">
              <h2 className="profile-edit-title">Thông tin cá nhân</h2>
              <form onSubmit={handleProfileSave} className="profile-form">
                <label className="profile-field">
                  <span className="profile-label">Tên hiển thị</span>
                  <span className="profile-input-group">
                    <User size={18} className="profile-icon" />
                    <input
                      type="text"
                      className="btn-outline profile-input"
                      value={profileData.fullName}
                      onChange={(event) => setProfileData((prev) => ({ ...prev, fullName: event.target.value }))}
                      required
                    />
                  </span>
                </label>

                <label className="profile-field">
                  <span className="profile-label">Email liên hệ</span>
                  <span className="profile-input-group">
                    <Mail size={18} className="profile-icon" />
                    <input
                      type="email"
                      className="btn-outline profile-input"
                      value={profileData.email}
                      onChange={(event) => setProfileData((prev) => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </span>
                </label>

                <label className="profile-field">
                  <span className="profile-label">Số điện thoại</span>
                  <span className="profile-input-group">
                    <Phone size={18} className="profile-icon" />
                    <input
                      type="tel"
                      className="btn-outline profile-input"
                      value={profileData.phone}
                      onChange={(event) => setProfileData((prev) => ({ ...prev, phone: event.target.value }))}
                    />
                  </span>
                </label>

                <div className="profile-form-footer">
                  <button type="submit" className="btn btn-primary profile-submit-btn" disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 size={18} className="animate-spin" /> : 'Lưu thông tin'}
                  </button>
                </div>
              </form>
            </section>

            <section className="card profile-edit-card">
              <h2 className="profile-edit-title">Đổi mật khẩu</h2>
              <form onSubmit={handlePasswordSave} className="profile-form">
                {[
                  ['currentPassword', 'Mật khẩu hiện tại'],
                  ['newPassword', 'Mật khẩu mới'],
                  ['confirmPassword', 'Xác nhận mật khẩu mới']
                ].map(([key, label]) => (
                  <label className="profile-field" key={key}>
                    <span className="profile-label">{label}</span>
                    <span className="profile-input-group">
                      <LockKeyhole size={18} className="profile-icon" />
                      <input
                        type="password"
                        className="btn-outline profile-input"
                        value={passwordData[key]}
                        onChange={(event) => setPasswordData((prev) => ({ ...prev, [key]: event.target.value }))}
                        minLength={key === 'currentPassword' ? undefined : 6}
                        required
                      />
                    </span>
                  </label>
                ))}

                <div className="profile-form-footer">
                  <button type="submit" className="btn btn-primary profile-submit-btn" disabled={isSavingPassword}>
                    {isSavingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="profile-toast"
            >
              <CheckCircle size={20} color="var(--secondary)" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Profile;
