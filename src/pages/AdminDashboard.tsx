import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import * as adminService from '../services/adminService';
import { 
  FiUsers, FiBriefcase, FiCalendar, FiPieChart, FiSettings, 
  FiMapPin, FiClock, FiAlertCircle, FiFileText 
} from 'react-icons/fi';

const AdminDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const navigate = useNavigate();

  // Stats for the dashboard
  const [stats, setStats] = useState({
    users: 0,
    companies: 0,
    bookings: 0,
    activeBookings: 0
  });

  // Add useEffect to fetch dashboard data when component mounts
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Verify admin status on component mount
  useEffect(() => {
    const validateAdmin = async () => {
      // Ignore loading state to prevent flicker
      if (isAdmin) {
        console.log('Admin status already confirmed by context');
        return;
      }
      
      // Check if admin via local storage
      if (localStorage.getItem('isAdmin') === 'true') {
        console.log('Admin status confirmed via localStorage');
        return;
      }
      
      // Verify via available methods
      try {
        // First check if the utils/authProxy module exists
        try {
          const { isAdminLocally } = await import('../utils/authProxy');
          if (isAdminLocally && isAdminLocally()) {
            console.log('Admin status confirmed via local check');
            return;
          }
        } catch (importErr) {
          console.warn('Could not import authProxy utilities:', importErr);
          // Continue with other checks if import fails
        }
        
        // Use adminUtils directly
        const { checkAdminStatus } = await import('../utils/adminUtils');
        if (checkAdminStatus) {
          const isAdminApi = await checkAdminStatus();
          if (!isAdminApi) {
            console.warn('User is not confirmed as admin, redirecting to dashboard');
            setError('You do not have permission to access this page');
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          }
        } else {
          console.warn('checkAdminStatus not available, using fallback check');
          
          // Fallback check using token directly
          const token = localStorage.getItem('idToken');
          if (token) {
            try {
              const { isAdminFromToken } = await import('../utils/adminUtils');
              if (!isAdminFromToken(token)) {
                setError('You do not have permission to access this page');
                setTimeout(() => {
                  navigate('/dashboard');
                }, 2000);
              }
            } catch (e) {
              console.error('Error checking admin status from token:', e);
            }
          }
        }
      } catch (err) {
        console.error('Error verifying admin status:', err);
        setError('Error verifying admin permissions');
      }
    };
    
    validateAdmin();
  }, [isAdmin, navigate]);

  // Fetch real data for the dashboard
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching dashboard data...');
      
      // Check if the admin service methods are available
      if (!adminService.getAllUsers || !adminService.getAllBookings) {
        console.error('Admin service methods not available. Using mock data instead.');
        // Use mock data as fallback
        setStats({
          users: 15,
          companies: 3,
          bookings: 24,
          activeBookings: 8
        });
        
        setRecentUsers([
          { UserId: '1', Username: 'john_doe', Email: 'john@example.com', UserRole: 'Admin', CreatedAt: new Date().toISOString() },
          { UserId: '2', Username: 'jane_smith', Email: 'jane@example.com', UserRole: 'User', CreatedAt: new Date().toISOString() }
        ]);
        
        setRecentBookings([
          { id: 'b1', title: 'Building Survey', status: 'confirmed', createdAt: new Date().toISOString(), jobTypes: 'Survey' },
          { id: 'b2', title: 'Site Inspection', status: 'pending', createdAt: new Date().toISOString(), jobTypes: 'Inspection' }
        ]);
        
        setLoading(false);
        return;
      }
      
      // Fetch real data
      try {
        // Fetch users, bookings and calculate stats
        const [usersResponse, bookingsResponse] = await Promise.all([
          adminService.getAllUsers(),
          adminService.getAllBookings()
        ]);
        
        console.log('Received API responses:', { usersResponse, bookingsResponse });
        
        // Get actual data from responses
        const users = (usersResponse && usersResponse.users) ? usersResponse.users : [];
        const bookings = (bookingsResponse && bookingsResponse.bookings) ? bookingsResponse.bookings : [];
        
        console.log(`Received ${users.length} users and ${bookings.length} bookings`);
        
        // Calculate active bookings
        const activeBookingCount = bookings.filter((booking: any) => 
          booking.status === 'confirmed' || booking.status === 'in-progress'
        ).length;
        
        // Set the statistics
        setStats({
          users: users.length,
          companies: new Set(users.map((user: any) => user.CompanyId || user.companyId)).size,
          bookings: bookings.length,
          activeBookings: activeBookingCount
        });
        
        // Get recent users and bookings for quick access
        const sortedUsers = [...users]
          .sort((a, b) => new Date(b.CreatedAt || b.createdAt || 0).getTime() - new Date(a.CreatedAt || a.createdAt || 0).getTime())
          .slice(0, 5);
          
        const sortedBookings = [...bookings]
          .sort((a, b) => new Date(b.createdAt || b.CreatedAt || 0).getTime() - new Date(a.createdAt || a.CreatedAt || 0).getTime())
          .slice(0, 5);
        
        setRecentUsers(sortedUsers);
        setRecentBookings(sortedBookings);
      } catch (apiErr) {
        console.error('API error fetching dashboard data:', apiErr);
        throw apiErr;
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      
      // Provide fallback data so UI is not empty
      setStats({
        users: 0,
        companies: 0,
        bookings: 0,
        activeBookings: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick actions for admin tasks
  const quickActions = [
    { name: 'Add User', icon: <FiUsers />, path: '/admin/users/add' },
    { name: 'View Bookings', icon: <FiCalendar />, path: '/admin/bookings' },
    { name: 'View Resources', icon: <FiFileText />, path: '/admin/resources' },
    { name: 'System Settings', icon: <FiSettings />, path: '/admin/settings' }
  ];

  // Format job types from array or string
  const formatJobTypes = (jobTypes: any): string => {
    if (!jobTypes) return 'General Booking';
    if (Array.isArray(jobTypes)) return jobTypes.join(', ');
    return String(jobTypes);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name || 'Admin'}</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))
          ) : (
            <>
              <StatCard 
                title="Total Users" 
                value={stats.users} 
                icon={<FiUsers className="w-6 h-6" />}
                color="blue"
                path="/admin/users"
              />
              <StatCard 
                title="Companies" 
                value={stats.companies} 
                icon={<FiBriefcase className="w-6 h-6" />}
                color="indigo"
                path="/admin/companies"
              />
              <StatCard 
                title="Total Bookings" 
                value={stats.bookings} 
                icon={<FiCalendar className="w-6 h-6" />}
                color="purple"
                path="/admin/bookings"
              />
              <StatCard 
                title="Active Bookings" 
                value={stats.activeBookings} 
                icon={<FiClock className="w-6 h-6" />}
                color="green"
                path="/admin/bookings?status=active"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition duration-200"
              >
                <span className="mr-2">{action.icon}</span>
                {action.name}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Recent Users */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900">Recent Users</h2>
              <button 
                onClick={() => navigate('/admin/users')} 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentUsers && recentUsers.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentUsers.map((user: any) => (
                    <li key={user?.UserId || user?.id || `user-${Math.random()}`} className="py-3">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                            {(user?.Name || user?.Username || 'U').charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.Name || user?.Username || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {user?.Email || user?.email || 'No email'}
                          </p>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${((user?.UserRole || user?.role || '').toString().toLowerCase().includes('admin')) ? 
                              'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {user?.UserRole || user?.role || 'User'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-4 text-gray-500">No recent users found</p>
              )}
            </div>
          </div>
          
          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900">Recent Bookings</h2>
              <button 
                onClick={() => navigate('/admin/bookings')} 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : recentBookings && recentBookings.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentBookings.map((booking: any) => (
                    <li key={booking?.BookingId || booking?.id || `booking-${Math.random()}`} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formatJobTypes(booking?.jobTypes) || 
                             booking?.title || 
                             `Booking at ${booking?.location?.substring(0, 15) || 'Unknown Location'}`}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {booking?.assetName ? `Asset: ${booking.assetName}` : ''} 
                            {booking?.flightDate ? ` • ${new Date(booking.flightDate).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${booking?.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                              booking?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {booking?.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-4 text-gray-500">No recent bookings found</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  path: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, path }) => {
  const navigate = useNavigate();
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-blue-500 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(path)}
      style={{ borderTopColor: `var(--${color}-500)` }}
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorMap[color] || 'bg-blue-500'} text-white mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
