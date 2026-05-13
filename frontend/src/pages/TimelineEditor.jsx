import React, { useMemo, useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Clock, MapPin, GripVertical, Edit3, Check, X, 
  ChevronDown, ChevronUp, Sparkles, StickyNote, 
  Navigation, Sun, Sunset, Moon, Plus, Search
} from 'lucide-react';
import { locationService } from '../services/locationService';
import './TimelineEditor.css';

const TimelineEditor = ({ plan, selectedLocations = [], totalDays = 3, destination, onPlanChange, onAddCustomLocation }) => {
  const [editingPlan, setEditingPlan] = useState(null);
  const [expandedDay, setExpandedDay] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const [pickerResults, setPickerResults] = useState([]);

  useEffect(() => {
    if (plan?.days) {
      setEditingPlan(plan);
    } else {
      // Generate basic plan from selected locations
      const itemsPerDay = Math.max(1, Math.ceil(selectedLocations.length / totalDays));
      const days = [];
      
      for (let d = 0; d < totalDays; d++) {
        const dayLocs = selectedLocations.slice(d * itemsPerDay, (d + 1) * itemsPerDay);
        days.push({
          dayNumber: d + 1,
          title: `Ngày ${d + 1}`,
          items: dayLocs.map((loc, idx) => ({
            locationName: loc.name,
            locationId: loc.id,
            location: loc,
            startTime: `${String(8 + idx * 3).padStart(2, '0')}:00`,
            endTime: `${String(10 + idx * 3).padStart(2, '0')}:00`,
            note: '',
            travelMinutesToNext: 15
          }))
        });
      }

      setEditingPlan({
        planName: plan?.planName || `Kế hoạch ${destination}`,
        description: plan?.description || '',
        days
      });
    }
  }, [plan, selectedLocations, totalDays]);

  const assignedLocationIds = useMemo(() => {
    if (!editingPlan?.days) return new Set();
    return new Set(editingPlan.days.flatMap((d) => d.items.map((i) => String(i.locationId || i.location?.id || '')).filter(Boolean)));
  }, [editingPlan]);

  const getTimeIcon = (time) => {
    if (!time) return <Clock size={14} />;
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return <Sun size={14} className="time-icon-morning" />;
    if (hour < 17) return <Sunset size={14} className="time-icon-afternoon" />;
    return <Moon size={14} className="time-icon-evening" />;
  };

  const handleEditNote = (dayIdx, itemIdx, note) => {
    setEditingPlan(prev => {
      const newDays = [...prev.days];
      newDays[dayIdx].items[itemIdx].note = note;
      return { ...prev, days: newDays };
    });
  };

  const handleEditTime = (dayIdx, itemIdx, field, value) => {
    setEditingPlan(prev => {
      const newDays = [...prev.days];
      newDays[dayIdx].items[itemIdx][field] = value;
      return { ...prev, days: newDays };
    });
  };

  const handleRemoveItem = (dayIdx, itemIdx) => {
    setEditingPlan(prev => {
      const newDays = [...prev.days];
      newDays[dayIdx].items.splice(itemIdx, 1);
      return { ...prev, days: newDays };
    });
  };

  const handleReorderDay = (dayIdx, newItems) => {
    setEditingPlan(prev => {
      const newDays = [...prev.days];
      newDays[dayIdx].items = newItems;
      return { ...prev, days: newDays };
    });
  };

  const handleAddItem = (dayIdx) => {
    setEditingPlan(prev => {
      const assignedIds = new Set(
        prev.days.flatMap((d) => d.items.map((item) => item.locationId).filter(Boolean))
      );
      const candidate = selectedLocations.find((loc) => !assignedIds.has(loc.id));
      if (!candidate) {
        return prev;
      }

      const newDays = [...prev.days];
      const insertIndex = newDays[dayIdx].items.length;
      newDays[dayIdx].items.push({
        locationName: candidate.name,
        locationId: candidate.id,
        location: candidate,
        startTime: `${String(8 + insertIndex * 2).padStart(2, '0')}:00`,
        endTime: `${String(9 + insertIndex * 2).padStart(2, '0')}:00`,
        note: '',
        travelMinutesToNext: 15
      });
      return { ...prev, days: newDays };
    });
  };

  const openPickerForDay = (dayIdx) => {
    setExpandedDay(dayIdx);
    setPickerError('');
    setPickerResults([]);
    setPickerQuery('');
    setIsPickerOpen(true);
  };

  const runPickerSearch = async () => {
    setPickerLoading(true);
    setPickerError('');
    try {
      const query = (pickerQuery || destination || '').trim();
      const data = await locationService.searchLocations(query);
      const results = (data?.locations || data || [])
        .map((loc) => ({
          ...loc,
          id: String(loc.id),
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude)
        }))
        .filter((loc) => loc?.id && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude));
      setPickerResults(results);
      if (results.length === 0) setPickerError('Không tìm thấy địa điểm phù hợp.');
    } catch (e) {
      setPickerError('Không thể tìm kiếm địa điểm lúc này.');
    } finally {
      setPickerLoading(false);
    }
  };

  const addPickedLocationToDay = (dayIdx, loc) => {
    const locId = String(loc.id);
    setEditingPlan((prev) => {
      const next = { ...prev };
      const newDays = [...next.days];
      const day = { ...newDays[dayIdx] };
      const items = [...day.items];
      const slot = items.length;
      items.push({
        locationName: loc.name,
        locationId: locId,
        location: {
          id: locId,
          name: loc.name,
          address: loc.address || '',
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          category: loc.category || null,
          imageUrl: loc.imageUrl || loc.image_url || null,
          estimatedCost: loc.estimatedCost || loc.estimated_cost || 0,
          suggestedDuration: loc.suggestedDuration || loc.suggested_duration || null
        },
        startTime: `${String(8 + slot * 2).padStart(2, '0')}:00`,
        endTime: `${String(9 + slot * 2).padStart(2, '0')}:00`,
        note: '',
        travelMinutesToNext: 20
      });
      day.items = items;
      newDays[dayIdx] = day;
      next.days = newDays;
      return next;
    });

    // Keep parent selectedLocations in sync (so subsequent auto-add works).
    onAddCustomLocation?.({
      id: locId,
      name: loc.name,
      address: loc.address || '',
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      imageUrl: loc.imageUrl || loc.image_url || null,
      estimatedCost: loc.estimatedCost || loc.estimated_cost || 0,
      suggestedDuration: loc.suggestedDuration || loc.suggested_duration || null,
      category: loc.category || null
    });
  };

  useEffect(() => {
    if (editingPlan && onPlanChange) {
      onPlanChange(editingPlan);
    }
  }, [editingPlan, onPlanChange]);

  if (!editingPlan) return null;

  return (
    <div className="timeline-container">
      {/* Plan Header */}
      <div className="card timeline-header-card">
        <div className="timeline-header-content">
          <div className="timeline-header-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="timeline-plan-title-row">
              {isEditingInfo ? (
                <input
                  className="timeline-plan-name-input"
                  value={editingPlan.planName || ''}
                  onChange={(e) => setEditingPlan((p) => ({ ...p, planName: e.target.value }))}
                  placeholder="Tên kế hoạch"
                />
              ) : (
                <h2 className="timeline-plan-name">{editingPlan.planName}</h2>
              )}
              <button
                type="button"
                className="timeline-edit-btn"
                onClick={() => setIsEditingInfo((v) => !v)}
                title="Chỉnh thông tin kế hoạch"
              >
                {isEditingInfo ? <Check size={16} /> : <Edit3 size={16} />}
              </button>
            </div>
            {isEditingInfo ? (
              <textarea
                className="timeline-plan-desc-input"
                value={editingPlan.description || ''}
                onChange={(e) => setEditingPlan((p) => ({ ...p, description: e.target.value }))}
                placeholder="Mô tả kế hoạch..."
                rows={2}
              />
            ) : (
              editingPlan.description && (
                <p className="timeline-plan-desc">{editingPlan.description}</p>
              )
            )}
            <div className="timeline-plan-stats">
              <span><MapPin size={14} /> {destination}</span>
              <span><Clock size={14} /> {totalDays} ngày</span>
              <span><Navigation size={14} /> {editingPlan.days?.reduce((acc, d) => acc + d.items.length, 0)} điểm dừng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day Timeline */}
      <div className="timeline-days">
        {editingPlan.days?.map((day, dayIdx) => (
          <motion.div
            key={dayIdx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIdx * 0.1 }}
            className="timeline-day"
          >
            {/* Day Header */}
            <button 
              className="timeline-day-header"
              onClick={() => setExpandedDay(expandedDay === dayIdx ? -1 : dayIdx)}
            >
              <div className="timeline-day-badge">
                <span className="timeline-day-number">Ngày {day.dayNumber}</span>
                <span className="timeline-day-title">{day.title}</span>
                <span className="timeline-day-count">{day.items.length} địa điểm</span>
              </div>
              {expandedDay === dayIdx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {/* Day Items */}
            {expandedDay === dayIdx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="timeline-day-items"
              >
                <div className="timeline-line" />
                <div className="timeline-day-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleAddItem(dayIdx)}
                  >
                    <Plus size={14} /> Thêm từ danh sách gợi ý
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => openPickerForDay(dayIdx)}
                  >
                    <Search size={14} /> Chọn điểm đến...
                  </button>
                </div>
                
                <Reorder.Group
                  axis="y"
                  values={day.items}
                  onReorder={(newItems) => handleReorderDay(dayIdx, newItems)}
                  className="timeline-items-list"
                >
                  {day.items.map((item, itemIdx) => (
                    <Reorder.Item
                      key={item.locationId || item.locationName || itemIdx}
                      value={item}
                    >
                      <div className={`timeline-item ${editingItem === `${dayIdx}-${itemIdx}` ? 'editing' : ''}`}>
                        {/* Drag handle */}
                        <div className="timeline-item-drag">
                          <GripVertical size={16} />
                        </div>

                        {/* Timeline dot */}
                        <div className="timeline-item-dot">
                          <div className="timeline-dot-inner">{itemIdx + 1}</div>
                        </div>

                        {/* Item content */}
                        <div className="timeline-item-content">
                          <div className="timeline-item-header">
                            <h4 className="timeline-item-name">
                              <MapPin size={14} />
                              {item.locationName || item.location?.name || 'Địa điểm'}
                            </h4>
                            <button 
                              className="timeline-item-remove"
                              onClick={() => handleRemoveItem(dayIdx, itemIdx)}
                              title="Xóa"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Time editing */}
                          <div className="timeline-item-time">
                            {getTimeIcon(item.startTime)}
                            <input
                              type="time"
                              className="timeline-time-input"
                              value={item.startTime || ''}
                              onChange={(e) => handleEditTime(dayIdx, itemIdx, 'startTime', e.target.value)}
                            />
                            <span className="timeline-time-sep">→</span>
                            <input
                              type="time"
                              className="timeline-time-input"
                              value={item.endTime || ''}
                              onChange={(e) => handleEditTime(dayIdx, itemIdx, 'endTime', e.target.value)}
                            />
                            {item.travelMinutesToNext > 0 && (
                              <span className="timeline-travel-badge">
                                🚗 {item.travelMinutesToNext} phút
                              </span>
                            )}
                          </div>

                          {/* Location details */}
                          {item.location && (
                            <div className="timeline-item-details">
                              {item.location.estimatedCost > 0 && (
                                <span className="timeline-detail-tag">
                                  💰 {Number(item.location.estimatedCost).toLocaleString()}đ
                                </span>
                              )}
                              {item.location.suggestedDuration && (
                                <span className="timeline-detail-tag">
                                  ⏰ {item.location.suggestedDuration}
                                </span>
                              )}
                              {item.location.category && (
                                <span className="timeline-detail-tag">
                                  📍 {item.location.category}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Inline note editing */}
                          <div className={`timeline-item-note ${item.note ? 'has-content' : ''}`}>
                            <div className="timeline-note-header">
                              <StickyNote size={12} /> 
                              <span>Ghi chú {item.note && <Sparkles size={10} className="ai-note-sparkle" title="AI đã gợi ý ghi chú này" />}</span>
                            </div>
                            <textarea
                              className="timeline-note-textarea"
                              placeholder="Thêm ghi chú hoặc AI gợi ý..."
                              value={item.note || ''}
                              onChange={(e) => handleEditNote(dayIdx, itemIdx, e.target.value)}
                              rows={1}
                              onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {isPickerOpen && (
        <div className="timeline-modal-overlay" onClick={() => setIsPickerOpen(false)}>
          <div className="card timeline-modal" onClick={(e) => e.stopPropagation()}>
            <div className="timeline-modal-header">
              <div>
                <div className="timeline-modal-title">Chọn điểm đến để thêm</div>
                <div className="timeline-modal-subtitle">Tìm theo tên hoặc khu vực (ví dụ: “chợ”, “cafe”, “bãi biển”)</div>
              </div>
              <button className="timeline-modal-close" onClick={() => setIsPickerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="timeline-modal-search">
              <input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                className="timeline-modal-input"
                placeholder={`Tìm trong ${destination || 'khu vực'}`}
              />
              <button className="btn btn-primary" onClick={runPickerSearch} disabled={pickerLoading}>
                {pickerLoading ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </div>

            {pickerError && <div className="timeline-modal-error">{pickerError}</div>}

            <div className="timeline-modal-results">
              {pickerResults.map((loc) => {
                const locId = String(loc.id);
                const alreadyUsed = assignedLocationIds.has(locId);
                return (
                  <button
                    key={locId}
                    className={`timeline-result ${alreadyUsed ? 'disabled' : ''}`}
                    disabled={alreadyUsed}
                    onClick={() => {
                      addPickedLocationToDay(expandedDay >= 0 ? expandedDay : 0, loc);
                      setIsPickerOpen(false);
                    }}
                  >
                    <div className="timeline-result-main">
                      <div className="timeline-result-name">{loc.name}</div>
                      <div className="timeline-result-meta">{loc.address || loc.category || ''}</div>
                    </div>
                    <div className="timeline-result-action">{alreadyUsed ? 'Đã có' : 'Thêm'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineEditor;
