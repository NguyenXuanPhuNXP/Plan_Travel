import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      const isAdmin = user?.role === 1 || user?.role === 'admin';
      const redirect = searchParams.get('redirect');
      navigate(redirect || (isAdmin ? '/admin' : '/'));
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
        className="card shadow-lg auth-card" 
      >
        <div className="auth-header">
          <h2 className="auth-title">Chào mừng trở lại</h2>
          <p className="auth-subtitle">Đăng nhập để tiếp tục hành trình của bạn</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">Email</label>
            <div className="auth-input-group">
              <Mail size={18} className="auth-icon" />
              <input
                type="email"
                required
                className="btn-outline auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="auth-label">Mật khẩu</label>
            <div className="auth-input-group">
              <Lock size={18} className="auth-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="btn-outline auth-input auth-input-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-btn-toggle"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn btn-primary auth-submit-btn"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
              <>Đăng nhập <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">Chưa có tài khoản? </span>
          <Link to="/register" className="auth-footer-link">Đăng ký ngay</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
