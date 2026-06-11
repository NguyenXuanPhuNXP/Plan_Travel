import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { ArrowLeft, Edit3 } from 'lucide-react';
import './Admin.css';

const AdminPlaceDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await adminService.getLocationById(id);
      setLocation(data);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải chi tiết location.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Chi tiết địa điểm</h1>
            <p className="admin-subtitle">Xem thông tin đầy đủ của location.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={() => navigate('/admin/places')}>
              <ArrowLeft size={16} /> Quay lại danh sách
            </button>
            <Link className="btn btn-primary" to={`/admin/places/${id}/edit`}>
              <Edit3 size={16} /> Chỉnh sửa
            </Link>
          </div>
        </div>

        {errorMessage && <div className="admin-error-message">{errorMessage}</div>}
        {loading && <div className="admin-inline-status">Đang tải...</div>}

        {location && (
          <div className="card admin-panel" style={{ display: 'grid', gap: '0.5rem' }}>
            {location.imageUrl && (
              <img
                src={location.imageUrl}
                alt={location.name}
                style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '12px', marginBottom: '0.5rem' }}
              />
            )}
            <div><strong>ID:</strong> {location.id}</div>
            <div><strong>Tên:</strong> {location.name}</div>
            <div><strong>Địa chỉ:</strong> {location.address || '-'}</div>
            <div><strong>Quốc gia:</strong> {location.country || '-'}</div>
            <div><strong>Tỉnh/TP:</strong> {location.province || '-'} / {location.city || '-'}</div>
            <div><strong>District:</strong> {location.district || '-'}</div>
            <div><strong>Region:</strong> {location.region || '-'}</div>
            <div><strong>Category:</strong> {location.category || '-'}</div>
            <div><strong>Subcategory:</strong> {location.subcategory || '-'}</div>
            <div><strong>Lat/Lng:</strong> {location.latitude}, {location.longitude}</div>
            <div><strong>Estimated Cost:</strong> {location.estimatedCost ?? 0}</div>
            <div><strong>Suggested Duration:</strong> {location.suggestedDuration || '-'}</div>
            <div><strong>Rating:</strong> {location.rating ?? '-'}</div>
            <div><strong>Tags:</strong> {Array.isArray(location.tags) ? location.tags.join(', ') : '-'}</div>
            <div><strong>Description:</strong> {location.description || '-'}</div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlaceDetail;
