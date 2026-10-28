import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, User, PlusCircle } from 'lucide-react';

export const GoogleLogo = () => (
  <svg className="btn-google-icon" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const MOCK_ACCOUNTS = [
  {
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    sub: 'google_user_10928374'
  },
  {
    name: 'Lê Hoàng Linh',
    email: 'linh.le@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    sub: 'google_user_99218274'
  }
];

export const GoogleSignInModal = ({ isOpen, onClose, onSelectAccount }) => {
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (account) => {
    onSelectAccount({
      ...account,
      authProvider: 'google',
      idToken: `mock-google-token-${Date.now()}`
    });
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail) return;
    const name = customEmail.split('@')[0].replace('.', ' ');
    handleSelect({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: customEmail,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
      sub: `google_user_${Date.now()}`
    });
  };

  return (
    <AnimatePresence>
      <div className="google-modal-backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          className="google-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="google-modal-header">
            <div className="google-modal-brand">
              <GoogleLogo />
              <div className="google-modal-brand-text">
                <span className="google-modal-title">Đăng nhập bằng Google</span>
                <span className="google-modal-subtitle">tiếp tục tới PlanTravel</span>
              </div>
            </div>
            <button onClick={onClose} className="google-modal-close">
              <X size={18} />
            </button>
          </div>

          <div className="google-modal-body">
            <div className="google-modal-desc">
              Chọn tài khoản Google:
            </div>

            <div className="google-accounts-list">
              {MOCK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  className="google-account-item"
                  onClick={() => handleSelect(acc)}
                >
                  <img src={acc.avatar} alt={acc.name} className="google-account-avatar" />
                  <div className="google-account-info">
                    <div className="google-account-name">{acc.name}</div>
                    <div className="google-account-email">{acc.email}</div>
                  </div>
                  <Check size={16} color="#10B981" />
                </button>
              ))}

              {!showCustomInput ? (
                <button
                  type="button"
                  className="google-account-item"
                  onClick={() => setShowCustomInput(true)}
                >
                  <div className="google-account-avatar-placeholder">
                    <User size={18} />
                  </div>
                  <div className="google-account-info">
                    <div className="google-account-name">Sử dụng tài khoản khác</div>
                    <div className="google-account-email">Nhập email Google của bạn</div>
                  </div>
                  <PlusCircle size={16} color="#6B7280" />
                </button>
              ) : (
                <form onSubmit={handleCustomSubmit} className="google-custom-form">
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    autoFocus
                    required
                    className="google-custom-input"
                  />
                  <div className="google-custom-actions">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="google-btn-cancel"
                    >
                      Hủy
                    </button>
                    <button type="submit" className="google-btn-confirm">
                      Tiếp tục
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="google-modal-footer">
              PlanTravel sẽ sử dụng tên, email và ảnh đại diện của bạn.
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
