import React, { useEffect, useState } from 'react';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { Shield, UserCheck, UserX, History } from 'lucide-react';
import './Admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activity, setActivity] = useState([]);

  const loadUsers = async () => setUsers(await adminService.getUsers());

  useEffect(() => {
    loadUsers().catch(console.error);
  }, []);

  const updateUser = async (id, data) => {
    const updated = await adminService.updateUser(id, data);
    setUsers((prev) => prev.map((u) => String(u.id) === String(id) ? { ...u, ...updated } : u));
  };

  const openActivity = async (user) => {
    setSelectedUser(user);
    setActivity(await adminService.getUserActivity(user.id));
  };

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Quản lý User</h1>
            <p className="admin-subtitle">Xem tài khoản, khóa/mở khóa, phân quyền và lịch sử hoạt động.</p>
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
              {users.map((user) => (
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
                      <option value="admin">admin</option>
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
            </tbody>
          </table>
        </div>

        {selectedUser && (
          <div className="card admin-panel">
            <h2 className="admin-title" style={{ fontSize: '1.2rem' }}>
              <Shield size={18} /> Hoạt động của {selectedUser.fullName}
            </h2>
            <div className="admin-activity-list" style={{ marginTop: '1rem' }}>
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
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
