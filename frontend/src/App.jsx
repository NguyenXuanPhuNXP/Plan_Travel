import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TripPlanner = lazy(() => import('./pages/TripPlanner'));
const PlannerWizard = lazy(() => import('./pages/PlannerWizard'));
const TripHistory = lazy(() => import('./pages/TripHistory'));
const TripDetails = lazy(() => import('./pages/TripDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const SharedTripView = lazy(() => import('./pages/SharedTripView'));
const GroupInvite = lazy(() => import('./pages/GroupInvite'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Explore = lazy(() => import('./pages/Explore'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminUserActivity = lazy(() => import('./pages/AdminUserActivity'));
const AdminPlans = lazy(() => import('./pages/AdminPlans'));
const AdminPlacesList = lazy(() => import('./pages/AdminPlacesList'));
const AdminPlaceCreate = lazy(() => import('./pages/AdminPlaceCreate'));
const AdminPlaceDetail = lazy(() => import('./pages/AdminPlaceDetail'));
const AdminPlaceEdit = lazy(() => import('./pages/AdminPlaceEdit'));
const AdminHotPlaceEdit = lazy(() => import('./pages/AdminHotPlaceEdit'));
import ChatWidget from './Components/Chat/ChatWidget';

const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
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
    <>
    <Suspense fallback={<PageLoader />}>
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

        <Route path="/admin/plans" element={
          <ProtectedRoute adminOnly>
            <AdminPlans />
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
    </Suspense>
    <ChatWidget />
    </>
  );
}

export default App;
