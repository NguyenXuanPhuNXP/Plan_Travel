import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './Components/Common/ErrorBoundary';
import PageLoader from './Components/Common/PageLoader';

// Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TripPlanner = lazy(() => import('./pages/TripPlanner'));
const PlannerWizard = lazy(() => import('./pages/PlannerWizard'));
const TripHistory = lazy(() => import('./pages/TripHistory'));
const TripDetails = lazy(() => import('./pages/TripDetails'));
const TripEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/trip/${id}?edit=1`} replace />;
};
const Profile = lazy(() => import('./pages/Profile'));
const SharedTripView = lazy(() => import('./pages/SharedTripView'));
const GroupInvite = lazy(() => import('./pages/GroupInvite'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Explore = lazy(() => import('./pages/Explore'));
const Community = lazy(() => import('./pages/Community'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminUserActivity = lazy(() => import('./pages/AdminUserActivity'));
const AdminPlans = lazy(() => import('./pages/AdminPlans'));
const AdminPlacesList = lazy(() => import('./pages/AdminPlacesList'));
const AdminPlaceCreate = lazy(() => import('./pages/AdminPlaceCreate'));
const AdminPlaceDetail = lazy(() => import('./pages/AdminPlaceDetail'));
const AdminPlaceEdit = lazy(() => import('./pages/AdminPlaceEdit'));
const AdminHotPlaceEdit = lazy(() => import('./pages/AdminHotPlaceEdit'));
const Business = lazy(() => import('./pages/Business'));
const BusinessOverview = lazy(() => import('./pages/BusinessOverview'));
const BusinessReviews = lazy(() => import('./pages/BusinessReviews'));
const BusinessReports = lazy(() => import('./pages/BusinessReports'));
const BusinessPlaces = lazy(() => import('./pages/BusinessPlaces'));
const AdminBusiness = lazy(() => import('./pages/AdminBusiness'));
const Forbidden = lazy(() => import('./pages/Forbidden'));

import ChatWidget from './Components/Chat/ChatWidget';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  const role = user.role === 1 || user.role === 'admin' ? 'admin' : user.role === 2 || user.role === 'business' ? 'business' : 'user';
  if ((adminOnly && role !== 'admin') || (roles && !roles.includes(role))) {
    return <Navigate to="/forbidden" state={{ from: location.pathname }} replace />;
  }

  return children;
};

function App() {
  const location = useLocation();
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forbidden" element={<Forbidden />} />

          {/* Public shared trip & group invite view - no auth required */}
          <Route path="/shared/:token" element={<SharedTripView />} />
          <Route path="/group-invite/:token" element={<GroupInvite />} />

          <Route path="/" element={<LandingPage />} />
          <Route path="/community" element={<Community />} />

          <Route path="/dashboard" element={
            <ProtectedRoute roles={['user']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* AI-powered wizard planner */}
          <Route path="/planner" element={
            <ProtectedRoute roles={['user']}>
              <PlannerWizard />
            </ProtectedRoute>
          } />

          {/* Quick AI Planner */}
          <Route path="/ai-planner" element={
            <ProtectedRoute roles={['user']}>
              <PlannerWizard />
            </ProtectedRoute>
          } />

          {/* Manual map-based planner */}
          <Route path="/planner/map" element={
            <ProtectedRoute roles={['user']}>
              <TripPlanner />
            </ProtectedRoute>
          } />
          <Route path="/planner/manual" element={
            <ProtectedRoute roles={['user']}>
              <TripPlanner />
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute roles={['user']}>
              <TripHistory />
            </ProtectedRoute>
          } />

          <Route path="/trip/:id" element={
            <ProtectedRoute roles={['user']}>
              <TripDetails />
            </ProtectedRoute>
          } />
          <Route path="/trip/:id/edit" element={<ProtectedRoute roles={['user']}><TripEditRedirect /></ProtectedRoute>} />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/business" element={<ProtectedRoute><BusinessOverview /></ProtectedRoute>} />
          <Route path="/business/registration" element={<ProtectedRoute><Business /></ProtectedRoute>} />
          <Route path="/business/:id/edit" element={<ProtectedRoute roles={['business']}><Business /></ProtectedRoute>} />
          <Route path="/business/reviews" element={<ProtectedRoute roles={['business']}><BusinessReviews /></ProtectedRoute>} />
          <Route path="/business/reports" element={<ProtectedRoute roles={['business']}><BusinessReports /></ProtectedRoute>} />
          <Route path="/business/places" element={<ProtectedRoute><BusinessPlaces /></ProtectedRoute>} />
          <Route path="/business/places/:id" element={<ProtectedRoute><BusinessPlaces /></ProtectedRoute>} />

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

          {/* Admin Routes */}
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
          <Route path="/admin/business" element={<ProtectedRoute adminOnly><AdminBusiness /></ProtectedRoute>} />

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

      {/* Floating Real-time Messaging / Chat Widget */}
      {location.pathname !== '/' && <ChatWidget />}
    </ErrorBoundary>
  );
}

export default App;
