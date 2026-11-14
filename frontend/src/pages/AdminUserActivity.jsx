import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { ArrowLeft, Shield } from 'lucide-react';
import './Admin.css';

const AdminUserActivity = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const allUsers = await adminService.getUsers();
      const normalUsers = (allUsers || []).filter((u) => String(u.role).toLowerCase() !== 'admin');
      setUsers(normalUsers);
      const found = normalUsers.find((u) => String(u.id) === String(id));
      if (!found) {
        setErrorMessage('Không tìm thấy user hoặc user là admin.');
        return;
      }
      setSelectedUser(found);
      const userActivity = await adminService.getUserActivity(found.id);
      setActivity(Array.isArray(userActivity) ? userActivity : []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải lịch sử hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Lịch sử hoạt động user</h1>
            <p className="admin-subtitle">Trang riêng hiển thị lịch sử hoạt động của người dùng.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={() => navigate('/admin/users')}>
              <ArrowLeft size={16} /> Quay lại quản lý user
            </button>
          </div>
        </div>

        {errorMessage && <div className="admin-error-message">{errorMessage}</div>}
        {loading && <div className="admin-inline-status">Đang tải dữ liệu...</div>}

        {selectedUser && (
          <div className="card admin-panel">
            <h2 className="admin-title" style={{ fontSize: '1.2rem' }}>
              <Shield size={18} /> Hoạt động của {selectedUser.fullName}
            </h2>
            <div style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{selectedUser.email}</div>

            <div className="admin-activity-list" style={{ marginTop: '0.5rem' }}>
              {activity.map((item, idx) => (
                <div className="admin-activity-item" key={`${item.type}_${idx}`}>
                  <strong>{item.title}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {new Date(item.at).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p>Chưa có hoạt động.</p>}
            </div>
          </div>
        )}

        <div className="card admin-panel" style={{ marginTop: '1rem' }}>
          <h3 className="admin-title" style={{ fontSize: '1rem' }}>User thường khác</h3>
          <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.5rem' }}>
            {users.map((u) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <div>
                  <strong>{u.fullName}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{u.email}</div>
                </div>
                <Link className="btn btn-outline" to={`/admin/users/${u.id}/activity`}>Xem lịch sử</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserActivity;
