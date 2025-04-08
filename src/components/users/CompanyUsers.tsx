import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUser } from '../../utils/localStorage';
import { 
  getUsersByCompany, 
  getCompanyUsersSimplified 
} from '../../services/userService';

interface CompanyUser {
  UserId: string;
  Username: string;
  Email: string;
  Name?: string;
  PhoneNumber?: string;
  UserRole: string;
  Status: string;
  CreatedAt: string;
  CompanyId: string;
}

interface CompanyUsersProps {
  users?: CompanyUser[];
  loading?: boolean;
  error?: string | null;
  companyId?: string; // Add companyId as an optional prop
}

const CompanyUsers: React.FC<CompanyUsersProps> = ({ 
  users: propsUsers, 
  loading: propsLoading, 
  error: propsError,
  companyId: propsCompanyId
}) => {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // If users are provided via props, use them; otherwise fetch them
  useEffect(() => {
    if (propsUsers) {
      setUsers(sortUsers(propsUsers));
      setIsLoading(false);
    } else {
      fetchCompanyUsers();
    }
  }, [propsUsers]);

  // Update loading and error states when props change
  useEffect(() => {
    if (propsLoading !== undefined) {
      setIsLoading(propsLoading);
    }
    if (propsError !== undefined && propsError !== null) {
      setError(propsError);
    }
  }, [propsLoading, propsError]);

  const sortUsers = (userList: CompanyUser[]) => {
    // Sort users by role (admin first), then by name/username
    return [...userList].sort((a: CompanyUser, b: CompanyUser) => {
      // Sort by role first (Admin at top)
      if ((a.UserRole?.toLowerCase().includes('admin') && !b.UserRole?.toLowerCase().includes('admin'))) {
        return -1;
      }
      if ((!a.UserRole?.toLowerCase().includes('admin') && b.UserRole?.toLowerCase().includes('admin'))) {
        return 1;
      }
      
      // Then sort by name/username
      const nameA = a.Name || a.Username || '';
      const nameB = b.Name || b.Username || '';
      return nameA.localeCompare(nameB);
    });
  };

  const fetchCompanyUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First try to use companyId passed as prop
      let companyId = propsCompanyId;
      
      // If we have a specific company ID, use the direct DB lookup with no auth
      if (companyId) {
        console.log('Using direct DB lookup for company users (no auth):', companyId);
        try {
          // Import the direct lookup function
          const { getCompanyUsersDirect } = await import('../../services/userService');
          const companyUsers = await getCompanyUsersDirect(companyId);
          
          // Normalize the user objects to ensure consistent property names
          const normalizedUsers = companyUsers.map(user => ({
            UserId: user.UserId || user.userId || user.id || '',
            Username: user.Username || user.username || '',
            Email: user.Email || user.email || '',
            Name: user.Name || user.name || '',
            PhoneNumber: user.PhoneNumber || user.phoneNumber || user.phone_number || '',
            UserRole: user.UserRole || user.role || user.userRole || 'User',
            Status: user.Status || user.status || 'UNKNOWN',
            CreatedAt: user.CreatedAt || user.createdAt || new Date().toISOString(),
            CompanyId: user.CompanyId || user.companyId || companyId || ''
          }));
          
          setUsers(sortUsers(normalizedUsers));
          return;
        } catch (directLookupError) {
          console.error('Error using direct DB lookup:', directLookupError);
          // Fall back to existing methods
          const companyUsers = await getUsersByCompany(companyId);
          
          // Normalize the user objects to ensure consistent property names
          const normalizedUsers = companyUsers.map(user => ({
            UserId: user.UserId || user.userId || user.id || '',
            Username: user.Username || user.username || '',
            Email: user.Email || user.email || '',
            Name: user.Name || user.name || '',
            PhoneNumber: user.PhoneNumber || user.phoneNumber || user.phone_number || '',
            UserRole: user.UserRole || user.role || user.userRole || 'User',
            Status: user.Status || user.status || 'UNKNOWN',
            CreatedAt: user.CreatedAt || user.createdAt || new Date().toISOString(),
            CompanyId: user.CompanyId || user.companyId || companyId || ''
          }));
          
          setUsers(sortUsers(normalizedUsers));
          return;
        }
      }
      
      // If no specific company ID, use the simplified method that handles everything server-side
      console.log('No specific company ID, using simplified method to get current user\'s company members');
      
      try {
        // Use the new simplified method
        const companyUsers = await getCompanyUsersSimplified();
        
        console.log(`Successfully fetched ${companyUsers.length} company users via simplified method`);
        
        // Use the same normalization logic as before
        interface UserData {
          UserId?: string;
          userId?: string;
          id?: string;
          Username?: string;
          username?: string;
          Email?: string;
          email?: string;
          Name?: string;
          name?: string;
          PhoneNumber?: string;
          phoneNumber?: string;
          phone_number?: string;
          UserRole?: string;
          role?: string;
          userRole?: string;
          Status?: string;
          status?: string;
          CreatedAt?: string;
          createdAt?: string;
          CompanyId?: string;
          companyId?: string;
        }

        const normalizedUsers: CompanyUser[] = companyUsers.map((user: UserData) => ({
          UserId: user.UserId || user.userId || user.id || '',
          Username: user.Username || user.username || '',
          Email: user.Email || user.email || '',
          Name: user.Name || user.name || '',
          PhoneNumber: user.PhoneNumber || user.phoneNumber || user.phone_number || '',
          UserRole: user.UserRole || user.role || user.userRole || 'User',
          Status: user.Status || user.status || 'UNKNOWN',
          CreatedAt: user.CreatedAt || user.createdAt || new Date().toISOString(),
          CompanyId: user.CompanyId || user.companyId || companyId || ''
        }));
        
        setUsers(sortUsers(normalizedUsers));
      } catch (error) {
        console.error('Error using simplified method:', error);
        
        // Fall back to trying to determine company ID from current user
        try {
          // Try multiple sources for company ID
          const currentUser = getUser();
          const userCompanyId = currentUser?.companyId || currentUser?.CompanyId;
          const localStorageCompanyId = localStorage.getItem('companyId');
          
          companyId = userCompanyId || localStorageCompanyId;
          
          if (!companyId) {
            throw new Error('Could not determine company ID');
          }
          
          console.log('Falling back to regular method with company ID:', companyId);
          const companyUsers = await getUsersByCompany(companyId);
          
          // Use the same normalization logic
          const normalizedUsers = companyUsers.map(user => ({
            UserId: user.UserId || user.userId || user.id || '',
            Username: user.Username || user.username || '',
            Email: user.Email || user.email || '',
            Name: user.Name || user.name || '',
            PhoneNumber: user.PhoneNumber || user.phoneNumber || user.phone_number || '',
            UserRole: user.UserRole || user.role || user.userRole || 'User',
            Status: user.Status || user.status || 'UNKNOWN',
            CreatedAt: user.CreatedAt || user.createdAt || new Date().toISOString(),
            CompanyId: user.CompanyId || user.companyId || companyId || ''
          }));
          
          setUsers(sortUsers(normalizedUsers));
        } catch (fallbackError) {
          console.error('Error with fallback method:', fallbackError);
          setError('Could not fetch company users. Please try again later.');
          
          // For development only - provide some mock data for UI testing
          if (process.env.NODE_ENV === 'development') {
            console.log('Using mock data for development');
            setUsers([
              {
                UserId: '1',
                Username: 'admin_user',
                Email: 'admin@example.com',
                Name: 'Admin User',
                PhoneNumber: '+1234567890',
                UserRole: 'Admin',
                Status: 'CONFIRMED',
                CreatedAt: new Date().toISOString(),
                CompanyId: companyId || 'company123'
              },
              {
                UserId: '2',
                Username: 'regular_user',
                Email: 'user@example.com',
                Name: 'Regular User',
                UserRole: 'User',
                Status: 'CONFIRMED',
                CreatedAt: new Date().toISOString(),
                CompanyId: companyId || 'company123'
              },
              {
                UserId: '3',
                Username: 'new_user',
                Email: 'new@example.com',
                UserRole: 'User',
                Status: 'UNCONFIRMED',
                CreatedAt: new Date().toISOString(),
                CompanyId: companyId || 'company123'
              }
            ]);
          }
        }
      }
    } catch (err: any) {
      console.error('Error in fetchCompanyUsers:', err);
      setError(err.message || 'Failed to load company users');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('admin')) {
      return 'bg-purple-100 text-purple-800';
    } else if (lowerRole.includes('manager')) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'confirmed') {
      return 'bg-green-100 text-green-800';
    } else if (lowerStatus === 'unconfirmed') {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading company users...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500">No users found in your company.</p>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.UserId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      {(user.Name || user.Username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.Name || user.Username}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.Email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeStyle(user.UserRole)}`}>
                    {user.UserRole}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(user.Status)}`}>
                    {user.Status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.CreatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CompanyUsers;
