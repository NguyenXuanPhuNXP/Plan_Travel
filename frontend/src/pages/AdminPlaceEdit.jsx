import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { ArrowLeft, Save } from 'lucide-react';
import './Admin.css';

const emptyForm = {
  name: '',
  address: '',
  description: '',
  category: '',
  subcategory: '',
  region: '',
  city: '',
  province: '',
  latitude: '',
  longitude: '',
  estimatedCost: 0,
  suggestedDuration: '',
  imageUrl: '',
  tags: ''
};

const AdminPlaceEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const loadDetail = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const detail = await adminService.getLocationById(id);
      setFormData({
        name: detail.name || '',
        address: detail.address || '',
        description: detail.description || '',
        category: detail.category || '',
        subcategory: detail.subcategory || '',
        region: detail.region || '',
        city: detail.city || '',
        province: detail.province || '',
        latitude: detail.latitude ?? '',
        longitude: detail.longitude ?? '',
        estimatedCost: detail.estimatedCost ?? 0,
        suggestedDuration: detail.suggestedDuration || '',
        imageUrl: detail.imageUrl || '',
        tags: Array.isArray(detail.tags) ? detail.tags.join(', ') : ''
      });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải dữ liệu chỉnh sửa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleImageUpload = async (files) => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    setErrorMessage('');
    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      const uploaded = await adminService.uploadLocationImage(imageDataUrl);
      setFormData((prev) => ({ ...prev, imageUrl: uploaded.imageUrl }));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải ảnh lên.');
    }
  };

  const handleSave = async () => {
    if (!formData.name || formData.latitude === '' || formData.longitude === '') {
      setErrorMessage('Vui lòng nhập name, latitude, longitude.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const payload = {
      ...formData,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      estimatedCost: Number(formData.estimatedCost) || 0,
      tags: String(formData.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    };

    try {
      await adminService.updateLocation(id, payload);
      navigate(`/admin/places/${id}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể lưu location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Chỉnh sửa địa điểm</h1>
            <p className="admin-subtitle">Cập nhật thông tin location.</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate(`/admin/places/${id}`)}>
            <ArrowLeft size={16} /> Quay lại chi tiết
          </button>
        </div>

        {errorMessage && <div className="admin-error-message">{errorMessage}</div>}
        {loading && <div className="admin-inline-status">Đang tải...</div>}

        {!loading && (
          <div className="card admin-panel" style={{ display: 'grid', gap: '0.5rem' }}>
            <input className="admin-input" placeholder="Tên" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            <input className="admin-input" placeholder="Địa chỉ" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
            <textarea className="admin-textarea" placeholder="Mô tả" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="admin-input" placeholder="Category" value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} />
              <input className="admin-input" placeholder="Subcategory" value={formData.subcategory} onChange={(e) => setFormData((p) => ({ ...p, subcategory: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <input className="admin-input" placeholder="Region" value={formData.region} onChange={(e) => setFormData((p) => ({ ...p, region: e.target.value }))} />
              <input className="admin-input" placeholder="City" value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} />
              <input className="admin-input" placeholder="Province" value={formData.province} onChange={(e) => setFormData((p) => ({ ...p, province: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="admin-input" placeholder="Latitude" type="number" value={formData.latitude} onChange={(e) => setFormData((p) => ({ ...p, latitude: e.target.value }))} />
              <input className="admin-input" placeholder="Longitude" type="number" value={formData.longitude} onChange={(e) => setFormData((p) => ({ ...p, longitude: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="admin-input" placeholder="Estimated cost" type="number" value={formData.estimatedCost} onChange={(e) => setFormData((p) => ({ ...p, estimatedCost: e.target.value }))} />
              <input className="admin-input" placeholder="Suggested duration" value={formData.suggestedDuration} onChange={(e) => setFormData((p) => ({ ...p, suggestedDuration: e.target.value }))} />
            </div>
            <input className="admin-input" placeholder="Image URL" value={formData.imageUrl} onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))} />
            <label className="admin-file-picker">
              <span>Tải ảnh location</span>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files)} />
            </label>
            {formData.imageUrl && (
              <img src={formData.imageUrl} alt="preview" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px' }} />
            )}
            <input className="admin-input" placeholder="Tags (comma separated)" value={formData.tags} onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))} />

            <div className="admin-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => navigate(`/admin/places/${id}`)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlaceEdit;
