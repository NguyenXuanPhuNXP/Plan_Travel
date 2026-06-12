import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { MapPin, Plus, Trash2, Search, Edit3, Eye } from 'lucide-react';
import './Admin.css';

const AdminPlacesList = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('hot');
  const [hotLocations, setHotLocations] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [addHotKeyword, setAddHotKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingHotId, setAddingHotId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [hot, all] = await Promise.all([
        adminService.getHotLocations(),
        adminService.getLocations({ limit: 300, offset: 0 })
      ]);
      setHotLocations(Array.isArray(hot) ? hot : []);
      setAllLocations(Array.isArray(all?.items) ? all.items : []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải dữ liệu địa điểm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAllLocations = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return allLocations;
    return allLocations.filter((loc) => {
      const text = [
        loc.name,
        loc.category,
        loc.subcategory,
        loc.region,
        loc.city,
        loc.province,
        loc.address
      ].map((v) => String(v || '').toLowerCase()).join(' ');
      return text.includes(key);
    });
  }, [allLocations, keyword]);

  const addableLocations = useMemo(() => {
    const hotIds = new Set((hotLocations || []).map((item) => String(item.id)));
    const key = addHotKeyword.trim().toLowerCase();
    return (allLocations || [])
      .filter((item) => !hotIds.has(String(item.id)))
      .filter((item) => {
        if (!key) return true;
        const text = [
          item.name,
          item.category,
          item.subcategory,
          item.region,
          item.city,
          item.province,
          item.address
        ].map((v) => String(v || '').toLowerCase()).join(' ');
        return text.includes(key);
      })
      .slice(0, 60);
  }, [allLocations, hotLocations, addHotKeyword]);

  const handleAddHot = async (id) => {
    setAddingHotId(id);
    setErrorMessage('');
    try {
      await adminService.addHotLocation(id);
      await loadData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể thêm địa điểm hot.');
    } finally {
      setAddingHotId(null);
    }
  };

  const handleRemoveHot = async (id) => {
    if (!window.confirm('Xóa địa điểm này khỏi danh sách hot?')) return;
    setErrorMessage('');
    try {
      await adminService.removeHotLocation(id);
      await loadData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể xóa địa điểm hot.');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa location này?')) return;
    setErrorMessage('');
    try {
      await adminService.deleteLocation(id);
      await loadData();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể xóa location.');
    }
  };

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Quản lý địa điểm</h1>
            <p className="admin-subtitle">Danh sách tổng cho điểm hot.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={`btn ${tab === 'hot' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('hot')}>
              Điểm hot
            </button>
            <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('all')}>
              Sửa địa điểm
            </button>
          </div>
        </div>

        {errorMessage && <div className="admin-error-message">{errorMessage}</div>}
        {loading && <div className="admin-inline-status">Đang tải dữ liệu...</div>}

        {tab === 'hot' && (
          <>
            <div className="card admin-panel" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Search size={16} />
                <input
                  className="admin-input"
                  placeholder="Tìm location để thêm..."
                  value={addHotKeyword}
                  onChange={(e) => setAddHotKeyword(e.target.value)}
                />
              </div>
              <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem', maxHeight: '220px', overflow: 'auto' }}>
                {addableLocations.map((loc) => (
                  <div key={loc.id} className="card" style={{ padding: '0.6rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{loc.name}</div>
                      <div className="admin-subtitle" style={{ margin: 0 }}>{loc.region || loc.city || loc.address || '-'}</div>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleAddHot(loc.id)} disabled={addingHotId === loc.id || addingHotId === String(loc.id)}>
                      <Plus size={14} /> {addingHotId === loc.id || addingHotId === String(loc.id) ? 'Đang thêm...' : 'Thêm'}
                    </button>
                  </div>
                ))}
                {!addableLocations.length && <div className="admin-inline-status">Không có location khả dụng để thêm.</div>}
              </div>
            </div>

            <div className="admin-hot-list">
              {(hotLocations || []).map((loc) => (
                <div className="card admin-location-card" key={loc.id}>
                  <img
                    className="admin-location-image"
                    src={loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'}
                    alt={loc.name}
                  />
                  <div style={{ fontWeight: 800 }}>{loc.name}</div>
                  <div className="admin-subtitle" style={{ marginTop: 0 }}>
                    <MapPin size={14} /> {loc.region || loc.address || 'Chưa rõ khu vực'}
                  </div>
                  <div className="admin-actions" style={{ marginTop: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={() => navigate(`/admin/places/hot/${loc.id}/edit`)}>
                      <Edit3 size={16} /> Sửa
                    </button>
                    <button className="btn btn-danger" onClick={() => handleRemoveHot(loc.id)}>
                      <Trash2 size={16} /> Xóa
                    </button>
                  </div>
                </div>
              ))}
              {!loading && !hotLocations.length && (
                <div className="card admin-panel" style={{ padding: '1rem' }}>
                  Chưa có địa điểm hot.
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'all' && (
          <>
            <div className="card admin-panel" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Search size={16} />
                <input
                  className="admin-input"
                  placeholder="Tìm theo tên, vùng, category..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <button className="btn btn-outline" onClick={loadData}>Reload</button>
                <button className="btn btn-primary" onClick={() => navigate('/admin/places/new')}>
                  <Plus size={16} /> Thêm địa điểm
                </button>
              </div>
            </div>

            <div className="admin-hot-list">
              {filteredAllLocations.map((loc) => (
                <div className="card admin-location-card" key={loc.id}>
                  <img
                    className="admin-location-image"
                    src={loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'}
                    alt={loc.name}
                  />
                  <div style={{ fontWeight: 800 }}>{loc.name}</div>
                  <div className="admin-subtitle" style={{ marginTop: 0 }}>
                    <MapPin size={14} /> {loc.region || loc.city || loc.province || 'Chưa rõ khu vực'}
                  </div>
                  <div className="admin-actions" style={{ marginTop: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={() => navigate(`/admin/places/${loc.id}`)}>
                      <Eye size={16} /> Xem
                    </button>
                    <button className="btn btn-outline" onClick={() => navigate(`/admin/places/${loc.id}/edit`)}>
                      <Edit3 size={16} /> Sửa
                    </button>
                    <button className="btn btn-outline" onClick={() => handleAddHot(loc.id)} disabled={addingHotId === loc.id || addingHotId === String(loc.id)}>
                      <Plus size={16} /> Thêm
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteLocation(loc.id)}>
                      <Trash2 size={16} /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPlacesList;
