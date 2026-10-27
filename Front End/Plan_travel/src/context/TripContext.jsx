import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [trips, setTrips] = useState(() => {
    try {
      const stored = localStorage.getItem('travel_trips');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeTrip).filter(Boolean);
        }
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const remote = await itineraryService.getAll();
      if (Array.isArray(remote)) {
        const normalizedRemote = remote.map(normalizeTrip).filter(Boolean);
        // Merge with existing local-only fallback trips (e.g. itinerary_xxx) so they are preserved
        const stored = localStorage.getItem('travel_trips');
        let localTrips = [];
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              localTrips = parsed
                .filter(t => t && !/^\d+$/.test(String(t.id)))
                .map(normalizeTrip)
                .filter(Boolean);
            }
          } catch {
            // ignore
          }
        }
        const merged = [...normalizedRemote];
        for (const locTrip of localTrips) {
          if (!merged.some(t => String(t.id) === String(locTrip.id))) {
            merged.push(locTrip);
          }
        }
        setTrips(merged);
        localStorage.setItem('travel_trips', JSON.stringify(merged));
        setLoading(false);
        return merged;
      }
    } catch (err) {
      console.warn('Lỗi fetchTrips từ backend API:', err);
    }

    // Fallback local storage
    const storedTrips = localStorage.getItem('travel_trips');
    if (storedTrips) {
      try {
        const parsed = JSON.parse(storedTrips);
        const normalized = Array.isArray(parsed) ? parsed.map(normalizeTrip).filter(Boolean) : [];
        setTrips(normalized);
        setLoading(false);
        return normalized;
      } catch (e) {
        console.error('Lỗi nạp dữ liệu chuyến đi:', e);
      }
    }
    setLoading(false);
    return [];
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const addTrip = useCallback((tripData) => {
    const newTrip = normalizeTrip(tripData);
    setTrips((prevTrips) => {
      const existsIndex = prevTrips.findIndex((t) => String(t.id) === String(newTrip.id));
      let updated;
      if (existsIndex >= 0) {
        updated = [...prevTrips];
        updated[existsIndex] = { ...updated[existsIndex], ...newTrip };
      } else {
        updated = [newTrip, ...prevTrips];
      }
      localStorage.setItem('travel_trips', JSON.stringify(updated));
      return updated;
    });
    return newTrip;
  }, []);

  const updateTrip = useCallback((tripId, updates) => {
    setTrips((prevTrips) => {
      const updatedTrips = prevTrips.map((trip) =>
        String(trip.id) === String(tripId) ? normalizeTrip({ ...trip, ...updates }) : trip
      );
      localStorage.setItem('travel_trips', JSON.stringify(updatedTrips));
      return updatedTrips;
    });
  }, []);

  const deleteTrip = useCallback(async (tripId) => {
    setTrips((prevTrips) => {
      const updatedTrips = prevTrips.filter((trip) => String(trip.id) !== String(tripId));
      localStorage.setItem('travel_trips', JSON.stringify(updatedTrips));
      return updatedTrips;
    });
    try {
      await itineraryService.delete(tripId);
    } catch (err) {
      console.warn('Lỗi xóa lịch trình trên backend:', err);
    }
  }, []);

  const getTripById = useCallback((id) => {
    return trips.find((trip) => String(trip.id) === String(id));
  }, [trips]);

  return (
    <TripContext.Provider value={{ trips, currentTrip, setCurrentTrip, addTrip, updateTrip, deleteTrip, getTripById, fetchTrips, loading }}>
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
