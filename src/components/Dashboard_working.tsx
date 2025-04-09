// import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { getUser, getTokens } from '../utils/localStorage';

// // Define mock components to replace antd ones
// interface CardProps {
//   children: React.ReactNode;
//   title?: string;
//   className?: string;
// }

// const Card: React.FC<CardProps> = ({ children, title, className = '' }) => (
//   <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
//     {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
//     {children}
//   </div>
// );

// interface RowProps {
//   children: React.ReactNode;
//   className?: string;
// }

// const Row: React.FC<RowProps> = ({ children, className = '' }) => (
//   <div className={`flex flex-wrap -mx-3 ${className}`}>
//     {children}
//   </div>
// );

// interface ColProps {
//   children: React.ReactNode;
//   span?: number;
//   className?: string;
// }

// const Col: React.FC<ColProps> = ({ children, span = 24, className = '' }) => {
//   const width = `${(span / 24) * 100}%`;
//   return (
//     <div className={`px-3 mb-6 ${className}`} style={{ width }}>
//       {children}
//     </div>
//   );
// };

// interface StatisticProps {
//   title: string;
//   value: number | string;
//   prefix?: React.ReactNode;
// }

// const Statistic: React.FC<StatisticProps> = ({ title, value, prefix }) => (
//   <div>
//     <div className="text-sm text-gray-500">{title}</div>
//     <div className="text-2xl font-semibold mt-1">
//       {prefix && <span className="mr-1">{prefix}</span>}
//       {value}
//     </div>
//   </div>
// );

// // Mock icon components
// const UserOutlined = () => <span className="inline-block w-5 h-5">👤</span>;
// const TeamOutlined = () => <span className="inline-block w-5 h-5">👥</span>;
// const CalendarOutlined = () => <span className="inline-block w-5 h-5">📅</span>;
// const FileOutlined = () => <span className="inline-block w-5 h-5">📄</span>;

// // Mock Tabs component
// interface TabsProps {
//   defaultActiveKey: string;
//   onChange?: (key: string) => void;
//   children: React.ReactNode;
// }

// const Tabs: React.FC<TabsProps> = ({ defaultActiveKey, onChange, children }) => {
//   const [activeKey, setActiveKey] = useState(defaultActiveKey);

//   const handleTabChange = (key: string) => {
//     setActiveKey(key);
//     if (onChange) {
//       onChange(key);
//     }
//   };

//   // Find the active tab pane
//   const activePane = React.Children.toArray(children).find(
//     (child) => React.isValidElement(child) && child.props.tab && child.props.tabKey === activeKey
//   );

//   return (
//     <div>
//       <div className="flex border-b">
//         {React.Children.map(children, (child) => {
//           if (React.isValidElement(child) && child.props.tab && child.props.tabKey) {
//             return (
//               <div
//                 className={`px-4 py-2 cursor-pointer ${
//                   child.props.tabKey === activeKey
//                     ? 'border-b-2 border-blue-500 text-blue-500'
//                     : 'text-gray-500 hover:text-gray-700'
//                 }`}
//                 onClick={() => handleTabChange(child.props.tabKey)}
//               >
//                 {child.props.tab}
//               </div>
//             );
//           }
//           return null;
//         })}
//       </div>
//       <div className="py-4">
//         {activePane}
//       </div>
//     </div>
//   );
// };

// interface TabPaneProps {
//   tab: string;
//   tabKey: string;
//   children: React.ReactNode;
// }

// const TabPane: React.FC<TabPaneProps> = ({ children }) => {
//   return <div>{children}</div>;
// };

// Tabs.TabPane = TabPane;

// // Mock List component
// interface ListProps {
//   dataSource: any[];
//   renderItem: (item: any, index: number) => React.ReactNode;
//   className?: string;
// }

// const List: React.FC<ListProps> = ({ dataSource, renderItem, className = '' }) => (
//   <div className={`divide-y divide-gray-200 ${className}`}>
//     {dataSource.map((item, index) => (
//       <div key={index} className="py-4">
//         {renderItem(item, index)}
//       </div>
//     ))}
//   </div>
// );

// interface AvatarProps {
//   src?: string;
//   children?: React.ReactNode;
// }

// const Avatar: React.FC<AvatarProps> = ({ src, children }) => (
//   <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
//     {src ? <img src={src} alt="avatar" className="w-full h-full object-cover" /> : children}
//   </div>
// );

// interface SpinProps {
//   spinning?: boolean;
//   children?: React.ReactNode;
// }

// const Spin: React.FC<SpinProps> = ({ spinning = true, children }) => (
//   <div className="relative">
//     {spinning && (
//       <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
//         <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
//       </div>
//     )}
//     {children}
//   </div>
// );

// const Dashboard: React.FC = () => {
//   const { user, isAuthenticated } = useAuth();
//   const [loading, setLoading] = useState<boolean>(true);
//   const [stats, setStats] = useState({
//     bookingsTotal: 0,
//     droneFlightsTotal: 0,
//     teamMembers: 0,
//     activeProjects: 0
//   });
//   const [recentActivity, setRecentActivity] = useState<any[]>([]);

//   useEffect(() => {
//     // Simulating API fetch
//     setTimeout(() => {
//       // Mock data
//       setStats({
//         bookingsTotal: 42,
//         droneFlightsTotal: 36,
//         teamMembers: 8,
//         activeProjects: 12
//       });
      
//       setRecentActivity([
//         { 
//           id: 1, 
//           title: 'Drone flight scheduled',
//           description: 'New drone flight scheduled for Site A',
//           time: '3 hours ago' 
//         },
//         { 
//           id: 2, 
//           title: 'New team member',
//           description: 'John Doe has joined your team',
//           time: '1 day ago' 
//         },
//         { 
//           id: 3, 
//           title: 'Report generated',
//           description: 'Site inspection report for Project B is ready',
//           time: '2 days ago' 
//         }
//       ]);
      
//       setLoading(false);
//     }, 1500);
//   }, []);

//   if (!isAuthenticated) {
//     return (
//       <div className="text-center p-8">
//         <p className="text-xl">You need to be logged in to view this page.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
//       <Spin spinning={loading}>
//         <Row className="mb-6">
//           <Col span={6}>
//             <Card>
//               <Statistic 
//                 title="Total Bookings" 
//                 value={stats.bookingsTotal} 
//                 prefix={<CalendarOutlined />} 
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card>
//               <Statistic 
//                 title="Drone Flights" 
//                 value={stats.droneFlightsTotal} 
//                 prefix={<FileOutlined />} 
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card>
//               <Statistic 
//                 title="Team Members" 
//                 value={stats.teamMembers} 
//                 prefix={<TeamOutlined />} 
//               />
//             </Card>
//           </Col>
//           <Col span={6}>
//             <Card>
//               <Statistic 
//                 title="Active Projects" 
//                 value={stats.activeProjects} 
//                 prefix={<FileOutlined />} 
//               />
//             </Card>
//           </Col>
//         </Row>
        
//         <Row>
//           <Col span={16}>
//             <Card title="Overview" className="h-full">
//               <Tabs defaultActiveKey="1">
//                 <TabPane tab="Activity" tabKey="1">
//                   <List
//                     dataSource={recentActivity}
//                     renderItem={(item) => (
//                       <div className="flex items-start"></div>
//                         <Avatar>{item.id}</Avatar>
//                         <div className="ml-4">
//                           <div className="text-base font-medium">{item.title}</div>
//                           <div className="text-sm text-gray-500">{item.description}</div>
//                           <div className="text-xs text-gray-400 mt-1">{item.time}</div>
//                         </div>
//                       </div>
//                     )}
//                   />
//                 </TabPane>
//                 <TabPane tab="Projects" tabKey="2">
//                   <p>Projects content goes here</p>
//                 </TabPane>
//                 <TabPane tab="Bookings" tabKey="3">
//                   <p>Bookings content goes here</p>
//                 </TabPane>
//               </Tabs>
//             </Card>
//           </Col>
          
//           <Col span={8}></Col>
//             <Card title="Your Profile" className="mb-6">
//               <div className="flex items-center mb-4">
//                 <Avatar>{user?.username?.charAt(0).toUpperCase() || 'U'}</Avatar>
//                 <div className="ml-4">
//                   <div className="font-medium">{user?.username || 'User'}</div>
//                   <div className="text-sm text-gray-500">{user?.email || 'No email'}</div>
//                 </div>
//               </div>
//               <div className="border-t pt-4">
//                 <div className="flex justify-between mb-2">
//                   <span className="text-gray-500">Role:</span>
//                   <span>{user?.role || 'Standard User'}</span>
//                 </div>
//                 <div className="flex justify-between mb-2">
//                   <span className="text-gray-500">Company:</span>
//                   <span>{user?.companyName || 'Not specified'}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-gray-500">Last Login:</span>
//                   <span>Today</span>
//                 </div>
//               </div>
//             </Card>
            
//             <Card title="Quick Actions">
//               <div className="space-y-3">
//                 <Button type="primary" className="w-full">
//                   New Booking
//                 </Button>
//                 <Button className="w-full">
//                   View Reports
//                 </Button>
//                 <Button className="w-full">
//                   Team Management
//                 </Button>
//               </div>
//             </Card>
//           </Col>
//         </Row>
//       </Spin>
//     </div>
//   );
// };

// export default Dashboard;

export {}