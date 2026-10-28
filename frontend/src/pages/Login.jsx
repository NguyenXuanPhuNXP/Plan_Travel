import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogo, GoogleSignInModal } from '../Components/Auth/GoogleSignInModal';
import './Auth.css';

const HERO_BG = 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=1600';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công');
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
      setError(err.message || 'Lỗi đăng nhập Google');
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
              Lập kế hoạch và khám phá những điểm đến tuyệt vời
            </h2>
            <p className="auth-hero-desc">
              Tạo lịch trình du lịch thông minh, tối ưu cung đường và lưu lại các điểm đến đáng nhớ.
            </p>
          </div>

          <div className="auth-hero-footer">
            <span>© 2026 PlanTravel</span>
          </div>
        </div>
      </div>

      {/* Right Column: Clean Form */}
      <div className="auth-form-panel">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="auth-card-box"
        >
          <div className="auth-header">
            <h1 className="auth-title">Đăng nhập</h1>
            <p className="auth-subtitle">Chào mừng bạn quay trở lại với PlanTravel</p>
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
              <span>Tiếp tục với Google</span>
            </button>
          </div>

          <div className="auth-divider">
            <span>hoặc đăng nhập bằng email</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-field-icon" />
                <input
                  type="email"
                  required
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="auth-input auth-input-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="auth-form-aux">
              <label className="auth-remember-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Ghi nhớ</span>
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Bạn có thể sử dụng Đăng nhập bằng Google để vào tài khoản ngay.'); }} className="auth-forgot-link">
                Quên mật khẩu?
              </a>
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
                  <span>Đăng nhập</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Chưa có tài khoản?
            <Link to="/register" className="auth-footer-link">
              Đăng ký ngay
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

export default Login;
