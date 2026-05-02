import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { itineraryService } from '../services/itineraryService';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch trips from backend
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const data = await itineraryService.getAll();
      setTrips(data);
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
      setTrips(prev => [newTrip, ...prev]);
      return newTrip;
    } catch (error) {
      console.error('Failed to create trip:', error);
      // Fallback: local-only
      const localTrip = {
        ...tripData,
        id: Date.now().toString(),
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      setTrips(prev => [localTrip, ...prev]);
      return localTrip;
    }
  };

  const updateTrip = async (tripId, updates) => {
    try {
      const updated = await itineraryService.update(tripId, updates);
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updated } : t));
      return updated;
    } catch (error) {
      console.error('Failed to update trip:', error);
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, ...updates } : t));
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
