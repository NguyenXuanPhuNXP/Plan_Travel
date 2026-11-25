import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../utils/authRedirect';
import './Auth.css';

export default function Forbidden() {
  const { user } = useAuth();
  return <main className="auth-page" style={{ minHeight: '100vh' }}>
    <section className="auth-card" style={{ textAlign: 'center' }}>
      <ShieldX size={48} aria-hidden="true" />
      <h1>403 · Không có quyền truy cập</h1>
      <p>Tài khoản hiện tại không được phép sử dụng chức năng này.</p>
      <Link className="auth-submit" to={homeForRole(user?.role)}>Quay về khu vực của bạn</Link>
    </section>
  </main>;
}
