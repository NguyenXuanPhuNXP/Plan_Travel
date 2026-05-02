import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TripPlanner from './pages/TripPlanner';
import PlannerWizard from './pages/PlannerWizard';
import TripHistory from './pages/TripHistory';
import TripDetails from './pages/TripDetails';
import Profile from './pages/Profile';
import SharedTripView from './pages/SharedTripView';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Public shared trip view - no auth required */}
      <Route path="/shared/:token" element={<SharedTripView />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* New AI-powered wizard planner */}
      <Route path="/planner" element={
        <ProtectedRoute>
          <PlannerWizard />
        </ProtectedRoute>
      } />

      {/* Legacy planner (map-based) */}
      <Route path="/planner/map" element={
        <ProtectedRoute>
          <TripPlanner />
        </ProtectedRoute>
      } />
      
      <Route path="/history" element={
        <ProtectedRoute>
          <TripHistory />
        </ProtectedRoute>
      } />
      
      <Route path="/trip/:id" element={
        <ProtectedRoute>
          <TripDetails />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
