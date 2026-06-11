import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { itineraryService } from '../services/itineraryService';

const TripContext = createContext();

const toUiStatus = (status) => {
  if (status === 'generated') return 'ongoing';
  if (status === 'draft') return 'upcoming';
  if (status === 'cancelled') return 'completed';
  return status || 'upcoming';
};

const toBackendStatus = (status) => {
  if (status === 'upcoming') return 'draft';
  if (status === 'ongoing') return 'generated';
  return status;
};

const parseDayNumberFromNote = (note) => {
  const text = String(note || '');
  const match = text.match(/\[DAY:(\d+)\]/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const stripDayMarker = (note) => String(note || '').replace(/\[DAY:\d+\]\s*/gi, '').trim();

const normalizeLocation = (loc) => {
  if (!loc) return null;
  return {
    id: String(loc.id),
    name: loc.name || 'Địa điểm',
    address: loc.address || '',
    lat: loc.lat ?? loc.latitude ?? null,
    lng: loc.lng ?? loc.longitude ?? null,
    image: loc.image || loc.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1',
    estimatedCost: loc.estimatedCost ?? 0,
    suggestedDuration: loc.suggestedDuration || null,
    category: loc.category || null
  };
};

const normalizeTrip = (trip) => {
  const items = Array.isArray(trip?.items) ? trip.items : [];
  const normalizedItems = items.map((item, index) => ({
    ...item,
    id: String(item?.id || `item_${index}`),
    dayNumber: parseDayNumberFromNote(item?.note) || 1,
    note: stripDayMarker(item?.note),
    location: normalizeLocation(item?.location)
  }));

  const itemLocations = normalizedItems
    .map((item) => normalizeLocation(item?.location))
    .filter(Boolean);

  const locations = Array.isArray(trip?.locations)
    ? trip.locations.map((loc) => normalizeLocation(loc)).filter(Boolean)
    : itemLocations;

  return {
    ...trip,
    id: String(trip?.id),
    rawStatus: trip?.status || 'draft',
    status: toUiStatus(trip?.status),
    title: trip?.title || trip?.name || 'Chuyến đi',
    notes: trip?.notes || trip?.description || '',
    startLocation: trip?.startLocation || '',
    endLocation: trip?.endLocation || '',
    budget: trip?.budget ? Number(trip.budget) : 0,
    locations,
    items: normalizedItems
  };
};

export const TripProvider = ({ children }) => {
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch trips from backend
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const data = await itineraryService.getAll();
      setTrips((data || []).map(normalizeTrip));
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      // Fallback to localStorage for offline
      const stored = localStorage.getItem('travel_trips');
      if (stored) setTrips(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchTrips();
    }
  }, [fetchTrips]);

  const addTrip = async (tripData) => {
    try {
      const newTrip = await itineraryService.create(tripData);
      const normalized = normalizeTrip(newTrip);
      setTrips(prev => [normalized, ...prev]);
      return normalized;
    } catch (error) {
      console.error('Failed to create trip:', error);
      throw error;
    }
  };

  const updateTrip = async (tripId, updates) => {
    const payload = {
      ...updates,
      status: updates.status ? toBackendStatus(updates.status) : updates.status
    };
    try {
      const updated = await itineraryService.update(tripId, payload);
      const normalized = normalizeTrip(updated);
      setTrips(prev => prev.map(t => {
        if (t.id !== String(tripId)) return t;

        const hasUpdatedLocations = normalized.locations.length > 0;
        return {
          ...t,
          ...normalized,
          locations: hasUpdatedLocations ? normalized.locations : t.locations
        };
      }));
      return normalized;
    } catch (error) {
      console.error('Failed to update trip:', error);
      setTrips(prev => prev.map(t => t.id === String(tripId) ? { ...t, ...updates } : t));
    }
  };

  const deleteTrip = async (tripId) => {
    try {
      await itineraryService.delete(tripId);
      setTrips(prev => prev.filter(t => t.id !== tripId));
    } catch (error) {
      console.error('Failed to delete trip:', error);
      setTrips(prev => prev.filter(t => t.id !== tripId));
    }
  };

  const getTripById = (id) => {
    return trips.find((trip) => trip.id === id || trip.id === String(id));
  };

  return (
    <TripContext.Provider value={{ 
      trips, 
      currentTrip, 
      setCurrentTrip, 
      addTrip, 
      updateTrip, 
      deleteTrip, 
      getTripById, 
      fetchTrips,
      loading 
    }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrips = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};
