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
import GroupInvite from './pages/GroupInvite';
import Notifications from './pages/Notifications';
import Explore from './pages/Explore';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminUserActivity from './pages/AdminUserActivity';
import AdminExplore from './pages/AdminExplore';
import AdminLocations from './pages/AdminLocations';
import AdminPlaces from './pages/AdminPlaces';
import AdminPlacesList from './pages/AdminPlacesList';
import AdminPlaceCreate from './pages/AdminPlaceCreate';
import AdminPlaceDetail from './pages/AdminPlaceDetail';
import AdminPlaceEdit from './pages/AdminPlaceEdit';
import AdminHotPlaceEdit from './pages/AdminHotPlaceEdit';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
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

  if (adminOnly && !(user.role === 1 || user.role === 'admin')) {
    return <Navigate to="/" />;
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
      <Route path="/group-invite/:token" element={<GroupInvite />} />
      
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

      <Route path="/explore" element={
        <ProtectedRoute>
          <Explore />
        </ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute adminOnly>
          <AdminUsers />
        </ProtectedRoute>
      } />

      <Route path="/admin/users/:id/activity" element={
        <ProtectedRoute adminOnly>
          <AdminUserActivity />
        </ProtectedRoute>
      } />

      <Route path="/admin/places" element={
        <ProtectedRoute adminOnly>
          <AdminPlacesList />
        </ProtectedRoute>
      } />

      <Route path="/admin/places/new" element={
        <ProtectedRoute adminOnly>
          <AdminPlaceCreate />
        </ProtectedRoute>
      } />

      <Route path="/admin/places/:id" element={
        <ProtectedRoute adminOnly>
          <AdminPlaceDetail />
        </ProtectedRoute>
      } />

      <Route path="/admin/places/:id/edit" element={
        <ProtectedRoute adminOnly>
          <AdminPlaceEdit />
        </ProtectedRoute>
      } />

      <Route path="/admin/places/hot/:id/edit" element={
        <ProtectedRoute adminOnly>
          <AdminHotPlaceEdit />
        </ProtectedRoute>
      } />

      <Route path="/admin/explore" element={
        <ProtectedRoute adminOnly>
          <Navigate to="/admin/places" replace />
        </ProtectedRoute>
      } />

      <Route path="/admin/locations" element={
        <ProtectedRoute adminOnly>
          <Navigate to="/admin/places" replace />
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
