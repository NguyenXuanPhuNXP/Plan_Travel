import React, { useEffect, useState } from 'react';
import AdminLayout from '../Components/AdminLayout/AdminLayout';
import { adminService } from '../services/adminService';
import { PREFERENCE_TAGS } from '../utils/mockData';
import { Save, MapPin } from 'lucide-react';
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

const AdminExplore = () => {
  const [locations, setLocations] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    adminService.getHotLocations().then(setLocations).catch(console.error);
  }, []);

  const updateLocal = (id, key, value) => {
    setLocations((prev) => prev.map((loc) => String(loc.id) === String(id) ? { ...loc, [key]: value } : loc));
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleImageFiles = async (id, files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    setErrorMessage('');
    setUploadingId(id);
    try {
      const uploadedImages = [];
      for (const file of selectedFiles) {
        const imageDataUrl = await readFileAsDataUrl(file);
        const uploaded = await adminService.uploadLocationImage(imageDataUrl);
        uploadedImages.push(uploaded.imageUrl);
      }
      setLocations((prev) => prev.map((loc) => {
        if (String(loc.id) !== String(id)) return loc;
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
        return {
          ...loc,
          imageUrl: uploadedImages[0] || loc.imageUrl,
          galleryImages: gallerySlides.map((slide) => slide.image),
          gallerySlides
        };
      }));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể tải ảnh lên.');
    } finally {
      setUploadingId(null);
    }
  };

  const setCoverImage = (id, imageUrl) => updateLocal(id, 'imageUrl', imageUrl);

  const updateGallerySlide = (id, imageUrl, key, value) => {
    setLocations((prev) => prev.map((loc) => {
      if (String(loc.id) !== String(id)) return loc;
      return {
        ...loc,
        gallerySlides: normalizeGallerySlides(loc).map((slide) => (
          slide.image === imageUrl ? { ...slide, [key]: value } : slide
        ))
      };
    }));
  };

  const removeGalleryImage = (id, imageUrl) => {
    setLocations((prev) => prev.map((loc) => {
      if (String(loc.id) !== String(id)) return loc;
      const gallerySlides = normalizeGallerySlides(loc).filter((slide) => slide.image !== imageUrl);
      const galleryImages = gallerySlides.map((slide) => slide.image);
      return {
        ...loc,
        galleryImages,
        gallerySlides,
        imageUrl: loc.imageUrl === imageUrl ? (galleryImages[0] || '') : loc.imageUrl
      };
    }));
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
    setErrorMessage('');
    try {
      const updated = await adminService.updateHotLocation(loc.id, {
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
      setLocations((prev) => prev.map((item) => String(item.id) === String(loc.id) ? { ...item, ...updated } : item));
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Không thể lưu thay đổi.');
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
          {errorMessage && <div className="admin-error-message">{errorMessage}</div>}
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
                  multiple
                  onChange={(e) => handleImageFiles(loc.id, e.target.files)}
                  disabled={uploadingId === loc.id}
                />
              </label>
              {uploadingId === loc.id && <div className="admin-inline-status">Đang tải ảnh...</div>}
              {normalizeGallerySlides(loc).length > 0 && (
                <div className="admin-location-gallery">
                  {normalizeGallerySlides(loc).map((slide, index) => (
                    <div className={`admin-gallery-item ${loc.imageUrl === slide.image ? 'active' : ''}`} key={`${loc.id}-${slide.image}-${index}`}>
                      <button type="button" onClick={() => setCoverImage(loc.id, slide.image)} title="Dùng làm ảnh bìa">
                        <img src={slide.image} alt="" />
                      </button>
                      <input
                        className="admin-gallery-name"
                        value={slide.name || ''}
                        onChange={(event) => updateGallerySlide(loc.id, slide.image, 'name', event.target.value)}
                        placeholder="Tên địa danh"
                      />
                      <button type="button" className="admin-gallery-remove" onClick={() => removeGalleryImage(loc.id, slide.image)} title="Xóa ảnh">×</button>
                    </div>
                  ))}
                </div>
              )}
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
                <button className="btn btn-primary" onClick={() => saveLocation(loc)} disabled={savingId === loc.id || uploadingId === loc.id}>
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
