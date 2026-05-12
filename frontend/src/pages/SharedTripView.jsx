import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Clock, DollarSign, User, 
  Share2, Copy, Check, Loader2, AlertTriangle,
  Navigation, StickyNote, Edit3, Save, X, Trash2
} from 'lucide-react';
import { sharingService } from '../services/sharingService';
import { useAuth } from '../context/AuthContext';
import './SharedTripView.css';

const SharedTripView = () => {
  const { token } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', budget: '' });
  const [editingNote, setEditingNote] = useState(null);
  const [noteValue, setNoteValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const canEdit = trip?.sharePermission === 'edit' && !!user;

  useEffect(() => {
    loadSharedTrip();
  }, [token]);

  const loadSharedTrip = async () => {
    try {
      const data = await sharingService.getShared(token);
      setTrip(data);
      setEditForm({
        name: data.name || '',
        description: data.description || '',
        budget: data.budget || ''
      });
    } catch (err) {
      setError('Lịch trình không tồn tại hoặc đã hết hạn chia sẻ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const updated = await sharingService.updateShared(token, {
        name: editForm.name,
        description: editForm.description,
        budget: editForm.budget ? Number(editForm.budget) : null
      });
      setTrip(prev => ({ ...prev, ...updated }));
      setIsEditing(false);
      showToast('Đã cập nhật thông tin kế hoạch.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await sharingService.removeSharedItem(token, itemId);
      setTrip(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId)
      }));
      showToast('Đã xóa điểm dừng.');
    } catch (err) {
      showToast('Không thể xóa. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="shared-loading">
        <Loader2 className="animate-spin" size={48} />
        <p>Đang tải lịch trình...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="shared-error">
        <AlertTriangle size={48} />
        <h2>Không thể xem lịch trình</h2>
        <p>{error}</p>
        <Link to="/login" className="btn btn-primary">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div className="shared-container">
      {toast && (
        <div className="card" style={{ position: 'fixed', right: 20, top: 20, zIndex: 3000, padding: '0.75rem 1rem' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shared-header"
      >
        <div className="shared-brand">
          <Link to="/" className="shared-brand-link">
            Travel<span>Plan</span>
          </Link>
        </div>

        <div className="shared-header-actions">
          {canEdit && (
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className={`btn ${isEditing ? 'btn-primary' : 'btn-outline'} shared-edit-btn`}
            >
              <Edit3 size={16} /> {isEditing ? 'Đang chỉnh sửa' : 'Chỉnh sửa'}
            </button>
          )}
          <button onClick={handleCopyLink} className="btn btn-outline shared-copy-btn">
            {copied ? <><Check size={16} /> Đã sao chép</> : <><Copy size={16} /> Sao chép link</>}
          </button>
        </div>
      </motion.div>

      {/* Trip Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card shared-hero"
      >
        <div className="shared-hero-gradient" />
        <div className="shared-hero-content">
          <div className="shared-badge-row">
            <div className="shared-badge">
              <Share2 size={14} /> Lịch trình được chia sẻ
            </div>
            {canEdit && (
              <div className="shared-badge shared-badge-edit">
                <Edit3 size={14} /> Có quyền chỉnh sửa
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="shared-edit-form">
              <input
                type="text"
                className="shared-edit-input shared-edit-input-lg"
                value={editForm.name}
                onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Tên lịch trình"
              />
              <textarea
                className="shared-edit-textarea"
                value={editForm.description}
                onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Mô tả chuyến đi..."
                rows={2}
              />
              <input
                type="number"
                className="shared-edit-input"
                value={editForm.budget}
                onChange={(e) => setEditForm(p => ({ ...p, budget: e.target.value }))}
                placeholder="Ngân sách (VNĐ)"
              />
              <div className="shared-edit-actions">
                <button onClick={handleSaveInfo} disabled={saving} className="btn btn-primary">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Lưu thay đổi
                </button>
                <button onClick={() => setIsEditing(false)} className="btn btn-outline">
                  <X size={16} /> Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="shared-title">{trip.name}</h1>
              {trip.description && <p className="shared-desc">{trip.description}</p>}
            </>
          )}
          
          <div className="shared-meta">
            {trip.destination && (
              <span><MapPin size={16} /> {trip.destination}</span>
            )}
            {trip.totalDays && (
              <span><Calendar size={16} /> {trip.totalDays} ngày</span>
            )}
            {trip.budget && (
              <span><DollarSign size={16} /> {Number(trip.budget).toLocaleString()} VNĐ</span>
            )}
            <span><Navigation size={16} /> {trip.items?.length || 0} điểm dừng</span>
          </div>

          {trip.owner && (
            <div className="shared-owner">
              <div className="shared-owner-avatar">
                {trip.owner.avatar ? (
                  <img src={trip.owner.avatar} alt={trip.owner.name} />
                ) : (
                  <User size={18} />
                )}
              </div>
              <div>
                <div className="shared-owner-name">Bởi {trip.owner.name}</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="shared-timeline">
        <h2 className="shared-section-title">
          <Clock size={20} /> Lịch trình chi tiết
        </h2>

        <div className="shared-timeline-list">
          <div className="shared-timeline-line" />
          
          {trip.items?.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="shared-timeline-item"
            >
              <div className="shared-timeline-dot">
                <span>{idx + 1}</span>
              </div>

              <div className="card shared-timeline-card">
                <div className="shared-timeline-card-content">
                  <div className="shared-timeline-card-header">
                    <h3 className="shared-timeline-name">
                      <MapPin size={16} />
                      {item.location?.name || 'Địa điểm'}
                    </h3>
                    {isEditing && (
                      <button 
                        className="shared-timeline-remove"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Xóa điểm dừng"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {item.location?.address && (
                    <p className="shared-timeline-address">{item.location.address}</p>
                  )}

                  <div className="shared-timeline-tags">
                    {item.startTime && (
                      <span className="shared-tag">
                        <Clock size={12} /> {new Date(item.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {item.endTime && ` → ${new Date(item.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    )}
                    {item.location?.estimatedCost > 0 && (
                      <span className="shared-tag">
                        💰 {Number(item.location.estimatedCost).toLocaleString()}đ
                      </span>
                    )}
                    {item.location?.suggestedDuration && (
                      <span className="shared-tag">
                        ⏰ {item.location.suggestedDuration}
                      </span>
                    )}
                    {item.travelMinutes > 0 && (
                      <span className="shared-tag shared-tag-travel">
                        🚗 {item.travelMinutes} phút đến điểm tiếp
                      </span>
                    )}
                  </div>

                  {item.note && !isEditing && (
                    <div className="shared-timeline-note">
                      <StickyNote size={14} /> {item.note}
                    </div>
                  )}

                  {isEditing && (
                    <div className="shared-timeline-note-edit">
                      <StickyNote size={14} />
                      <input
                        type="text"
                        className="shared-note-input"
                        placeholder="Thêm ghi chú..."
                        defaultValue={item.note || ''}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="shared-footer">
        {user ? (
          <>
            <p>Bạn muốn tạo lịch trình tương tự?</p>
            <Link to="/planner" className="btn btn-primary">Tạo kế hoạch mới</Link>
          </>
        ) : (
          <>
            <p>Đăng nhập để chỉnh sửa hoặc tạo lịch trình riêng</p>
            <Link to="/login" className="btn btn-primary">Đăng nhập</Link>
            <Link to="/register" className="btn btn-outline" style={{ marginLeft: 8 }}>Đăng ký miễn phí</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default SharedTripView;
