import React, { useEffect, useState } from 'react';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { PREFERENCE_TAGS } from '../utils/mockData';
import { Save, MapPin } from 'lucide-react';
import './Admin.css';

const preferenceEntries = Object.entries(PREFERENCE_TAGS);

const AdminExplore = () => {
  const [locations, setLocations] = useState([]);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    adminService.getHotLocations().then(setLocations).catch(console.error);
  }, []);

  const updateLocal = (id, key, value) => {
    setLocations((prev) => prev.map((loc) => String(loc.id) === String(id) ? { ...loc, [key]: value } : loc));
  };

  const handleImageFile = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateLocal(id, 'imageUrl', reader.result);
    reader.readAsDataURL(file);
  };

  const toggleTag = (id, tag) => {
    setLocations((prev) => prev.map((loc) => {
      if (String(loc.id) !== String(id)) return loc;
      const currentTags = Array.isArray(loc.tags) ? loc.tags : [];
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((item) => item !== tag)
        : [...currentTags, tag];
      return { ...loc, tags: nextTags };
    }));
  };

  const saveLocation = async (loc) => {
    setSavingId(loc.id);
    try {
      const updated = await adminService.updateHotLocation(loc.id, {
        name: loc.name,
        description: loc.description,
        category: loc.category,
        imageUrl: loc.imageUrl,
        estimatedCost: loc.estimatedCost,
        suggestedDuration: loc.suggestedDuration,
        bestSeason: loc.bestSeason,
        tags: Array.isArray(loc.tags) ? loc.tags : []
      });
      setLocations((prev) => prev.map((item) => String(item.id) === String(loc.id) ? { ...item, ...updated } : item));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Quản lý khám phá</h1>
            <p className="admin-subtitle">Chỉnh nội dung các địa điểm hot đang hiển thị ở trang chính và trang khám phá.</p>
          </div>
        </div>

        <div className="admin-hot-list">
          {locations.map((loc) => (
            <div className="card admin-location-card" key={loc.id}>
              <img
                className="admin-location-image"
                src={loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'}
                alt={loc.name}
              />
              <input className="admin-input" value={loc.name || ''} onChange={(e) => updateLocal(loc.id, 'name', e.target.value)} />
              <textarea className="admin-textarea" value={loc.description || ''} onChange={(e) => updateLocal(loc.id, 'description', e.target.value)} placeholder="Mô tả hiển thị" />
              <label className="admin-file-picker">
                <span>Chọn ảnh hiển thị</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFile(loc.id, e.target.files?.[0])}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input className="admin-input" value={loc.category || ''} onChange={(e) => updateLocal(loc.id, 'category', e.target.value)} placeholder="Loại" />
                <input className="admin-input" value={loc.suggestedDuration || ''} onChange={(e) => updateLocal(loc.id, 'suggestedDuration', e.target.value)} placeholder="Thời lượng" />
              </div>
              <input className="admin-input" type="number" value={loc.estimatedCost || 0} onChange={(e) => updateLocal(loc.id, 'estimatedCost', e.target.value)} placeholder="Chi phí" />
              <input className="admin-input" value={loc.bestSeason || ''} onChange={(e) => updateLocal(loc.id, 'bestSeason', e.target.value)} placeholder="Mùa đẹp" />
              <div className="admin-vibe-tags">
                {preferenceEntries.map(([tag, info]) => (
                  <button
                    type="button"
                    key={tag}
                    className={`admin-vibe-tag ${Array.isArray(loc.tags) && loc.tags.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleTag(loc.id, tag)}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
              <div className="admin-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="admin-badge ok"><MapPin size={13} /> {loc.planCount} plan</span>
                <button className="btn btn-primary" onClick={() => saveLocation(loc)} disabled={savingId === loc.id}>
                  <Save size={16} /> {savingId === loc.id ? 'Đang lưu' : 'Lưu'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminExplore;
