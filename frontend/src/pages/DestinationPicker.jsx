import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Star, Clock, DollarSign, Check, 
  Filter, Search, Sparkles, ChevronDown
} from 'lucide-react';
import MapComponent from '../Components/Map/MapComponent';
import './DestinationPicker.css';

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'tourism', label: '🏛️ Du lịch' },
  { value: 'catering', label: '🍜 Ăn uống' },
  { value: 'entertainment', label: '🎭 Giải trí' },
  { value: 'accommodation', label: '🏨 Lưu trú' },
  { value: 'natural', label: '🌿 Tự nhiên' },
];

const DestinationPicker = ({ suggestions = [], selectedLocations = [], onSelect, onDeselect, destination }) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showMap, setShowMap] = useState(true);

  const isSelected = (locId) => selectedLocations.some(l => l.id === locId);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(loc => {
      const matchSearch = !searchFilter || 
        loc.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        loc.address?.toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchCategory = categoryFilter === 'all' || 
        loc.category?.includes(categoryFilter);

      return matchSearch && matchCategory;
    });
  }, [suggestions, searchFilter, categoryFilter]);

  // Map locations for MapComponent
  const mapSelectedLocations = selectedLocations.map(loc => ({
    id: loc.id,
    name: loc.name,
    address: loc.address || '',
    lat: loc.latitude,
    lng: loc.longitude,
    image: loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800'
  }));

  const handleToggle = (loc) => {
    if (isSelected(loc.id)) {
      onDeselect(loc.id);
    } else {
      onSelect(loc);
    }
  };

  const getCostLabel = (cost) => {
    if (!cost || cost === 0) return 'Miễn phí';
    return `${Number(cost).toLocaleString()}đ`;
  };

  return (
    <div className="picker-container">
      {/* Header */}
      <div className="picker-header">
        <div className="picker-header-left">
          <h2 className="picker-title">
            <Sparkles size={22} className="picker-title-icon" />
            Gợi ý cho <span className="picker-destination">{destination}</span>
          </h2>
          <p className="picker-subtitle">
            AI đã tìm thấy <strong>{suggestions.length}</strong> địa điểm. 
            Đã chọn <strong>{selectedLocations.length}</strong>.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="picker-filters">
        <div className="picker-search-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Lọc theo tên..."
            className="picker-search-input"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
        <div className="picker-category-filters">
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat.value}
              className={`picker-cat-btn ${categoryFilter === cat.value ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="picker-content">
        {/* Cards Grid */}
        <div className="picker-cards-panel">
          <div className="picker-cards-grid">
            {filteredSuggestions.map((loc, idx) => (
              <motion.div
                key={loc.id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`picker-card ${isSelected(loc.id) ? 'selected' : ''}`}
                onClick={() => handleToggle(loc)}
              >
                {/* Selection indicator */}
                <div className={`picker-card-check ${isSelected(loc.id) ? 'checked' : ''}`}>
                  <Check size={14} />
                </div>

                {/* AI Score Badge */}
                {loc.aiScore && (
                  <div className="picker-card-score" title="AI Score">
                    <Sparkles size={10} />
                    {loc.aiScore.toFixed(1)}
                  </div>
                )}

                {/* Card image */}
                <div className="picker-card-img-wrap">
                  {loc.imageUrl ? (
                    <img src={loc.imageUrl} alt={loc.name} className="picker-card-img" />
                  ) : (
                    <div className="picker-card-img-placeholder">
                      <MapPin size={28} />
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="picker-card-body">
                  <h4 className="picker-card-name">{loc.name}</h4>
                  
                  {loc.address && (
                    <p className="picker-card-address">
                      <MapPin size={12} /> {loc.address.substring(0, 60)}{loc.address.length > 60 ? '...' : ''}
                    </p>
                  )}

                  <div className="picker-card-meta">
                    {loc.suggestedDuration && (
                      <span className="picker-card-tag">
                        <Clock size={12} /> {loc.suggestedDuration}
                      </span>
                    )}
                    <span className="picker-card-tag">
                      <DollarSign size={12} /> {getCostLabel(loc.estimatedCost)}
                    </span>
                    {loc.rating && (
                      <span className="picker-card-tag picker-card-tag-rating">
                        <Star size={12} /> {Number(loc.rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  {loc.aiReason && (
                    <p className="picker-card-reason">
                      <Sparkles size={12} /> {loc.aiReason}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {filteredSuggestions.length === 0 && (
              <div className="picker-empty">
                <Search size={48} className="picker-empty-icon" />
                <p>Không tìm thấy địa điểm phù hợp</p>
              </div>
            )}
          </div>
        </div>

        {/* Map Panel */}
        {showMap && (
          <div className="picker-map-panel">
            <MapComponent
              selectedLocations={mapSelectedLocations}
              suggestedLocations={filteredSuggestions.map(loc => ({
                id: loc.id,
                name: loc.name,
                address: loc.address || '',
                lat: loc.latitude,
                lng: loc.longitude,
                image: loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800',
                isSuggested: !isSelected(loc.id)
              }))}
              onLocationAdd={(loc) => {
                const matched = suggestions.find(s => 
                  s.latitude === loc.lat && s.longitude === loc.lng
                );
                if (matched && !isSelected(matched.id)) {
                  onSelect(matched);
                }
              }}
              onLocationRemove={(locId) => onDeselect(locId)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DestinationPicker;
