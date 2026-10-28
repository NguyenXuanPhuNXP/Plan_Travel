import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { itineraryService } from '../services/itineraryService';

const TripContext = createContext();

function normalizeTrip(trip) {
  if (!trip) return null;
  const title = trip.title || trip.name || 'Chuyến đi chưa đặt tên';
  const locations = Array.isArray(trip.locations)
    ? trip.locations
    : (Array.isArray(trip.items)
      ? trip.items.map((it) => (it && it.location ? { ...it.location, customName: it.customName, note: it.note } : it))
      : []);
  const items = Array.isArray(trip.items) ? trip.items : locations;
  const budget = trip.budget != null ? Number(trip.budget) : (trip.totalCost != null ? Number(trip.totalCost) : 0);
  const totalCost = trip.totalCost != null ? Number(trip.totalCost) : budget;

  return {
    ...trip,
    id: trip.id ? String(trip.id) : Date.now().toString(),
    title,
    name: title,
    locations,
    items,
    budget,
    totalCost,
    status: trip.status || 'upcoming',
    startDate: trip.startDate || trip.tripDate || null,
    endDate: trip.endDate || null,
    packingItems: Array.isArray(trip.packingItems) ? trip.packingItems : [],
    collaborators: Array.isArray(trip.collaborators) ? trip.collaborators : []
  };
}

export const TripProvider = ({ children }) => {
  const { user, loading } = useAuth();
  return <AccountTripProvider key={String(user?.id || 'guest')} userId={user?.id} authLoading={loading}>{children}</AccountTripProvider>;
};
const AccountTripProvider = ({ children, userId, authLoading }) => {
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchTrips = useCallback(async () => {
    if (!userId || authLoading) return [];
    setLoading(true);
    setError('');
    try {
      const data = await itineraryService.getAll();
      const next = data.map(normalizeTrip).filter(Boolean);
      setTrips(next);
      return next;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return [];
    } finally { setLoading(false); }
  }, [userId, authLoading]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) fetchTrips(); });
    return () => { active = false; };
  }, [fetchTrips]);
  const addTrip = useCallback(data => {
    const trip = normalizeTrip(data);
    if (!trip) return null;
    setTrips(prev => [trip, ...prev.filter(item => String(item.id) !== String(trip.id))]);
    return trip;
  }, []);
  const updateTrip = useCallback((id, data) => {
    setTrips(prev => prev.map(trip => String(trip.id) === String(id) ? normalizeTrip({ ...trip, ...data }) : trip));
  }, []);
  const deleteTrip = useCallback(async id => {
    await itineraryService.delete(id);
    setTrips(prev => prev.filter(trip => String(trip.id) !== String(id)));
  }, []);
  const getTripById = useCallback(id => trips.find(trip => String(trip.id) === String(id)), [trips]);
  return <TripContext.Provider value={{ trips, currentTrip, setCurrentTrip, addTrip, updateTrip, deleteTrip, getTripById, fetchTrips, loading, error }}>{children}</TripContext.Provider>;
};
export const useTrips = () => {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrips must be used within a TripProvider');
  return context;
};
