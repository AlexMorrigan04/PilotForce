import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiMenu,
  FiX,
  FiHome,
  FiUsers,
  FiSettings,
  FiDatabase,
  FiPieChart,
  FiLogOut,
  FiAlertTriangle,
  FiCalendar,
  FiBriefcase,
  FiImage,
  FiGrid
} from 'react-icons/fi';

/**
 * AdminNavbar - A dedicated navigation bar for the admin area of the application
 * Completely separate from the regular user interface
 */
const AdminNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper function to check if a path is active
  const isActivePath = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin-dashboard', icon: <FiHome /> },
    { name: 'Users', path: '/admin/users', icon: <FiUsers /> },
    { name: 'Bookings', path: '/admin/bookings', icon: <FiCalendar /> },
    { name: 'Assets', path: '/admin/assets', icon: <FiGrid /> },
    { name: 'Resources', path: '/admin/resources', icon: <FiImage /> },
    { name: 'Companies', path: '/admin/companies', icon: <FiBriefcase /> },
    { name: 'Reports', path: '/admin/reports', icon: <FiPieChart /> },
    { name: 'Settings', path: '/admin/settings', icon: <FiSettings /> }
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo and title */}
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">PilotForce Admin</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {navItems.slice(0, 6).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors
                    ${isActivePath(item.path) 
                      ? 'bg-blue-700 text-white' 
                      : 'text-white hover:bg-blue-500 hover:text-white'
                    }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
              
              {/* More dropdown */}
              <div className="relative group">
                <button className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-500 hover:text-white flex items-center">
                  <span className="mr-1.5"><FiSettings /></span>
                  More
                </button>
                <div className="absolute z-10 left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="py-1">
                    {navItems.slice(6).map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <span className="mr-2 text-gray-500">{item.icon}</span>
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* User info and logout */}
          <div className="hidden md:flex items-center">
            <div className="mr-4 text-sm text-white">
              {user?.username ? `Admin: ${user.username}` : 'Admin User'}
            </div>
            <button
              onClick={handleLogout}
              className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
              aria-label="Logout"
            >
              <FiLogOut className="mr-1" />
              Logout
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-500 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <FiX className="block h-6 w-6" /> : <FiMenu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium flex items-center
                  ${isActivePath(item.path) 
                    ? 'bg-blue-700 text-white' 
                    : 'text-white hover:bg-blue-500 hover:text-white'
                  }`}
                onClick={() => setIsOpen(false)}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
          
          <div className="pt-4 pb-3 border-t border-blue-500">
            <div className="flex items-center px-5">
              <div className="text-base font-medium text-white">
                {user?.username ? `Admin: ${user.username}` : 'Admin User'}
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-500 hover:text-white flex items-center"
              >
                <FiLogOut className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;
