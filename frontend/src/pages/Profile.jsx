import React, { useRef, useState } from 'react';
import Layout from '../Components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Camera, Bell, LogOut, CheckCircle, Loader2, LockKeyhole, X, Eye, EyeOff, Globe2, AtSign, Upload } from 'lucide-react';
import { authService } from '../services/authService';
import './Profile.css';

const AVATAR_OPTIONS = ['/avatars/traveler.svg', '/avatars/coast.svg', '/avatars/mountain.svg'];

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const { enabled, setEnabled, emailEnabled, setEmailEnabled } = useNotifications();
  const [formData, setFormData] = useState({ name: user?.fullName || user?.name || '', email: user?.email || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || user?.avatar || '/avatars/traveler.svg' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const avatarInput = useRef(null);

  const showSuccess = () => { setShowToast(true); window.setTimeout(() => setShowToast(false), 3000); };

  const handleSave = async (event) => {
    event.preventDefault(); setIsSaving(true); setError('');
    try { await updateProfile({ fullName: formData.name, email: formData.email, phone: formData.phone, avatarUrl: formData.avatarUrl }); showSuccess(); }
    catch (err) { setError(err.response?.data?.message || err.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.'); }
    finally { setIsSaving(false); }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault(); setIsChangingPassword(true); setPasswordError('');
    try { await authService.changePassword(passwordForm); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setShowPasswordModal(false); showSuccess(); }
    catch (err) { setPasswordError(err.response?.data?.message || err.message || 'Không thể đổi mật khẩu.'); }
    finally { setIsChangingPassword(false); }
  };

  const handleAvatarFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFormData((current) => ({ ...current, avatarUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handlePreferenceChange = async (preference, value) => {
    const nextInApp = preference === 'inApp' ? value : enabled;
    const nextByEmail = preference === 'byEmail' ? value : emailEnabled;
    if (preference === 'inApp') setEnabled(value);
    else setEmailEnabled(value);
    try {
      await updateProfile({ notifyInApp: nextInApp, notifyByEmail: nextByEmail });
    } catch (err) {
      if (preference === 'inApp') setEnabled(!value);
      else setEmailEnabled(!value);
      setError(err.response?.data?.message || 'Không thể lưu tùy chọn thông báo.');
    }
  };

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-heading"><div><p className="profile-eyebrow">Không gian cá nhân</p><h1 className="profile-title">Hồ sơ & cài đặt</h1><p className="profile-subtitle">Quản lý thông tin, bảo mật và cách bạn nhận cập nhật chuyến đi.</p></div><div className="profile-status"><span /> Tài khoản đang hoạt động</div></div>
        <div className="profile-grid">
          <aside className="profile-sidebar">
            <div className="card profile-card-center"><div className="profile-avatar-container"><img src={formData.avatarUrl || '/avatars/traveler.svg'} alt="Ảnh đại diện" className="profile-avatar-img" onError={(event) => { event.currentTarget.src = '/avatars/traveler.svg'; }} /><button type="button" className="profile-avatar-btn" aria-label="Chọn ảnh đại diện" onClick={() => avatarInput.current?.click()}><Camera size={16} /></button></div><h2 className="profile-name">{formData.name || 'Người dùng PlanTravel'}</h2><p className="profile-member-since">Sẵn sàng cho hành trình tiếp theo</p><button onClick={logout} className="btn btn-outline profile-logout-btn"><LogOut size={16} /> Đăng xuất</button></div>
          </aside>
          <main className="profile-main">
            <section className="card profile-settings-shell">
            <section className="profile-edit-section"><div className="profile-section-heading"><div><p className="profile-card-kicker">Thông tin cơ bản</p><h2>Thông tin cá nhân</h2></div><User size={22} /></div>
              <form onSubmit={handleSave} className="profile-form">{error && <p role="alert" className="profile-error">{error}</p>}<div className="profile-form-grid">
                <label className="profile-label">Tên hiển thị<div className="profile-input-group"><User size={18} className="profile-icon" /><input type="text" className="btn-outline profile-input" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required /></div></label>
                <label className="profile-label">Email liên hệ<div className="profile-input-group"><Mail size={18} className="profile-icon" /><input type="email" className="btn-outline profile-input" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required /></div></label>
                <label className="profile-label">Số điện thoại<input type="tel" maxLength={20} className="btn-outline profile-input" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} /></label>
                <div className="profile-label">Ảnh đại diện<input ref={avatarInput} type="file" accept="image/*" className="profile-file-input" onChange={handleAvatarFile} /><button type="button" className="btn btn-outline profile-upload-btn" onClick={() => avatarInput.current?.click()}><Upload size={16} /> Chọn ảnh từ máy</button><small className="profile-help-text">PNG, JPG hoặc WEBP</small></div>
              </div><div className="profile-avatar-options" aria-label="Ảnh đại diện có sẵn">{AVATAR_OPTIONS.map((avatar) => <button type="button" key={avatar} className={`profile-avatar-option ${formData.avatarUrl === avatar ? 'active' : ''}`} onClick={() => setFormData({ ...formData, avatarUrl: avatar })}><img src={avatar} alt="" /></button>)}</div><div className="profile-form-footer"><button type="submit" className="btn btn-primary profile-submit-btn" disabled={isSaving}>{isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Lưu thay đổi'}</button></div></form>
            </section>
            {user?.hasPassword !== false && <section className="profile-security-section"><div className="profile-section-heading"><div><p className="profile-card-kicker">Bảo mật</p><h2>Giữ tài khoản an toàn</h2></div><LockKeyhole size={22} /></div><div className="profile-security-row"><div><strong>Mật khẩu</strong><p>Đổi mật khẩu và xác thực bằng mật khẩu hiện tại.</p></div><button type="button" className="btn btn-outline" onClick={() => { setPasswordError(''); setShowPasswordModal(true); }}>Đổi mật khẩu</button></div></section>}
            <section id="profile-notifications" className="profile-notifications-section"><div className="profile-section-heading"><div><p className="profile-card-kicker">Thông báo</p><h2>Chọn cách nhận cập nhật</h2></div><Bell size={22} /></div><div className="notification-setting-row"><div className="notification-setting-icon web"><Globe2 size={18} /></div><div className="notification-setting-copy"><strong>Thông báo trong web</strong><p>Hiển thị nhắc nhở chuyến đi và hoạt động mới ngay trong PlanTravel.</p></div><label className="switch"><input type="checkbox" checked={enabled} onChange={(event) => handlePreferenceChange('inApp', event.target.checked)} /><span /></label></div><div className="notification-setting-row"><div className="notification-setting-icon mail"><AtSign size={18} /></div><div className="notification-setting-copy"><strong>Thông báo qua email</strong><p>Nhận các cập nhật quan trọng về lời mời và lịch trình qua email.</p></div><label className="switch"><input type="checkbox" checked={emailEnabled} onChange={(event) => handlePreferenceChange('byEmail', event.target.checked)} /><span /></label></div></section>
            </section>
          </main>
        </div>
        <AnimatePresence>{showToast && <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="profile-toast"><CheckCircle size={20} /> Đã lưu thay đổi thành công.</motion.div>}</AnimatePresence>
        {showPasswordModal && <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPasswordModal(false); }}><div className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="password-modal-title"><button type="button" className="profile-modal-close" onClick={() => setShowPasswordModal(false)} aria-label="Đóng"><X size={18} /></button><p className="profile-card-kicker">Xác thực tài khoản</p><h2 id="password-modal-title">Đổi mật khẩu</h2><p className="profile-modal-copy">Nhập mật khẩu hiện tại để xác nhận thay đổi bảo mật.</p><form onSubmit={handlePasswordChange} className="password-form">{passwordError && <p role="alert" className="profile-error">{passwordError}</p>}<label className="profile-label">Mật khẩu hiện tại<div className="password-input"><input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /><LockKeyhole size={16} /></div></label><label className="profile-label">Mật khẩu mới<div className="password-input"><input type={showPassword ? 'text' : 'password'} minLength={6} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label><label className="profile-label">Nhập lại mật khẩu mới<div className="password-input"><input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /><LockKeyhole size={16} /></div></label><button type="submit" className="btn btn-primary profile-submit-btn" disabled={isChangingPassword}>{isChangingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Xác nhận đổi mật khẩu'}</button></form></div></div>}
      </div>
    </Layout>
  );
};

export default Profile;
