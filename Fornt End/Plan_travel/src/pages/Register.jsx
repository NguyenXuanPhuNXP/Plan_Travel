import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import './Auth.css';

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
  const { register } = useAuth();
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
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card shadow-lg auth-card auth-card-wide" 
      >
        <div className="auth-header">
          <h2 className="auth-title">Tạo tài khoản</h2>
          <p className="auth-subtitle">Bắt đầu lên kế hoạch cho những chuyến đi mơ ước</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">Họ và tên</label>
            <div className="auth-input-group">
              <User size={18} className="auth-icon" />
              <input
                name="name"
                type="text"
                required
                className="btn-outline auth-input"
                placeholder="Nguyễn Văn A"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="auth-label">Email</label>
            <div className="auth-input-group">
              <Mail size={18} className="auth-icon" />
              <input
                name="email"
                type="email"
                required
                className="btn-outline auth-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="auth-grid">
            <div>
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-group">
                <Lock size={18} className="auth-icon" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="btn-outline auth-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="auth-label">Xác nhận</label>
              <div className="auth-input-group">
                <Lock size={18} className="auth-icon" />
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="btn-outline auth-input"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="auth-checkbox-group">
            <input type="checkbox" id="show-pass" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
            <label htmlFor="show-pass" className="auth-checkbox-label">Hiện mật khẩu</label>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn btn-primary auth-submit-btn"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
              <>Đăng ký tài khoản <UserPlus size={18} /></>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">Đã có tài khoản? </span>
          <Link to="/login" className="auth-footer-link">Đăng nhập</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
