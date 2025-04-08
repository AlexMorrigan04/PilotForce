import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import { FiUsers, FiPieChart, FiAlertTriangle, FiDatabase, FiSettings, FiBriefcase, FiCalendar, FiGrid } from 'react-icons/fi';

const AdminDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Stats for the dashboard
  const [stats, setStats] = useState({
    users: 127,
    companies: 14,
    bookings: 358,
    assets: 89
  });

  // Verify admin status on component mount
  useEffect(() => {
    const verifyAdmin = async () => {
      if (!isAdmin) {
        setError('You do not have permission to access this page');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    };

    verifyAdmin();
    
    // Simulate loading data
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, [isAdmin, navigate]);

  // Quick actions for admin tasks
  const quickActions = [
    { name: 'Add User', icon: <FiUsers />, path: '/admin/users/add' },
    { name: 'Add Company', icon: <FiBriefcase />, path: '/admin/companies/add' },
    { name: 'View Reports', icon: <FiPieChart />, path: '/admin/reports' },
    { name: 'System Settings', icon: <FiSettings />, path: '/admin/settings' }
  ];
  
  // Recent alerts for the admin
  const recentAlerts = [
    { id: 1, message: 'New user registration pending approval', time: '10 minutes ago', type: 'info' },
    { id: 2, message: 'System backup completed successfully', time: '1 hour ago', type: 'success' },
    { id: 3, message: 'Failed login attempts detected', time: '3 hours ago', type: 'warning' },
    { id: 4, message: 'Server resource usage approaching limit', time: '5 hours ago', type: 'danger' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.username || 'Admin'}. Here's what's happening in your system.</p>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 flex items-center">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <FiUsers className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <p className="text-2xl font-bold">{stats.users}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 flex items-center">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <FiBriefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Companies</p>
                  <p className="text-2xl font-bold">{stats.companies}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 flex items-center">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <FiCalendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Bookings</p>
                  <p className="text-2xl font-bold">{stats.bookings}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6 flex items-center">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <FiGrid className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Assets</p>
                  <p className="text-2xl font-bold">{stats.assets}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-bold text-lg">Quick Actions</h2>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {quickActions.map((action, index) => (
                        <button 
                          key={index}
                          onClick={() => navigate(action.path)}
                          className="bg-blue-50 text-blue-600 p-4 rounded-lg flex flex-col items-center justify-center text-center hover:bg-blue-100 transition-colors"
                        >
                          <span className="text-2xl mb-2">{action.icon}</span>
                          <span className="text-sm font-medium">{action.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* System Status */}
                <div className="bg-white rounded-lg shadow mt-6">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-bold text-lg">System Status</h2>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">CPU Usage</span>
                        <span className="text-sm font-medium text-gray-800">28%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '28%' }}></div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">Memory Usage</span>
                        <span className="text-sm font-medium text-gray-800">64%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '64%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">Storage Usage</span>
                        <span className="text-sm font-medium text-gray-800">42%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent Alerts and Activity */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-bold text-lg">Recent Alerts</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      {recentAlerts.map(alert => (
                        <div key={alert.id} className={`p-4 rounded-lg border flex items-start
                          ${alert.type === 'info' ? 'bg-blue-50 border-blue-200' : 
                            alert.type === 'success' ? 'bg-blue-50 border-blue-200' :
                            alert.type === 'warning' ? 'bg-blue-50 border-blue-200' : 
                            'bg-blue-50 border-blue-200'}`}
                        >
                          <div className="p-2 rounded-full mr-4 bg-blue-100 text-blue-600">
                            <FiAlertTriangle className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{alert.message}</p>
                            <p className="text-sm text-gray-500">{alert.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow mt-6">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="font-bold text-lg">Recent Activity</h2>
                  </div>
                  <div className="p-4">
                    <ul className="divide-y divide-gray-200">
                      <li className="py-3">
                        <div className="flex items-center">
                          <span className="bg-blue-100 text-blue-600 p-1 rounded mr-3">
                            <FiUsers className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">New user registered</p>
                            <p className="text-xs text-gray-500">John Smith • 23 minutes ago</p>
                          </div>
                        </div>
                      </li>
                      <li className="py-3">
                        <div className="flex items-center">
                          <span className="bg-blue-100 text-blue-600 p-1 rounded mr-3">
                            <FiCalendar className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">New booking created</p>
                            <p className="text-xs text-gray-500">Acme Inc. • 1 hour ago</p>
                          </div>
                        </div>
                      </li>
                      <li className="py-3">
                        <div className="flex items-center">
                          <span className="bg-blue-100 text-blue-600 p-1 rounded mr-3">
                            <FiBriefcase className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">New company added</p>
                            <p className="text-xs text-gray-500">TechSolutions Ltd • 3 hours ago</p>
                          </div>
                        </div>
                      </li>
                      <li className="py-3">
                        <div className="flex items-center">
                          <span className="bg-blue-100 text-blue-600 p-1 rounded mr-3">
                            <FiGrid className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Asset updated</p>
                            <p className="text-xs text-gray-500">Drone X-500 • 5 hours ago</p>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <p className="text-sm text-gray-500 text-center">
            PilotForce Admin Dashboard © {new Date().getFullYear()} | <span className="text-blue-600">System Status: Operational</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
