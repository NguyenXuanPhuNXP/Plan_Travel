import React, { useEffect, useState } from 'react';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { Link } from 'react-router-dom';
import { Users, MapPin, Route, ArrowRight, Flame, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import './Admin.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalPlans: 0, hotLocations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getStats();
      setStats(data || { totalUsers: 0, totalPlans: 0, hotLocations: [] });
    } catch (err) {
      console.error('Lỗi tải stats admin:', err);
      setError(err.response?.data?.message || 'Không thể kết nối đến máy chủ quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Tổng quan hệ thống, người dùng và các địa điểm đang được quan tâm.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-outline" onClick={fetchStats} disabled={loading} title="Làm mới dữ liệu">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
            </button>
            <Link to="/admin/places" className="btn btn-primary">
              Quản lý khám phá <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" color="var(--primary)" />
            <span>Đang tải số liệu hệ thống...</span>
          </div>
        ) : (
          <>
            <div className="admin-grid">
              <Link to="/admin/users" className="card admin-stat-card admin-stat-card-link">
                <div>
                  <div className="admin-stat-label">Tổng user</div>
                  <div className="admin-stat-value">{stats.totalUsers}</div>
                </div>
                <div className="admin-stat-icon"><Users size={22} /></div>
              </Link>
              <Link to="/admin/plans" className="card admin-stat-card admin-stat-card-link">
                <div>
                  <div className="admin-stat-label">Kế hoạch đã tạo</div>
                  <div className="admin-stat-value">{stats.totalPlans}</div>
                </div>
                <div className="admin-stat-icon"><Route size={22} /></div>
              </Link>
              <Link to="/admin/places" className="card admin-stat-card admin-stat-card-link">
                <div>
                  <div className="admin-stat-label">Địa điểm hot</div>
                  <div className="admin-stat-value">{stats.hotLocations?.length || 0}</div>
                </div>
                <div className="admin-stat-icon"><Flame size={22} /></div>
              </Link>
            </div>

            <div className="card admin-panel">
              <div className="admin-header" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h2 className="admin-title" style={{ fontSize: '1.25rem' }}>Địa điểm nổi bật</h2>
                  <p className="admin-subtitle">Dữ liệu này cũng được dùng cho khu vực khám phá/trang chính.</p>
                </div>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Địa điểm</th>
                    <th>Khu vực</th>
                    <th>Lượt dùng trong plan</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.hotLocations || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Chưa có dữ liệu địa điểm nổi bật.
                      </td>
                    </tr>
                  ) : (
                    (stats.hotLocations || []).map((loc) => (
                      <tr key={loc.id}>
                        <td><MapPin size={14} /> {loc.name}</td>
                        <td>{loc.region || loc.address || 'Chưa rõ'}</td>
                        <td>{loc.planCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
