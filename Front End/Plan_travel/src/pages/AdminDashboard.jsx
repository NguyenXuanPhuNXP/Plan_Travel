import React, { useEffect, useState } from 'react';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { Link } from 'react-router-dom';
import { Users, MapPin, Route, ArrowRight, Flame } from 'lucide-react';
import './Admin.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalPlans: 0, hotLocations: [] });

  useEffect(() => {
    adminService.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Tổng quan hệ thống, người dùng và các địa điểm đang được quan tâm.</p>
          </div>
          <Link to="/admin/places" className="btn btn-primary">
            Quản lý khám phá <ArrowRight size={16} />
          </Link>
        </div>

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
              {(stats.hotLocations || []).map((loc) => (
                <tr key={loc.id}>
                  <td><MapPin size={14} /> {loc.name}</td>
                  <td>{loc.region || loc.address || 'Chưa rõ'}</td>
                  <td>{loc.planCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
