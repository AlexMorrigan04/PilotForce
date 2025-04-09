import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// Replace antd imports with custom components
import { getItem, getTokens } from '../utils/localStorage';
import { User, Tokens } from '../types/auth';

// Import the API utilities
import { API, fetchWithAuth } from '../utils/apiUtils';

// Create simple replacements for antd components
const Button = ({ 
  onClick, 
  children, 
  icon, 
  type = 'default', 
  disabled = false,
  className = '' // Add className prop with default empty string
}: { 
  onClick?: () => void, 
  children?: React.ReactNode, 
  icon?: React.ReactNode,
  type?: string,
  disabled?: boolean,
  className?: string // Add className to the props interface
}) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
      type === 'primary' 
        ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' 
        : type === 'danger'
        ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`} // Include className in the classNames
  >
    {icon && <span className="mr-2">{icon}</span>}
    {children}
  </button>
);

// Simple mock for UserOutlined icon
const UserOutlined = () => <span className="inline-block w-4 h-4 mr-1">👤</span>;
// Simple mock for EditOutlined icon
const EditOutlined = () => <span className="inline-block w-4 h-4">✏️</span>;
// Simple mock for DeleteOutlined icon
const DeleteOutlined = () => <span className="inline-block w-4 h-4">🗑️</span>;

// Mock for Table component
const Table = ({ 
  dataSource, 
  columns 
}: { 
  dataSource: any[], 
  columns: any[] 
}) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map((column, idx) => (
            <th 
              key={idx} 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {dataSource.map((item, idx) => (
          <tr key={idx}>
            {columns.map((column, colIdx) => (
              <td key={colIdx} className="px-6 py-4 whitespace-nowrap">
                {column.render 
                  ? column.render(item[column.dataIndex], item)
                  : item[column.dataIndex] !== undefined ? item[column.dataIndex] : 'N/A'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Rest of CompanyUsers component with type fixes
export const CompanyUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Define user interface based on DynamoDB attributes
  interface UserData {
    UserId: string;
    CompanyId: string;
    CompanyName: string;
    CreatedAt: string;
    Email: string;
    Name: string;
    PhoneNumber: string;
    Status: string;
    UpdatedAt: string;
    Username: string;
    UserRole: string;
  }
  
  // Updated columns to reflect DynamoDB attributes
  const columns = [
    {
      title: 'User ID',
      dataIndex: 'UserId',
      key: 'UserId',
    },
    {
      title: 'Name',
      dataIndex: 'Name',
      key: 'Name',
      render: (_: any, record: any) => (
        <span>
          <UserOutlined /> {record.Name || record.Username || 'Unknown User'}
        </span>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'Username',
      key: 'Username',
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
    },
    {
      title: 'Phone',
      dataIndex: 'PhoneNumber',
      key: 'PhoneNumber',
    },
    {
      title: 'Company',
      dataIndex: 'CompanyName',
      key: 'CompanyName',
    },
    {
      title: 'Role',
      dataIndex: 'UserRole',
      key: 'UserRole',
    },
    {
      title: 'Status',
      dataIndex: 'Status',
      key: 'Status',
      render: (status: string) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          status === 'Active' 
            ? 'bg-green-100 text-green-800' 
            : status === 'Pending' 
            ? 'bg-yellow-100 text-yellow-800'
            : status === 'Inactive'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
      render: (date: string) => {
        return new Date(date).toLocaleDateString();
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <div className="action-buttons">
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button 
            icon={<DeleteOutlined />}
            type="danger"
            onClick={() => handleDelete(record)}
            className="ml-2"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Define API endpoint base URL
  const API_BASE_URL = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

  // Function to fetch users from Lambda API using our utility function
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the API utility to fetch users
      const data = await API.getUsers();
      console.log('Received users data:', data);
      
      // Map the response data to match our expected format
      const formattedUsers = (data.users || []).map((user: any) => ({
        // Map the fields from Lambda response to our component's expected structure
        UserId: user.id,
        Name: user.username,
        Email: user.email,
        CompanyName: user.company,
        CompanyId: user.companyId,
        UserRole: user.role,
        Status: user.status,
        CreatedAt: user.createdAt || user.lastLogin || new Date().toISOString(),
        UpdatedAt: user.updatedAt || '',
        Username: user.username,
        PhoneNumber: user.phone || 'N/A',
        IsEnabled: user.isEnabled
      }));
      
      setUsers(formattedUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setLoading(false);
    }
  };

  // Example handlers for the buttons using our API utilities
  const handleEdit = async (record: any) => {
    console.log('Edit user:', record);
    try {
      // Format the data based on what the Lambda function expects
      const updateData = {
        email: record.Email,
        role: record.UserRole,
        company: record.CompanyName,
        companyId: record.CompanyId,
        phone: record.PhoneNumber,
        status: record.Status,
        name: record.Name
      };
      
      // Use the API utility to update the user
      await API.updateUser(record.UserId, updateData);
      
      // Show success message
      alert('User updated successfully');
      
      // Refresh the user list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const handleDelete = async (record: any) => {
    if (window.confirm(`Are you sure you want to delete user ${record.Name || record.Username}?`)) {
      try {
        // Use the API utility to delete the user
        await API.deleteUser(record.UserId);
        
        alert('User deleted successfully');
        
        // Refresh the user list
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    }
  };
  
  // Toggle user enabled/disabled status
  const handleToggleAccess = async (record: any) => {
    try {
      const newEnabledState = !record.IsEnabled;
      
      // Use the API utility to toggle user access
      await API.toggleUserAccess(record.UserId, newEnabledState);
      
      alert(`User ${newEnabledState ? 'enabled' : 'disabled'} successfully`);
      
      // Refresh the user list
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user access:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };
  
  // Add user function (placeholder)
  const handleAddUser = () => {
    // Implement add user functionality
    alert('Add user functionality not implemented yet');
  };

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
      Error: {error}
      <Button 
        type="primary"
        onClick={() => fetchUsers()}
        className="mt-2"
      >
        Try Again
      </Button>
    </div>;
  }

  return (
    <div className="company-users p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Company Users</h1>
        <Button 
          type="primary"
          onClick={handleAddUser}
        >
          Add User
        </Button>
      </div>
      
      {users.length === 0 ? (
        <div className="text-center py-10 border rounded-md bg-gray-50">
          <p className="text-gray-500">No users found</p>
        </div>
      ) : (
        <Table dataSource={users} columns={columns} />
      )}
    </div>
  );
};

export default CompanyUsers;

