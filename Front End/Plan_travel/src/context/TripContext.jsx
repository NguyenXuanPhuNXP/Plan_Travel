import React, { createContext, useContext, useState, useEffect } from 'react';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const [trips, setTrips] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);

  useEffect(() => {
    const storedTrips = localStorage.getItem('travel_trips');
    if (storedTrips) {
      setTrips(JSON.parse(storedTrips));
    }
  }, []);

  const addTrip = (tripData) => {
    const newTrip = {
      ...tripData,
      id: Date.now().toString(),
      status: 'upcoming', // upcoming, ongoing, completed
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
    return trips.find((trip) => trip.id === id);
  };

  return (
    <TripContext.Provider value={{ trips, currentTrip, setCurrentTrip, addTrip, updateTrip, deleteTrip, getTripById }}>
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
