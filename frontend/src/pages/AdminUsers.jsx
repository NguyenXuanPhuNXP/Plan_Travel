import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { UserCheck, UserX, History } from 'lucide-react';
import './Admin.css';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);

  const loadUsers = async () => setUsers(await adminService.getUsers());

  useEffect(() => {
    loadUsers().catch(console.error);
  }, []);

  const visibleUsers = useMemo(
    () => users.filter((u) => String(u.role).toLowerCase() !== 'admin'),
    [users]
  );

  const updateUser = async (id, data) => {
    const updated = await adminService.updateUser(id, data);
    setUsers((prev) => prev.map((u) => String(u.id) === String(id) ? { ...u, ...updated } : u));
  };

  const openActivity = (user) => {
    navigate(`/admin/users/${user.id}/activity`);
  };

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Quản lý User</h1>
            <p className="admin-subtitle">Ẩn user role admin. Xem lịch sử hoạt động trên trang riêng.</p>
          </div>
        </div>

        <div className="card admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Trạng thái</th>
                <th>Số plan</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.fullName}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{user.email}</div>
                  </td>
                  <td>
                    <select
                      className="admin-select"
                      value={user.role}
                      onChange={(e) => updateUser(user.id, { role: e.target.value })}
                    >
                      <option value="user">user</option>
                      {/* <option value="admin">admin</option> */}
                    </select>
                  </td>
                  <td>
                    <span className={`admin-badge ${user.isActive ? 'ok' : 'warn'}`}>
                      {user.isActive ? <UserCheck size={13} /> : <UserX size={13} />}
                      {user.isActive ? 'Đang mở' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>{user.planCount}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => updateUser(user.id, { isActive: !user.isActive })}>
                        {user.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                      <button className="btn btn-outline" onClick={() => openActivity(user)}>
                        <History size={16} /> Lịch sử
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có user thường để hiển thị.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
