import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Row, Col, Statistic, Button, Tabs, List, Avatar, Spin } from 'antd';
import { UserOutlined, TeamOutlined, CalendarOutlined, FileOutlined } from '@ant-design/icons';
import { getUser, getTokens } from '../utils/localStorage';

const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get stored credentials
        const username = localStorage.getItem('auth_username');
        const password = localStorage.getItem('auth_password');
        
        if (!username || !password) {
          console.warn('No credentials found in localStorage');
          setError('Authentication information not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        console.log('Making API request with stored credentials for user:', username);
        
        // Use the REST API approach instead of direct AWS SDK calls
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
        
        console.log('User data API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error from API Gateway:', { status: response.status, body: errorText });
          throw new Error(`User data API error: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        
        // Try to parse the response
        try {
          const data = JSON.parse(responseText);
          console.log('User data from API Gateway:', data);
          
          // Check if we have a nested body to parse
          if (data.body && typeof data.body === 'string') {
            try {
              const parsedBody = JSON.parse(data.body);
              console.log('Parsed body from user data API:', parsedBody);
              
              if (parsedBody.user) {
                // Update user in localStorage and state
                localStorage.setItem('user', JSON.stringify(parsedBody.user));
                setData(parsedBody);
              }
            } catch (parseError) {
              console.error('Error parsing API response body:', parseError);
            }
          } else {
            setData(data);
          }
        } catch (jsonError) {
          console.error('Error parsing API response as JSON:', jsonError);
          console.log('Raw response was:', responseText);
        }
        
        // Create mock data for UI elements
        interface Stats {
          users: number;
          projects: number;
          flights: number;
          documents: number;
        }

        interface ActivityItem {
          id: number;
          user: string;
          action: string;
          time: string;
        }

        interface DashboardData {
          stats?: Stats;
          recentActivity?: ActivityItem[];
          user?: any; // Keeping this as 'any' to match existing usage
        }

                setData((prevData: DashboardData): DashboardData => ({
                  ...prevData,
                  stats: {
                    users: 5,
                    projects: 12,
                    flights: 24,
                    documents: 36
                  },
                  recentActivity: [
                    { id: 1, user: 'John Doe', action: 'Added new project', time: '2 hours ago' },
                    { id: 2, user: 'Jane Smith', action: 'Completed flight', time: '3 hours ago' },
                    { id: 3, user: 'Bob Johnson', action: 'Uploaded document', time: '5 hours ago' },
                    { id: 4, user: 'Alice Williams', action: 'Scheduled flight', time: '1 day ago' }
                  ]
                }));
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Get user data from context or localStorage
  const userData = user || getUser();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {userData?.name || userData?.username || 'User'}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Users"
              value={data.stats?.users || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Teams"
              value={data.stats?.projects || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Flights"
              value={data.stats?.flights || 0}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Documents"
              value={data.stats?.documents || 0}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <TabPane tab="Recent Activity" key="1">
          <List
            itemLayout="horizontal"
            dataSource={data.recentActivity || []}
            renderItem={(item: any) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={item.user}
                  description={`${item.action} - ${item.time}`}
                />
              </List.Item>
            )}
          />
        </TabPane>
        <TabPane tab="Projects" key="2">
          <p>Project content will be displayed here</p>
        </TabPane>
        <TabPane tab="Team" key="3">
          <p>Team content will be displayed here</p>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Dashboard;

