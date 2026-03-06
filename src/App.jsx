import { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assets = lazy(() => import('./pages/Assets'));
const AssignAsset = lazy(() => import('./pages/AssignAsset'));
const BranchUserManagement = lazy(() => import('./pages/BranchUserManagement'));
const TransferRequests = lazy(() => import('./pages/TransferRequests'));
const ReassignmentRequests = lazy(() => import('./pages/ReassignmentRequests'));
const AssetApproval = lazy(() => import('./pages/AssetApproval'));
const ReminderSettings = lazy(() => import('./pages/ReminderSettings'));
const AssetRusak = lazy(() => import('./pages/AssetRusak'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-neutral-900"></div>
      <p className="mt-4 text-neutral-500 text-sm">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Protected Routes — each wrapped with ErrorBoundary for isolation */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
        
        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Assets />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/assign-asset"
          element={
            <ProtectedRoute requiredRole="Admin Cabang">
              <ErrorBoundary>
                <AssignAsset />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/branch-management"
          element={
            <ProtectedRoute requiredRole="Admin Pusat">
              <ErrorBoundary>
                <BranchUserManagement />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/transfer-requests"
          element={
            <ProtectedRoute requiredRole="Admin Pusat">
              <ErrorBoundary>
                <TransferRequests />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reassignment-requests"
          element={
            <ProtectedRoute requiredRole="Admin Pusat">
              <ErrorBoundary>
                <ReassignmentRequests />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/asset-approval"
          element={
            <ProtectedRoute requiredRole="Admin Pusat">
              <ErrorBoundary>
                <AssetApproval />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reminder-settings"
          element={
            <ProtectedRoute requiredRole="Admin Pusat">
              <ErrorBoundary>
                <ReminderSettings />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        <Route
          path="/asset-rusak"
          element={
            <ProtectedRoute requiredRole="Admin Pusat">
              <ErrorBoundary>
                <AssetRusak />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 - Not Found */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
