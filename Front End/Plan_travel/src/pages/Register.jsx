import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogo, GoogleSignInModal } from '../Components/Auth/GoogleSignInModal';
import './Auth.css';

const HERO_BG = 'https://images.unsplash.com/photo-1559592443-7f87a79f6528?auto=format&fit=crop&q=80&w=1600';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (account) => {
    setIsSubmitting(true);
    setError('');
    try {
      await loginWithGoogle(account);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Lỗi đăng ký Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* Left Column: Visual Showcase */}
      <div 
        className="auth-hero-panel" 
        style={{ backgroundImage: `url(${HERO_BG})` }}
      >
        <div className="auth-hero-overlay" />
        
        <div className="auth-hero-content">
          <div className="auth-brand-logo">
            <div className="auth-brand-icon">
              <Compass size={22} />
            </div>
            <span className="auth-brand-title">PlanTravel</span>
          </div>

          <div className="auth-hero-middle">
            <h2 className="auth-hero-heading">
              Khám phá và kết nối những điểm đến mơ ước
            </h2>
            <p className="auth-hero-desc">
              Tạo tài khoản miễn phí để lưu trữ và quản lý tất cả chuyến đi của bạn.
            </p>
          </div>

          <div className="auth-hero-footer">
            <span>© 2026 PlanTravel</span>
          </div>
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div className="auth-form-panel">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="auth-card-box"
        >
          <div className="auth-header">
            <h1 className="auth-title">Đăng ký tài khoản</h1>
            <p className="auth-subtitle">Bắt đầu lên lịch trình cho chuyến đi của bạn</p>
          </div>

          {error && (
            <div className="auth-error-banner">
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <div className="auth-social-wrap">
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              className="auth-google-btn"
            >
              <GoogleLogo />
              <span>Đăng ký bằng Google</span>
            </button>
          </div>

          <div className="auth-divider">
            <span>hoặc điền thông tin bên dưới</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Họ và tên</label>
              <div className="auth-input-wrapper">
                <User size={18} className="auth-field-icon" />
                <input
                  type="text"
                  name="name"
                  required
                  className="auth-input"
                  placeholder="Nguyễn Văn A"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-field-icon" />
                <input
                  type="email"
                  name="email"
                  required
                  className="auth-input"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Mật khẩu (tối thiểu 6 ký tự)</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  className="auth-input auth-input-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-toggle-pwd"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Xác nhận mật khẩu</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  className="auth-input auth-input-password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn btn-primary auth-submit-btn"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <span>Đăng ký</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Đã có tài khoản?
            <Link to="/login" className="auth-footer-link">
              Đăng nhập
            </Link>
          </div>
        </motion.div>
      </div>

      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleGoogleSuccess}
      />
    </div>
  );
};

export default Register;
