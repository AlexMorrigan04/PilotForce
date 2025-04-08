import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, Button, Modal, Form, Input, Select, message } from 'antd';
import { UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getItem, setItem, getUser, getTokens } from '../utils/localStorage';
import { User, Tokens } from '../types/auth';

const { Option } = Select;

// Define a company user interface
interface CompanyUser {
  id: string;
  name: string;
  username?: string;  // Add optional username property
  email: string;
  role: string;
  companyId: string;
}

const CompanyUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);

  useEffect(() => {
    loadUserData();
    // IMPORTANT: Don't fetch company users from DynamoDB directly
    // Instead, use a REST API approach with the stored credentials
    fetchUserFromApi();
  }, []);
  
  // Function to fetch user data from the API - UPDATED to avoid AWS SDK errors
  const fetchUserFromApi = async () => {
    try {
      // Get stored credentials
      const username = localStorage.getItem('auth_username');
      const password = localStorage.getItem('auth_password');
      
      if (!username || !password) {
        console.warn('No credentials found in localStorage');
        return;
      }
      
      console.log('Making API request with stored credentials for user:', username);
      
      // Use a simple fetch instead of AWS SDK
      const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      
      console.log('User API response status:', response.status);
      
      // Process the response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from user API (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw response from user API:', responseText);
      
      if (!responseText) {
        console.warn('Empty response from user API');
        return;
      }
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(responseText);
        console.log('Parsed user data from API:', data);
        
        // Handle API Gateway format (body as string)
        if (data.body && typeof data.body === 'string') {
          try {
            const parsedBody = JSON.parse(data.body);
            console.log('Parsed body from API response:', parsedBody);
            
            if (parsedBody.user) {
              console.log('User data from API:', parsedBody.user);
              // Update user in localStorage
              localStorage.setItem('user', JSON.stringify(parsedBody.user));
              
              // Here you would fetch company users if you have an API endpoint for that
              // For now, we'll use mock data in loadUserData()
            }
          } catch (parseError) {
            console.error('Error parsing API response body:', parseError);
          }
        } else if (data.user) {
          // Direct response format
          console.log('User data from direct response:', data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch (jsonError) {
        console.error('Error parsing API response as JSON:', jsonError);
      }
    } catch (error) {
      console.error('Error fetching user from API:', error);
    }
  };

  const loadUserData = () => {
    setLoading(true);
    
    try {
      // Get user from localStorage with proper typing
      const localUser = getUser();
      
      if (!localUser) {
        setError('No user data found in localStorage');
        setUsers([]);
        return;
      }
      
      console.log('User loaded from localStorage:', localUser);
      
      // For demo purposes, we'll create a mock list of users
      const mockUsers: CompanyUser[] = [
        {
          id: localUser.id,
          name: localUser.username,
          username: localUser.username,
          email: localUser.email,
          role: localUser.role,
          companyId: localUser.companyId
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          username: 'jane',
          email: 'jane@example.com',
          role: 'User',
          companyId: localUser.companyId
        },
        {
          id: 'user-3',
          name: 'Bob Johnson',
          username: 'bob',
          email: 'bob@example.com',
          role: 'Manager',
          companyId: localUser.companyId
        }
      ];
      
      // Check if we already have users stored in localStorage
      const storedUsers = getItem<CompanyUser[]>('companyUsers', null);
      
      if (storedUsers && Array.isArray(storedUsers)) {
        console.log('Company users loaded from localStorage:', storedUsers);
        setUsers(storedUsers);
      } else {
        // If no stored users, use our mock data and save it
        console.log('Using mock company users and saving to localStorage');
        setUsers(mockUsers);
        setItem('companyUsers', mockUsers);
      }
    } catch (error) {
      console.error('Error loading user data from localStorage:', error);
      setError('Failed to load user data from localStorage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="company-users">
      <div className="header-actions">
        <h2>Company Users</h2>
        <Button 
          type="primary" 
          onClick={() => {
            setEditingUser(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Add New User
        </Button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <Table 
        dataSource={users} 
        rowKey="id"
        loading={loading}
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (_, record) => (
              <span>
                <UserOutlined /> {record.name || record.username || 'Unknown User'}
              </span>
            ),
          },
          {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
          },
          {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <div className="action-buttons">
                <Button 
                  icon={<EditOutlined />} 
                  onClick={() => {
                    setEditingUser(record);
                    form.setFieldsValue({
                      name: record.name,
                      email: record.email,
                      role: record.role,
                    });
                    setIsModalVisible(true);
                  }}
                >
                  Edit
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteUser(record.id)}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* User Form Modal */}
      <Modal
        title={editingUser ? "Edit User" : "Add New User"}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Enter user's name" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter an email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter user's email" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select user role">
              <Option value="Admin">Admin</Option>
              <Option value="Manager">Manager</Option>
              <Option value="User">User</Option>
            </Select>
          </Form.Item>
          
          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter a password' }]}
            >
              <Input.Password placeholder="Enter temporary password" />
            </Form.Item>
          )}
          
          <div className="form-actions">
            <Button onClick={() => setIsModalVisible(false)}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );

  function handleFormSubmit(values: any) {
    if (editingUser) {
      // Update existing user
      const updatedUsers = users.map(user => 
        user.id === editingUser.id ? { ...user, ...values } : user
      );
      setUsers(updatedUsers);
      setItem('companyUsers', updatedUsers); // Use setItem instead of getItem
      message.success('User updated successfully');
    } else {
      // Add new user with proper typing
      const localUser = getUser();
      const newUser: CompanyUser = {
        id: 'user-' + Date.now(),
        name: values.name,
        username: values.name.toLowerCase().replace(/\s+/g, '.'), // Generate username from name
        email: values.email,
        role: values.role,
        companyId: localUser?.companyId || '1'
      };
      
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      setItem('companyUsers', updatedUsers); // Use setItem instead of getItem
      message.success('User added successfully');
    }
    
    setIsModalVisible(false);
    form.resetFields();
  }
  
  function handleDeleteUser(userId: string) {
    // Get the current user's ID from localStorage with proper typing
    const localUser = getUser();
    
    if (userId === localUser?.id) {
      message.error("You cannot delete your own account");
      return;
    }
    
    Modal.confirm({
      title: 'Confirm Deletion',
      content: 'Are you sure you want to delete this user?',
      onOk: () => {
        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);
        setItem('companyUsers', updatedUsers); // Use setItem instead of getItem
        message.success('User deleted successfully');
      }
    });
  }
};

export default CompanyUsers;

