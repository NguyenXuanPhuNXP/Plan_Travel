import React, { createContext, useContext, useState, useEffect } from 'react';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);

  const fetchTrips = () => {
    const storedTrips = localStorage.getItem('travel_trips');
    if (storedTrips) {
      try {
        const parsed = JSON.parse(storedTrips);
        setTrips(parsed);
        return parsed;
      } catch (e) {
        console.error('Lỗi nạp dữ liệu chuyến đi:', e);
      }
    }
    return [];
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const addTrip = (tripData) => {
    const title = tripData.title || tripData.name || 'Chuyến đi chưa đặt tên';
    const locations = tripData.locations || tripData.items || [];
    const newTrip = {
      ...tripData,
      title,
      name: title,
      locations,
      id: tripData.id || Date.now().toString(),
      status: tripData.status || 'upcoming', // upcoming, ongoing, completed
      createdAt: new Date().toISOString(),
    };
    const updatedTrips = [...trips, newTrip];
    setTrips(updatedTrips);
    localStorage.setItem('travel_trips', JSON.stringify(updatedTrips));
    return newTrip;
  };

  const updateTrip = (tripId, updates) => {
    const updatedTrips = trips.map((trip) =>
      trip.id === tripId ? { ...trip, ...updates } : trip
    );
    setTrips(updatedTrips);
    localStorage.setItem('travel_trips', JSON.stringify(updatedTrips));
  };

  const deleteTrip = (tripId) => {
    const updatedTrips = trips.filter((trip) => trip.id !== tripId);
    setTrips(updatedTrips);
    localStorage.setItem('travel_trips', JSON.stringify(updatedTrips));
  };

  const getTripById = (id) => {
    return trips.find((trip) => String(trip.id) === String(id));
  };

  return (
    <TripContext.Provider value={{ trips, currentTrip, setCurrentTrip, addTrip, updateTrip, deleteTrip, getTripById, fetchTrips }}>
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
