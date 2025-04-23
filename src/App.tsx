import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Assets from './pages/Assets';
import AssetDetails from './pages/AssetDetails';
import NewAsset from './pages/NewAsset';
import MyBookings from './pages/MyBookings';
import BookingDetails from './pages/FlightDetails';
import CreateBooking from './pages/MakeBookings';
import { AuthProvider, useAuth } from './context/AuthContext';
import ConfirmAccount from './pages/ConfirmAccount';
import ManageUsers from './pages/ManageUsers';
import AuthMiddleware from './middleware/AuthMiddleware';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminBookings from './pages/AdminBookings';
import AdminAssets from './pages/AdminAssets';
import AdminResources from './pages/AdminResources';
import AdminBookingDetails from './pages/AdminBookingDetails';
import AdminBookingUpload from './pages/AdminBookingUpload';
import AdminCompanies from './pages/AdminCompanies';

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }
  
  return isAuthenticated ? <AuthMiddleware>{children}</AuthMiddleware> : <Navigate to="/login" />;
};

// Add an admin-aware protected route component
const AdminAwareRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      // Only check for admin status if authenticated
      if (!isAuthenticated) {
        setCheckingAdmin(false);
        return;
      }
      
      try {
        // SPECIFICALLY check for Administrators group membership
        // Users with just the role "CompanyAdmin" or "User" should not be considered admins
        const token = localStorage.getItem('idToken');
        
        if (token) {
          // Check specifically for Administrators group in cognito:groups
          const { jwtDecode } = await import('jwt-decode');
          const decoded = jwtDecode<any>(token);
          const groups = decoded['cognito:groups'] || [];
          
          // Only consider a user an admin if they belong to the specific Administrators group
          const isInAdministratorsGroup = groups.includes('Administrators');
          
          if (isInAdministratorsGroup) {
            setIsUserAdmin(true);
            localStorage.setItem('isAdmin', 'true');
          } else {
            // If not in Administrators group, clear any incorrect flag
            localStorage.removeItem('isAdmin');
            setIsUserAdmin(false);
          }
        } else {
          localStorage.removeItem('isAdmin');
          setIsUserAdmin(false);
        }
      } catch (error) {
        setIsUserAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [isAdmin, isAuthenticated, loading, navigate]);
  
  if (loading || checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Redirect admins to admin dashboard
  if (isUserAdmin) {
    return <Navigate to="/admin-dashboard" />;
  }
  
  return <AuthMiddleware>{children}</AuthMiddleware>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/confirm-account" element={<ConfirmAccount />} />
      <Route path="/confirm" element={<ConfirmAccount />} />
      <Route path="/" element={<AdminAwareRoute><Dashboard /></AdminAwareRoute>} />
      <Route path="/dashboard" element={<AdminAwareRoute><Dashboard /></AdminAwareRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetails /></ProtectedRoute>} />
      <Route path="/new-asset" element={<ProtectedRoute><NewAsset /></ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
      <Route path="/flight-details/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
      <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
      <Route path="/make-booking" element={<ProtectedRoute><CreateBooking /></ProtectedRoute>} />
      <Route path="/create-booking" element={<ProtectedRoute><CreateBooking /></ProtectedRoute>} />
      <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
      <Route path="/admin-dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
      <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
      <Route path="/admin/users/add" element={<AdminProtectedRoute><div>Add User Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/users/edit/:id" element={<AdminProtectedRoute><div>Edit User Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/bookings" element={<AdminProtectedRoute><AdminBookings /></AdminProtectedRoute>} />
      <Route path="/admin/bookings/details/:bookingId" element={<AdminProtectedRoute><AdminBookingDetails /></AdminProtectedRoute>} />
      <Route path="/admin/bookings/upload/:bookingId" element={<AdminProtectedRoute><AdminBookingUpload /></AdminProtectedRoute>} />
      <Route path="/admin/assets" element={<AdminProtectedRoute><AdminAssets /></AdminProtectedRoute>} />
      <Route path="/admin/resources" element={<AdminProtectedRoute><AdminResources /></AdminProtectedRoute>} />
      <Route path="/admin/companies" element={<AdminProtectedRoute><AdminCompanies /></AdminProtectedRoute>} />
      <Route path="/admin/companies/add" element={<AdminProtectedRoute><div>Add Company Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/companies/edit/:id" element={<AdminProtectedRoute><div>Edit Company Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/companies/details/:id" element={<AdminProtectedRoute><div>Company Details Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/companies/:id/users" element={<AdminProtectedRoute><div>Company Users Page (Placeholder)</div></AdminProtectedRoute>} />
      {['/admin/companies', '/admin/bookings', '/admin/assets', '/admin/reports', 
        '/admin/alerts', '/admin/data', '/admin/security', '/admin/settings'].map(path => (
        <Route key={path} path={path} element={
          <AdminProtectedRoute>
            <div className="min-h-screen p-8">
              <h1 className="text-2xl font-bold mb-4">{path.split('/')[2]} Management</h1>
              <p>This is a placeholder for the {path.split('/')[2]} management page.</p>
            </div>
          </AdminProtectedRoute>
        } />
      ))}
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;