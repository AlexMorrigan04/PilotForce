import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCompanyId, getCompanyName } from '../utils/companyUtils';
import { getCompanyById } from '../services/companyService.js';
import { Navbar } from '../components/Navbar';

interface UserProfileProps {}

const UserProfile: React.FC<UserProfileProps> = () => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      setIsLoading(true);
      try {
        const companyId = getCompanyId(user);
        if (companyId) {
          const result = await getCompanyById(companyId);
          if (result && result.success && result.company) {
            setCompanyDetails(result.company);
          } else {
            setCompanyDetails(null);
          }
        } else {
          setCompanyDetails(null);
        }
      } catch (e) {
        setCompanyDetails(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompany();
  }, [user]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Not Authenticated</h2>
          <p className="text-gray-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
                {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.name || user.username || 'User'}</h1>
                <p className="text-gray-500 text-sm">{user.email}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mt-1">
                  {user.role || user['custom:role'] || user['custom:userRole'] || 'User'}
                  {isAdmin && <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Admin</span>}
                </span>
              </div>
            </div>
            <div className="mt-6 md:mt-0 flex gap-2">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Logout
              </button>
              {isAdmin && (
                <button
                  onClick={() => window.location.href = '/admin-dashboard'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Admin Dashboard
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Name</label>
                  <p className="mt-1 text-base text-gray-900">{user.name || user.username || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-base text-gray-900">{user.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Role</label>
                  <p className="mt-1 text-base text-gray-900">
                    {user.role || user['custom:role'] || user['custom:userRole'] || 'User'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">User ID</label>
                  <p className="mt-1 text-base text-gray-900 font-mono">{user.sub || user.id || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Authentication Provider</label>
                  <p className="mt-1 text-base text-gray-900 capitalize">
                    {(localStorage.getItem('authProvider') || 'Regular Login').replace(/^(.)/, (c) => c.toUpperCase())}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company Name</label>
                  <p className="mt-1 text-base text-gray-900">
                    {companyDetails?.Name || companyDetails?.CompanyName || getCompanyName(user) || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company Status</label>
                  <p className="mt-1 text-base text-gray-900">
                    {companyDetails?.Status || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Company ID</label>
                  <p className="mt-1 text-base text-gray-900 font-mono">
                    {companyDetails?.CompanyId || companyDetails?.id || 'Not available'}
                  </p>
                </div>
                {companyDetails?.CreatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created At</label>
                    <p className="mt-1 text-base text-gray-900">
                      {new Date(companyDetails.CreatedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 