import React, { useEffect, useState } from 'react';
import { getUser } from '../../utils/localStorage';

interface PendingUser {
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

interface PendingUserRequestsProps {
  onRequestsCountChange?: (count: number) => void;
}

const PendingUserRequests: React.FC<PendingUserRequestsProps> = ({ onRequestsCountChange }) => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentUser = getUser();
      if (!currentUser || !currentUser.companyId) {
        setError("Unable to determine company ID");
        return;
      }

      const companyId = currentUser.companyId;
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');

      if (!username || !password) {
        setError("Authentication credentials not found");
        return;
      }

      // Fetch pending user requests for the company
      const response = await fetch(`https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/companies/${companyId}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pending users: ${response.status}`);
      }

      const responseData = await response.json();

      // Process the response data to extract pending users
      let usersData: PendingUser[] = [];

      if (responseData.users && Array.isArray(responseData.users)) {
        usersData = responseData.users;
      } else if (responseData.body) {
        // Handle nested response format
        const parsedBody = typeof responseData.body === 'string'
          ? JSON.parse(responseData.body)
          : responseData.body;

        if (parsedBody.users && Array.isArray(parsedBody.users)) {
          usersData = parsedBody.users;
        }
      }

      // Filter only pending/unconfirmed users
      const pendingUsersData = usersData.filter(user => 
        user.Status.toLowerCase() === 'unconfirmed' || 
        user.Status.toLowerCase() === 'pending'
      );

      setPendingUsers(pendingUsersData);
      
      // Notify parent component of count change
      if (onRequestsCountChange) {
        onRequestsCountChange(pendingUsersData.length);
      }
    } catch (err: any) {
      console.error('Error fetching pending users:', err);
      setError(err.message || 'Failed to load pending user requests');
      
      // For development, set some mock data
      if (process.env.NODE_ENV === 'development') {
        const mockPendingUsers: PendingUser[] = [
          {
            UserId: 'pending1',
            Username: 'new_user',
            Email: 'new@example.com',
            Name: 'New User',
            UserRole: 'User',
            Status: 'UNCONFIRMED',
            CreatedAt: new Date().toISOString(),
            CompanyId: 'company123'
          },
          {
            UserId: 'pending2',
            Username: 'pending_user',
            Email: 'pending@example.com',
            Name: 'Pending User',
            UserRole: 'User',
            Status: 'UNCONFIRMED',
            CreatedAt: new Date().toISOString(),
            CompanyId: 'company123'
          }
        ];
        
        setPendingUsers(mockPendingUsers);
        if (onRequestsCountChange) {
          onRequestsCountChange(mockPendingUsers.length);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      setProcessingUser(userId);
      
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (!username || !password) {
        setError("Authentication credentials not found");
        return;
      }
      
      // This would be the actual API call to approve a user
      console.log(`Approving user: ${userId}`);
      
      // For now, just update the local state
      setPendingUsers(prevUsers => {
        const updatedUsers = prevUsers.filter(user => user.UserId !== userId);
        
        // Notify parent component of count change
        if (onRequestsCountChange) {
          onRequestsCountChange(updatedUsers.length);
        }
        
        return updatedUsers;
      });
      
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      setProcessingUser(userId);
      
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (!username || !password) {
        setError("Authentication credentials not found");
        return;
      }
      
      // This would be the actual API call to reject a user
      console.log(`Rejecting user: ${userId}`);
      
      // For now, just update the local state
      setPendingUsers(prevUsers => {
        const updatedUsers = prevUsers.filter(user => user.UserId !== userId);
        
        // Notify parent component of count change
        if (onRequestsCountChange) {
          onRequestsCountChange(updatedUsers.length);
        }
        
        return updatedUsers;
      });
      
    } catch (err: any) {
      console.error('Error rejecting user:', err);
      setError(err.message || 'Failed to reject user');
    } finally {
      setProcessingUser(null);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading pending requests...</p>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No pending user requests at this time.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Requested On
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pendingUsers.map(user => (
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
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {user.Email}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.CreatedAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  onClick={() => handleApproveUser(user.UserId)}
                  disabled={processingUser === user.UserId}
                  className={`text-green-600 hover:text-green-900 mr-3 ${processingUser === user.UserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleRejectUser(user.UserId)}
                  disabled={processingUser === user.UserId}
                  className={`text-red-600 hover:text-red-900 ${processingUser === user.UserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PendingUserRequests;
