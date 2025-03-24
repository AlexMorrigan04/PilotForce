import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import { useAuth } from '../../context/AuthContext';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaUserClock } from 'react-icons/fa';

interface PendingUser {
  UserId: string;      // Make sure these match your DynamoDB schema
  Username: string;
  Email: string;
  PhoneNumber?: string;
  CompanyId: string;
  UserRole: string;
  CreatedAt: string;
}

interface PendingUserRequestsProps {
  onRequestsCountChange?: (count: number) => void;
  className?: string; // Add className prop to fix the TypeScript error
}

const PendingUserRequests: React.FC<PendingUserRequestsProps> = ({ onRequestsCountChange, className }) => {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  
  // AWS configuration
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  useEffect(() => {
    if (user?.companyId) {
      fetchPendingUsers();
    }
  }, [user?.companyId]);

  const fetchPendingUsers = async () => {
    if (!user?.companyId) {
      setError('Cannot fetch pending users: No company ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching pending users for company:", user.companyId);
      
      // Query the Users table by CompanyId and UserAccess=false
      const params = {
        TableName: 'Users',
        FilterExpression: 'CompanyId = :companyId AND UserAccess = :userAccess',
        ExpressionAttributeValues: {
          ':companyId': user.companyId,
          ':userAccess': false
        }
      };

      const response = await dynamoDb.scan(params).promise();
      
      if (response.Items) {
        // Log the full items for debugging
        console.log("Pending users raw data:", JSON.stringify(response.Items, null, 2));
        
        // Map DynamoDB items to our PendingUser interface
        const pending = response.Items.map(item => ({
          UserId: item.UserId,          // Use exact field names from your DynamoDB table
          Username: item.Username,
          Email: item.Email,
          PhoneNumber: item.PhoneNumber,
          CompanyId: item.CompanyId,
          UserRole: item.UserRole || 'User',
          CreatedAt: item.CreatedAt
        }));
        
        setPendingUsers(pending);
        
        // Notify parent component of count change
        if (onRequestsCountChange) {
          onRequestsCountChange(pending.length);
        }
      } else {
        setPendingUsers([]);
        if (onRequestsCountChange) {
          onRequestsCountChange(0);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError('Failed to load pending user requests. Please try again later.');
      setPendingUsers([]);
      if (onRequestsCountChange) {
        onRequestsCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (user: PendingUser) => {
    if (!user?.CompanyId) return;
    
    setProcessingUser(user.Username);
    setError(null);
    
    try {
      console.log("Approving user:", user);
      
      // Instead of trying different key combinations, first query to find the actual item
      // This will help us understand the table's key structure
      try {
        const queryParams = {
          TableName: 'Users',
          FilterExpression: 'Username = :username',
          ExpressionAttributeValues: {
            ':username': user.Username
          }
        };
        
        console.log("Querying user to determine key structure:", queryParams);
        const queryResult = await dynamoDb.scan(queryParams).promise();
        
        if (queryResult.Items && queryResult.Items.length > 0) {
          const actualUser = queryResult.Items[0];
          console.log("Found user in database:", actualUser);
          
          // Extract the primary key information
          // We'll inspect the actual item to determine what fields make up the primary key
          // This should match the table's schema
          const updateParams = {
            TableName: 'Users',
            Key: {},
            UpdateExpression: 'set UserAccess = :access',
            ExpressionAttributeValues: {
              ':access': true
            },
            ReturnValues: 'ALL_NEW'
          };
          
          // Try to determine the primary key from the actual item
          if (actualUser.pk && actualUser.sk) {
            // If the table uses pk/sk pattern
            updateParams.Key = {
              pk: actualUser.pk,
              sk: actualUser.sk
            };
          } else if (actualUser.CompanyId && actualUser.Username) {
            // If the table uses CompanyId + Username as composite key
            updateParams.Key = {
              CompanyId: actualUser.CompanyId,
              Username: actualUser.Username
            };
          } else if (actualUser.EmailDomain && actualUser.Email) {
            // If the table uses EmailDomain + Email as composite key
            updateParams.Key = {
              EmailDomain: actualUser.EmailDomain,
              Email: actualUser.Email
            };
          } else if (actualUser.UserId) {
            // If the table uses just UserId as the key
            updateParams.Key = {
              UserId: actualUser.UserId
            };
          } else {
            // If we can't determine the key, try Username as a fallback
            updateParams.Key = {
              Username: actualUser.Username
            };
          }
          
          console.log("Determined update params based on actual item:", updateParams);
          const result = await dynamoDb.update(updateParams).promise();
          console.log("Update result:", result);
          
          // Success! Remove from pending users
          setPendingUsers(pendingUsers.filter(u => u.Username !== user.Username));
          
          // Update the count
          if (onRequestsCountChange) {
            onRequestsCountChange(pendingUsers.length - 1);
          }
          
          return;
        } else {
          console.error("Could not find user in database to determine key structure");
          throw new Error("User not found in database");
        }
      } catch (error) {
        console.error("Error determining key structure:", error);
        
        // If the query approach fails, try a simpler approach - update using a custom name-value pair
        try {
          // Use putItem instead of update to replace the entire item
          const putParams = {
            TableName: 'Users',
            Item: {
              ...user,  // Include all existing user fields
              UserAccess: true  // Set UserAccess to true
            },
            ConditionExpression: 'attribute_exists(Username)'  // Make sure we don't create a new item
          };
          
          console.log("Falling back to put operation:", putParams);
          await dynamoDb.put(putParams).promise();
          console.log("Put operation succeeded");
          
          // Success! Remove from pending users
          setPendingUsers(pendingUsers.filter(u => u.Username !== user.Username));
          
          // Update the count
          if (onRequestsCountChange) {
            onRequestsCountChange(pendingUsers.length - 1);
          }
          
          return;
        } catch (putError) {
          console.error("Put operation failed:", putError);
          throw putError;
        }
      }
    } catch (err) {
      console.error('Error approving user:', err);
      if (err instanceof Error) {
        setError(`Failed to approve user: ${err.message}`);
      } else {
        setError('Failed to approve user: An unknown error occurred');
      }
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRejectUser = async (user: PendingUser) => {
    if (!user?.CompanyId) return;
    
    setProcessingUser(user.Username);
    setError(null);
    
    try {
      // Similar approach to handleApproveUser - first find the actual item to determine key structure
      const queryParams = {
        TableName: 'Users',
        FilterExpression: 'Username = :username',
        ExpressionAttributeValues: {
          ':username': user.Username
        }
      };
      
      console.log("Querying user to determine key structure for deletion:", queryParams);
      const queryResult = await dynamoDb.scan(queryParams).promise();
      
      if (queryResult.Items && queryResult.Items.length > 0) {
        const actualUser = queryResult.Items[0];
        console.log("Found user in database for deletion:", actualUser);
        
        // Extract the primary key information
        const deleteParams = {
          TableName: 'Users',
          Key: {}
        };
        
        // Try to determine the primary key from the actual item
        if (actualUser.pk && actualUser.sk) {
          deleteParams.Key = {
            pk: actualUser.pk,
            sk: actualUser.sk
          };
        } else if (actualUser.CompanyId && actualUser.Username) {
          deleteParams.Key = {
            CompanyId: actualUser.CompanyId,
            Username: actualUser.Username
          };
        } else if (actualUser.EmailDomain && actualUser.Email) {
          deleteParams.Key = {
            EmailDomain: actualUser.EmailDomain,
            Email: actualUser.Email
          };
        } else if (actualUser.UserId) {
          deleteParams.Key = {
            UserId: actualUser.UserId
          };
        } else {
          deleteParams.Key = {
            Username: actualUser.Username
          };
        }
        
        console.log("Determined delete params based on actual item:", deleteParams);
        await dynamoDb.delete(deleteParams).promise();
        console.log("Delete operation succeeded");
        
        // Remove from pending users
        setPendingUsers(pendingUsers.filter(u => u.Username !== user.Username));
        
        // Update the count
        if (onRequestsCountChange) {
          onRequestsCountChange(pendingUsers.length - 1);
        }
      } else {
        throw new Error("User not found in database");
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError('Failed to reject user request. Please try again.');
    } finally {
      setProcessingUser(null);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const calculateTimeAgo = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffMins > 0) {
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      } else {
        return 'Just now';
      }
    } catch (error) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center p-8 ${className || ''}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Pending User Requests</h3>
        <button 
          onClick={fetchPendingUsers}
          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>
      
      {pendingUsers.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingUsers.map(pendingUser => (
                <tr key={pendingUser.UserId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="bg-blue-100 text-blue-800 flex items-center justify-center h-10 w-10 rounded-full">
                          <span className="font-medium text-sm">{pendingUser.Username.substring(0, 2).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{pendingUser.Username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{pendingUser.Email}</div>
                    {pendingUser.PhoneNumber && (
                      <div className="text-sm text-gray-500">{pendingUser.PhoneNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pendingUser.UserRole === 'Admin' || pendingUser.UserRole === 'AccountAdmin' ? 'bg-purple-100 text-purple-800' :
                      pendingUser.UserRole === 'Manager' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pendingUser.UserRole}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDate(pendingUser.CreatedAt)}</div>
                    <div className="text-xs italic">{calculateTimeAgo(pendingUser.CreatedAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleApproveUser(pendingUser)}
                        disabled={processingUser === pendingUser.Username}
                        className="text-green-600 hover:text-green-900"
                        title="Approve user"
                      >
                        {processingUser === pendingUser.Username ? (
                          <FaSpinner className="animate-spin h-5 w-5" />
                        ) : (
                          <FaCheckCircle className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectUser(pendingUser)}
                        disabled={processingUser === pendingUser.Username}
                        className="text-red-600 hover:text-red-900"
                        title="Reject user"
                      >
                        <FaTimesCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 py-12 text-center rounded-lg border border-gray-200">
          <FaUserClock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
          <p className="mt-1 text-sm text-gray-500">There are currently no pending user requests to approve.</p>
        </div>
      )}
    </div>
  );
};

export default PendingUserRequests;
