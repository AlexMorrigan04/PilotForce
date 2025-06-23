import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import SubUserProtectedRoute from './components/SubUserProtectedRoute';
import NavigationHandler from './components/NavigationHandler';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminBookings from './pages/AdminBookings';
import AdminAssets from './pages/AdminAssets';
import AdminResources from './pages/AdminResources';
import AdminBookingDetails from './pages/AdminBookingDetails';
import AdminBookingUpload from './pages/AdminBookingUpload';
import AdminCompanies from './pages/AdminCompanies';
import OAuthCallback from './pages/OAuthCallback';
import MicrosoftCallback from './components/MicrosoftCallback';
import RequestAccess from './pages/RequestAccess';
import WaitingForApproval from './pages/WaitingForApproval';
import AdminAssetDetails from './pages/AdminAssetDetails';
import CompanyUsers from './pages/CompanyUsers';
import FlightDataView from './pages/FlightDataView';
import UserProfile from './pages/UserProfile';
import AdminSystemLogs from './pages/AdminSystemLogs';

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If user is a SubUser, only allow access to booking-related routes and assets
  if (user?.role?.toLowerCase() === 'subuser') {
    const allowedPaths = [
      '/my-bookings',
      '/flight-details',
      '/flight-data',
      '/bookings',
      '/assets',  // Allow access to assets page
      '/make-booking',  // Allow creating new bookings
      '/create-booking',  // Alternative booking creation path
      '/new-asset',
      '/profile'  // Allow access to profile page
    ];
    
    const isAllowedPath = allowedPaths.some(path => 
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
    
    if (!isAllowedPath) {
      return <Navigate to="/my-bookings" />;
    }
  }
  
  return <AuthMiddleware>{children}</AuthMiddleware>;
};

// Add an admin-aware protected route component
const AdminAwareRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, isAdmin, user } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated) {
        setCheckingAdmin(false);
        return;
      }
      try {
        const token = localStorage.getItem('idToken');
        let isInAdministratorGroup = false;
        let role = null;
        
        if (token) {
          const { jwtDecode } = await import('jwt-decode');
          const decoded = jwtDecode<any>(token);
          const groups = decoded['cognito:groups'] || [];
          isInAdministratorGroup = groups.some((g: string) => g.toLowerCase() === 'administrator');
          
          // Extract role from token, prioritizing custom:role
          role = decoded['custom:role'] || decoded['custom:userRole'] || decoded.role;
        }
        
        // Also check user object for role
        const userRole = user?.['custom:role'] || user?.role || user?.['custom:userRole'];
        role = role || userRole;
        
        setUserRole(role);
        
        // Check for admin roles - case insensitive comparison
        const isAdminRole = role && ['administrator', 'admin'].includes(role.toLowerCase());
        
        if (isInAdministratorGroup || isAdminRole) {
                    setIsUserAdmin(true);
          localStorage.setItem('isAdmin', 'true');
          // Immediately redirect to admin dashboard
          navigate('/admin-dashboard', { replace: true });
        } else if (role?.toLowerCase() === 'subuser') {
          // Redirect SubUsers to /my-bookings
          navigate('/my-bookings', { replace: true });
        } else {
                    localStorage.removeItem('isAdmin');
          setIsUserAdmin(false);
          
          // Store role information for regular users
          if (role) {
            localStorage.setItem('userRole', role);
          }
        }
      } catch (error) {
        setIsUserAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdminStatus();
  }, [isAdmin, isAuthenticated, loading, navigate, user]);
  
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
  
  // If user is authenticated and has a valid role, allow access to user dashboard
  return <AuthMiddleware>{children}</AuthMiddleware>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/confirm-account" element={<ConfirmAccount />} />
      <Route path="/confirm" element={<ConfirmAccount />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/auth/microsoft/callback" element={<MicrosoftCallback />} />
      <Route path="/request-access" element={<RequestAccess />} />
      <Route path="/" element={<AdminAwareRoute><Dashboard /></AdminAwareRoute>} />
      <Route path="/dashboard" element={<AdminAwareRoute><Dashboard /></AdminAwareRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetails /></ProtectedRoute>} />
      <Route path="/new-asset" element={<ProtectedRoute><NewAsset /></ProtectedRoute>} />
      <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
      <Route path="/flight-details/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
      <Route path="/flight-data/:bookingId" element={<ProtectedRoute><FlightDataView /></ProtectedRoute>} />
      <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetails /></ProtectedRoute>} />
      <Route path="/make-booking" element={<ProtectedRoute><CreateBooking /></ProtectedRoute>} />
      <Route path="/create-booking" element={<ProtectedRoute><CreateBooking /></ProtectedRoute>} />
      <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/admin-dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
      <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
      <Route path="/admin/users/add" element={<AdminProtectedRoute><div>Add User Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/users/edit/:id" element={<AdminProtectedRoute><div>Edit User Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/bookings" element={<AdminProtectedRoute><AdminBookings /></AdminProtectedRoute>} />
      <Route path="/admin/bookings/details/:bookingId" element={<AdminProtectedRoute><AdminBookingDetails /></AdminProtectedRoute>} />
      <Route path="/admin/bookings/upload/:bookingId" element={<AdminProtectedRoute><AdminBookingUpload /></AdminProtectedRoute>} />
      <Route path="/admin/assets" element={<AdminProtectedRoute><AdminAssets /></AdminProtectedRoute>} />
      <Route path="/admin/assets/details/:assetId" element={<AdminProtectedRoute><AdminAssetDetails /></AdminProtectedRoute>} />
      <Route path="/admin/resources" element={<AdminProtectedRoute><AdminResources /></AdminProtectedRoute>} />
      <Route path="/admin/companies" element={<AdminProtectedRoute><AdminCompanies /></AdminProtectedRoute>} />
      <Route path="/admin/system-logs" element={<AdminProtectedRoute><AdminSystemLogs /></AdminProtectedRoute>} />
      <Route path="/admin/companies/add" element={<AdminProtectedRoute><div>Add Company Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/companies/edit/:id" element={<AdminProtectedRoute><div>Edit Company Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/companies/details/:id" element={<AdminProtectedRoute><div>Company Details Page (Placeholder)</div></AdminProtectedRoute>} />
      <Route path="/admin/companies/:companyId/users" element={<CompanyUsers />} />
      <Route path="/waiting-for-approval" element={<ProtectedRoute><WaitingForApproval /></ProtectedRoute>} />
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
      {/* Catch-all route for SubUsers - redirect to /my-bookings */}
      <Route path="*" element={<Navigate to="/my-bookings" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <NavigationHandler>
          <AppRoutes />
        </NavigationHandler>
      </Router>
    </AuthProvider>
  );
}

export default App;