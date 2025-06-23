import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiFileText, FiShield } from 'react-icons/fi';

// Interface for dashboard props
interface AdminDashboardProps {
  stats: {
    totalUsers: number;
    totalBookings: number;
    totalCompanies: number;
    activeBookings: number;
  };
  recentUsers: any[];
  recentBookings: any[];
  isLoading: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  stats, 
  recentUsers, 
  recentBookings, 
  isLoading 
}) => {
  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminStatCard 
          title="Total Users" 
          value={stats.totalUsers}
          icon={<FiUsers className="h-6 w-6" />}
          color="blue"
          link="/admin/users"
        />
        <AdminStatCard 
          title="Active Bookings" 
          value={stats.activeBookings}
          icon={<FiCalendar className="h-6 w-6" />}
          color="green"
          link="/admin/bookings"
        />
        <AdminStatCard 
          title="Total Bookings" 
          value={stats.totalBookings}
          icon={<FiFileText className="h-6 w-6" />}
          color="purple"
          link="/admin/bookings"
        />
        <AdminStatCard 
          title="Companies" 
          value={stats.totalCompanies}
          icon={<FiShield className="h-6 w-6" />}
          color="orange"
          link="/admin/companies"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800">Recent Users</h2>
            <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm">View All</Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : recentUsers.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {recentUsers.map((user) => (
                  <div key={user.UserId || user.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{user.Username || user.Name || user.email}</p>
                      <p className="text-sm text-gray-500">{user.Email}</p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      (user.UserRole || user.role || '').toLowerCase() === 'admin' || 
                      (user.UserRole || user.role || '').toLowerCase() === 'administrator' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.UserRole || user.role || 'User'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-4 text-center">No users found</p>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-blue-600 hover:text-blue-800 text-sm">View All</Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : recentBookings.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{booking.title || `Booking #${booking.id.slice(0,8)}`}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(booking.createdAt || booking.date || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-4 text-center">No bookings found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for stat cards
interface AdminStatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
  link: string;
}

const AdminStatCard: React.FC<AdminStatCardProps> = ({ title, value, icon, color, link }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-500/10',
    green: 'bg-green-50 text-green-600 ring-green-500/10',
    orange: 'bg-orange-50 text-orange-600 ring-orange-500/10',
    purple: 'bg-purple-50 text-purple-600 ring-purple-500/10'
  };

  return (
    <Link to={link} className="block">
      <div className="bg-white rounded-lg shadow-sm px-6 py-5 h-full hover:shadow-md transition-shadow">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ring-1 mr-4 ${colorMap[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AdminDashboard;
