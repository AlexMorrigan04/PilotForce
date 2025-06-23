import React, { useState, useEffect } from 'react';
// Comment out react-bootstrap imports until dependency is installed
// import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import * as adminService from '../services/adminService';
import AdminBookingsList from '../components/admin/AdminBookingsList';
import { Link } from 'react-router-dom';
import AdminNavbar from '../components/common/Navbar';
import { 
  FiUsers, FiGrid, FiCalendar, FiClock, FiCheckCircle, 
  FiXCircle, FiRefreshCw, FiPackage, FiMap, FiSettings 
} from 'react-icons/fi';

interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Define the interface for dashboard statistics
interface DashboardStats {
  users: number;
  companies: number;
  bookings: number;
  activeBookings: number;
  completedBookings: number;
}

const AdminDashboard: React.FC = () => {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    companies: 0,
    bookings: 0,
    activeBookings: 0,
    completedBookings: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    // Don't proceed if auth is still loading
    if (authLoading) {
      return;
    }

    // Check authentication status
    if (!isAuthenticated) {
      setError('You must be logged in to view this page');
      return;
    }

    // Check admin status
    if (!isAdmin) {
      setError('You must be an admin to view this page');
      return;
    }

    // Load dashboard data when component mounts and auth is ready
    loadDashboardData();
  }, [isAuthenticated, isAdmin, authLoading]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      // Fetch users and bookings in parallel
      const [usersResponse, bookingsResponse] = await Promise.all([
        adminService.getAllUsers().catch(error => {
          throw new Error(`Failed to fetch users: ${error.message}`);
        }),
        adminService.getAllBookings().catch(error => {
          throw new Error(`Failed to fetch bookings: ${error.message}`);
        })
      ]);
      // Extract actual data from responses
      const users = (usersResponse && usersResponse.users) ? usersResponse.users as User[] : [];
      const bookings = (bookingsResponse && bookingsResponse.bookings) ? bookingsResponse.bookings : [];
      // Calculate active bookings
      const activeBookings = bookings.filter(booking => 
        booking.status === 'scheduled' || booking.status === 'pending'
      ).length;
      const completedBookings = bookings.filter(booking => 
        booking.status === 'completed'
      ).length;
      
      // Sort bookings by date (newest first) and take the first 5
      const sortedBookings = bookings
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date || 0);
          const dateB = new Date(b.createdAt || b.date || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      
      // Update state
      setStats({
        users: users.length,
        companies: new Set(users.map((user: User) => user.companyId)).size,
        bookings: bookings.length,
        activeBookings,
        completedBookings
      });
      setRecentBookings(sortedBookings);
      setError(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setError(errorMessage);
      setStats({
        users: 0,
        companies: 0,
        bookings: 0,
        activeBookings: 0,
        completedBookings: 0
      });
      setRecentBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Verifying Admin Access</h2>
            <p className="text-sm text-gray-500 mt-2">Please wait while we verify your credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Loading Dashboard</h2>
            <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiXCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Admin Dashboard
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={refreshing}
            >
              <FiRefreshCw className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 rounded-lg p-3">
                    <FiCalendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">{stats.bookings}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <FiClock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Bookings</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">{stats.activeBookings}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-green-100 rounded-lg p-3">
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">{stats.completedBookings}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-purple-100 rounded-lg p-3">
                    <FiUsers className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">{stats.users}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="bg-indigo-100 rounded-lg p-3">
                    <FiPackage className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Companies</dt>
                  <dd className="mt-1 text-xl font-semibold text-gray-900">{stats.companies}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                to="/admin/bookings"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div className="flex-shrink-0">
                  <FiCalendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Manage Bookings</p>
                  <p className="text-sm text-gray-500">View and manage all bookings</p>
                </div>
              </Link>

              <Link
                to="/admin/users"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div className="flex-shrink-0">
                  <FiUsers className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Manage Users</p>
                  <p className="text-sm text-gray-500">View and manage user accounts</p>
                </div>
              </Link>

              <Link
                to="/admin/assets"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div className="flex-shrink-0">
                  <FiMap className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Manage Assets</p>
                  <p className="text-sm text-gray-500">View and manage asset locations</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Bookings</h2>
            <Link
              to="/admin/bookings"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View All
            </Link>
          </div>
          <div className="overflow-hidden">
            <AdminBookingsList limit={5} showActions={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
