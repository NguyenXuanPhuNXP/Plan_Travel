import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { PREFERENCE_TAGS } from '../utils/mockData';
import { ArrowLeft, Save } from 'lucide-react';
import './Admin.css';

const preferenceEntries = Object.entries(PREFERENCE_TAGS);

const normalizeGallerySlides = (loc) => {
  const slides = Array.isArray(loc.gallerySlides) && loc.gallerySlides.length
    ? loc.gallerySlides
    : (loc.galleryImages || []);

  return slides.map((slide) => {
    if (typeof slide === 'string') {
      return { image: slide, name: loc.name || '' };
    }
    return {
      image: slide?.image || slide?.imageUrl || slide?.url || '',
      name: slide?.name || loc.name || ''
    };
  }).filter((slide) => slide.image);
};

const AdminHotPlaceEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loc, setLoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const list = await adminService.getHotLocations();
      const found = (list || []).find((item) => String(item.id) === String(id));
      if (!found) {
        setErrorMessage('Không tìm thấy địa điểm hot.');
      } else {
        setLoc(found);
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải dữ liệu địa điểm hot.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const updateLocal = (key, value) => {
    setLoc((prev) => ({ ...prev, [key]: value }));
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleImageFiles = async (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length || !loc) return;
    setErrorMessage('');
    setUploading(true);
    try {
      const uploadedImages = [];
      for (const file of selectedFiles) {
        const imageDataUrl = await readFileAsDataUrl(file);
        const uploaded = await adminService.uploadLocationImage(imageDataUrl);
        uploadedImages.push(uploaded.imageUrl);
      }

      const currentSlides = normalizeGallerySlides(loc);
      const knownImages = new Set(currentSlides.map((slide) => slide.image));
      const gallerySlides = [
        ...currentSlides,
        ...[loc.imageUrl, ...uploadedImages]
          .filter((image) => image && !knownImages.has(image))
          .map((image) => {
            knownImages.add(image);
            return { image, name: loc.name || '' };
          })
      ];

      setLoc((prev) => ({
        ...prev,
        imageUrl: uploadedImages[0] || prev.imageUrl,
        galleryImages: gallerySlides.map((slide) => slide.image),
        gallerySlides
      }));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải ảnh lên.');
    } finally {
      setUploading(false);
    }
  };

  const setCoverImage = (imageUrl) => updateLocal('imageUrl', imageUrl);

  const updateGallerySlide = (imageUrl, key, value) => {
    setLoc((prev) => ({
      ...prev,
      gallerySlides: normalizeGallerySlides(prev).map((slide) => (
        slide.image === imageUrl ? { ...slide, [key]: value } : slide
      ))
    }));
  };

  const removeGalleryImage = (imageUrl) => {
    setLoc((prev) => {
      const gallerySlides = normalizeGallerySlides(prev).filter((slide) => slide.image !== imageUrl);
      const galleryImages = gallerySlides.map((slide) => slide.image);
      return {
        ...prev,
        galleryImages,
        gallerySlides,
        imageUrl: prev.imageUrl === imageUrl ? (galleryImages[0] || '') : prev.imageUrl
      };
    });
  };

  const toggleTag = (tag) => {
    setLoc((prev) => {
      const currentTags = Array.isArray(prev.tags) ? prev.tags : [];
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((item) => item !== tag)
        : [...currentTags, tag];
      return { ...prev, tags: nextTags };
    });
  };

  const handleSave = async () => {
    if (!loc) return;
    setSaving(true);
    setErrorMessage('');
    try {
      await adminService.updateHotLocation(loc.id, {
        name: loc.name,
        description: loc.description,
        category: loc.category,
        imageUrl: loc.imageUrl,
        estimatedCost: loc.estimatedCost,
        suggestedDuration: loc.suggestedDuration,
        bestSeason: loc.bestSeason,
        tags: Array.isArray(loc.tags) ? loc.tags : [],
        galleryImages: normalizeGallerySlides(loc).map((slide) => slide.image),
        gallerySlides: normalizeGallerySlides(loc)
      });
      navigate('/admin/places');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Chỉnh sửa địa điểm hot</h1>
            <p className="admin-subtitle">Cập nhật nội dung hiển thị cho điểm hot.</p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/admin/places')}>
            <ArrowLeft size={16} /> Quay lại danh sách
          </button>
        </div>

        {errorMessage && <div className="admin-error-message">{errorMessage}</div>}
        {loading && <div className="admin-inline-status">Đang tải...</div>}

        {loc && (
          <div className="card admin-panel" style={{ display: 'grid', gap: '0.5rem' }}>
            <img
              className="admin-location-image"
              src={loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'}
              alt={loc.name}
            />
            <input className="admin-input" value={loc.name || ''} onChange={(e) => updateLocal('name', e.target.value)} />
            <textarea className="admin-textarea" value={loc.description || ''} onChange={(e) => updateLocal('description', e.target.value)} placeholder="Mô tả hiển thị" />
            <label className="admin-file-picker">
              <span>Chọn ảnh hiển thị</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
            {uploading && <div className="admin-inline-status">Đang tải ảnh...</div>}
            {normalizeGallerySlides(loc).length > 0 && (
              <div className="admin-location-gallery">
                {normalizeGallerySlides(loc).map((slide, index) => (
                  <div className={`admin-gallery-item ${loc.imageUrl === slide.image ? 'active' : ''}`} key={`${loc.id}-${slide.image}-${index}`}>
                    <button type="button" onClick={() => setCoverImage(slide.image)} title="Dùng làm ảnh bìa">
                      <img src={slide.image} alt="" />
                    </button>
                    <input
                      className="admin-gallery-name"
                      value={slide.name || ''}
                      onChange={(event) => updateGallerySlide(slide.image, 'name', event.target.value)}
                      placeholder="Tên địa danh"
                    />
                    <button type="button" className="admin-gallery-remove" onClick={() => removeGalleryImage(slide.image)} title="Xóa ảnh">×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input className="admin-input" value={loc.category || ''} onChange={(e) => updateLocal('category', e.target.value)} placeholder="Loại" />
              <input className="admin-input" value={loc.suggestedDuration || ''} onChange={(e) => updateLocal('suggestedDuration', e.target.value)} placeholder="Thời lượng" />
            </div>
            <input className="admin-input" type="number" value={loc.estimatedCost || 0} onChange={(e) => updateLocal('estimatedCost', e.target.value)} placeholder="Chi phí" />
            <input className="admin-input" value={loc.bestSeason || ''} onChange={(e) => updateLocal('bestSeason', e.target.value)} placeholder="Mùa đẹp" />
            <div className="admin-vibe-tags">
              {preferenceEntries.map(([tag, info]) => (
                <button
                  type="button"
                  key={tag}
                  className={`admin-vibe-tag ${Array.isArray(loc.tags) && loc.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {info.label}
                </button>
              ))}
            </div>
            <div className="admin-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => navigate('/admin/places')}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
                <Save size={16} /> {saving ? 'Đang lưu' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminHotPlaceEdit;
