import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { Calendar, Eye, RefreshCw, Route, Search, Trash2, Users } from 'lucide-react';
import './Admin.css';

const STATUS_LABELS = {
  draft: 'Sắp tới',
  generated: 'Đang đi',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const VISIBILITY_LABELS = {
  private: 'Riêng tư',
  shared: 'Nhóm',
  public: 'Công khai',
  public_edit: 'Công khai sửa'
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const getStatusClass = (status) => {
  if (status === 'completed') return 'ok';
  if (status === 'cancelled') return 'warn';
  return 'info';
};

const getVisibilityClass = (visibility) => {
  if (visibility === 'private') return 'muted';
  if (visibility === 'public' || visibility === 'public_edit') return 'ok';
  return 'info';
};

const AdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [visibility, setVisibility] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [total, setTotal] = useState(0);

  const loadPlans = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await adminService.getPlans({
        keyword: keyword.trim(),
        status,
        visibility,
        limit: 200,
        offset: 0
      });
      setPlans(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải danh sách kế hoạch.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const summary = useMemo(() => {
    const sharedCount = plans.filter((plan) => plan.visibility && plan.visibility !== 'private').length;
    const completedCount = plans.filter((plan) => plan.status === 'completed').length;
    return { sharedCount, completedCount };
  }, [plans]);

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Xóa kế hoạch này? Hành động này sẽ xóa cả lịch trình chi tiết.')) return;
    setErrorMessage('');
    try {
      await adminService.deletePlan(id);
      setPlans((prev) => prev.filter((plan) => String(plan.id) !== String(id)));
      setSelectedPlan((prev) => prev && String(prev.id) === String(id) ? null : prev);
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể xóa kế hoạch.');
    }
  };

  const handleOpenPlan = async (id) => {
    setErrorMessage('');
    setDetailLoadingId(id);
    try {
      const detail = await adminService.getPlanById(id);
      setSelectedPlan(detail);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải chi tiết kế hoạch.');
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Quản lý kế hoạch</h1>
            <p className="admin-subtitle">Theo dõi các kế hoạch do user tạo, trạng thái chia sẻ và dữ liệu lịch trình.</p>
          </div>
          <button className="btn btn-outline" onClick={loadPlans}>
            <RefreshCw size={16} /> Tải lại
          </button>
        </div>

        {errorMessage && <div className="admin-error-message">{errorMessage}</div>}

        <div className="admin-grid">
          <div className="card admin-stat-card admin-stat-card-compact">
            <div>
              <div className="admin-stat-label">Tổng kế hoạch</div>
              <div className="admin-stat-value">{total}</div>
            </div>
            <div className="admin-stat-icon"><Route size={22} /></div>
          </div>
          <div className="card admin-stat-card admin-stat-card-compact">
            <div>
              <div className="admin-stat-label">Có chia sẻ</div>
              <div className="admin-stat-value">{summary.sharedCount}</div>
            </div>
            <div className="admin-stat-icon"><Users size={22} /></div>
          </div>
          <div className="card admin-stat-card admin-stat-card-compact">
            <div>
              <div className="admin-stat-label">Hoàn thành</div>
              <div className="admin-stat-value">{summary.completedCount}</div>
            </div>
            <div className="admin-stat-icon"><Calendar size={22} /></div>
          </div>
        </div>

        <div className="card admin-panel">
          <div className="admin-filters">
            <div className="admin-search-field">
              <Search size={16} />
              <input
                className="admin-input"
                placeholder="Tìm tên kế hoạch, user, email, điểm đến..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') loadPlans();
                }}
              />
            </div>
            <select className="admin-select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className="admin-select" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
              <option value="">Tất cả chia sẻ</option>
              {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={loadPlans}>Lọc</button>
          </div>
        </div>

        <div className="card admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kế hoạch</th>
                <th>Người tạo</th>
                <th>Trạng thái</th>
                <th>Chia sẻ</th>
                <th>Dữ liệu</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <strong>{plan.name || 'Kế hoạch chưa đặt tên'}</strong>
                    <div className="admin-muted-line">{plan.destination || plan.endLocation || plan.startLocation || '-'}</div>
                  </td>
                  <td>
                    <strong>{plan.owner?.fullName || 'Không rõ'}</strong>
                    <div className="admin-muted-line">{plan.owner?.email || '-'}</div>
                  </td>
                  <td>
                    <span className={`admin-badge ${getStatusClass(plan.status)}`}>
                      {STATUS_LABELS[plan.status] || plan.status || '-'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${getVisibilityClass(plan.visibility)}`}>
                      {VISIBILITY_LABELS[plan.visibility] || plan.visibility || '-'}
                    </span>
                  </td>
                  <td>
                    <div>{plan.itemCount || 0} điểm dừng</div>
                    <div className="admin-muted-line">{plan.collaboratorCount || 0} thành viên</div>
                  </td>
                  <td>{formatDate(plan.updatedAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => handleOpenPlan(plan.id)} disabled={detailLoadingId === plan.id}>
                        <Eye size={16} /> {detailLoadingId === plan.id ? 'Đang mở...' : 'Xem'}
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeletePlan(plan.id)}>
                        <Trash2 size={16} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && plans.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có kế hoạch nào phù hợp.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải kế hoạch...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedPlan && (
          <div className="admin-modal-overlay" onClick={() => setSelectedPlan(null)}>
            <div className="card admin-modal-card admin-plan-detail" onClick={(event) => event.stopPropagation()}>
              <div className="admin-header" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h2 className="admin-title" style={{ fontSize: '1.2rem' }}>{selectedPlan.name || 'Chi tiết kế hoạch'}</h2>
                  <p className="admin-subtitle">
                    Người tạo: {selectedPlan.owner?.fullName || '-'} · {selectedPlan.itemCount || 0} điểm dừng · {selectedPlan.collaboratorCount || 0} thành viên
                  </p>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedPlan(null)}>Đóng</button>
              </div>

              <div className="admin-plan-meta-grid">
                <div>
                  <div className="admin-stat-label">Trạng thái</div>
                  <span className={`admin-badge ${getStatusClass(selectedPlan.status)}`}>
                    {STATUS_LABELS[selectedPlan.status] || selectedPlan.status || '-'}
                  </span>
                </div>
                <div>
                  <div className="admin-stat-label">Chia sẻ</div>
                  <span className={`admin-badge ${getVisibilityClass(selectedPlan.visibility)}`}>
                    {VISIBILITY_LABELS[selectedPlan.visibility] || selectedPlan.visibility || '-'}
                  </span>
                </div>
                <div>
                  <div className="admin-stat-label">Cập nhật</div>
                  <div>{formatDate(selectedPlan.updatedAt)}</div>
                </div>
              </div>

              <div className="admin-plan-detail-grid">
                {(selectedPlan.items || []).map((item) => (
                  <div className="admin-plan-stop" key={item.id}>
                    <div className="admin-plan-stop-index">#{item.sortOrder}</div>
                    <div>
                      <strong>{item.location?.name || 'Điểm chưa gắn location'}</strong>
                      <div className="admin-muted-line">{item.location?.address || item.note || '-'}</div>
                    </div>
                  </div>
                ))}
                {(!selectedPlan.items || selectedPlan.items.length === 0) && (
                  <div className="admin-inline-status">Kế hoạch này chưa có điểm dừng chi tiết.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlans;
