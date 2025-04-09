import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, FiCalendar, FiFileText, FiShield, 
  FiTrendingUp, FiClock, FiAlertTriangle
} from 'react-icons/fi';

interface AdminStatsSummaryProps {
  stats: {
    totalUsers: number;
    totalBookings: number;
    totalCompanies: number;
    activeBookings: number;
  };
}

const AdminStatsSummary: React.FC<AdminStatsSummaryProps> = ({ stats }) => {
  return (
    <div className="space-y-8">
      {/* Primary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<FiUsers className="h-6 w-6" />}
          linkTo="/admin/users"
          color="blue"
        />
        <StatCard
          title="Active Bookings"
          value={stats.activeBookings}
          icon={<FiCalendar className="h-6 w-6" />}
          linkTo="/admin/bookings?status=active"
          color="green"
        />
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={<FiFileText className="h-6 w-6" />}
          linkTo="/admin/bookings"
          color="purple"
        />
        <StatCard
          title="Companies"
          value={stats.totalCompanies}
          icon={<FiShield className="h-6 w-6" />}
          linkTo="/admin/companies"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            text="Add New User"
            icon={<FiUsers />}
            linkTo="/admin/users/add"
            color="blue"
          />
          <QuickActionButton
            text="View Bookings"
            icon={<FiCalendar />}
            linkTo="/admin/bookings"
            color="green"
          />
          <QuickActionButton
            text="Manage Resources"
            icon={<FiFileText />}
            linkTo="/admin/resources"
            color="purple"
          />
        </div>
      </div>
    </div>
  );
};

// Stat Card component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  linkTo: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, linkTo, color }) => {
  const bgColorClass = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50'
  }[color];
  
  const textColorClass = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600'
  }[color];
  
  const borderColorClass = {
    blue: 'border-blue-200',
    green: 'border-green-200',
    purple: 'border-purple-200',
    orange: 'border-orange-200'
  }[color];

  return (
    <Link 
      to={linkTo}
      className={`bg-white rounded-lg shadow p-6 border-l-4 ${borderColorClass} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${bgColorClass} ${textColorClass}`}>
          {icon}
        </div>
        <div className="ml-5">
          <p className="text-gray-500 font-medium text-sm uppercase">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      </div>
    </Link>
  );
};

// Quick Action Button component
interface QuickActionButtonProps {
  text: string;
  icon: React.ReactNode;
  linkTo: string;
  color: 'blue' | 'green' | 'purple';
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ text, icon, linkTo, color }) => {
  const bgColorClass = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700'
  }[color];

  return (
    <Link
      to={linkTo}
      className={`${bgColorClass} text-white py-3 px-4 rounded flex items-center justify-center transition-colors shadow-sm`}
    >
      <span className="mr-2">{icon}</span>
      {text}
    </Link>
  );
};

export default AdminStatsSummary;
