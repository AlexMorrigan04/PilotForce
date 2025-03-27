# Frontend Integration Guide

## Introduction

This guide outlines how to connect your React frontend application to the AWS backend services you've set up for PilotForce. We'll cover authentication integration, API calls, file uploads, and strategies for maintaining a clean separation of concerns.

## Architecture Overview

The frontend-backend integration architecture includes:

1. **Authentication Flow**: Using AWS Amplify to connect to Cognito
2. **API Integration**: Making authenticated calls to API Gateway endpoints
3. **File Handling**: Uploading and downloading files from S3
4. **State Management**: Managing application state with context or Redux
5. **Error Handling**: Consistent error handling across the application

## Setting Up AWS Amplify

AWS Amplify provides a comprehensive library for connecting your React application to AWS services.

### 1. Install Required Packages

```bash
npm install aws-amplify @aws-amplify/ui-react
```

### 2. Configure Amplify

Create a configuration file for your AWS resources:

```javascript
// src/aws-config.js
const awsConfig = {
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_xxxxxxxx', // Replace with your User Pool ID
    userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Replace with your App Client ID
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  },
  API: {
    endpoints: [
      {
        name: 'PilotForceAPI',
        endpoint: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      }
    ]
  },
  Storage: {
    AWSS3: {
      bucket: 'pilotforce-user-uploads',
      region: 'us-east-1'
    }
  }
};

export default awsConfig;
```

Initialize Amplify in your application:

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';
import App from './App';

// Configure Amplify with your AWS resources
Amplify.configure(awsConfig);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

## Authentication Integration

### 1. Create Authentication Context

Set up a context to manage authentication state across your application:

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if a user is already signed in
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      setLoading(true);
      const user = await Auth.currentAuthenticatedUser();
      setCurrentUser(user);
      
      // Extract user groups from token
      const idToken = user.signInUserSession.idToken;
      const groups = idToken.payload['cognito:groups'] || [];
      setUserGroups(groups);
    } catch (err) {
      // No user is signed in
      setCurrentUser(null);
      setUserGroups([]);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    try {
      setError('');
      const user = await Auth.signIn(email, password);
      setCurrentUser(user);
      
      // Extract user groups from token
      const idToken = user.signInUserSession.idToken;
      const groups = idToken.payload['cognito:groups'] || [];
      setUserGroups(groups);
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function signUp(email, password, name) {
    try {
      setError('');
      const { user } = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name
        }
      });
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function confirmSignUp(email, code) {
    try {
      setError('');
      await Auth.confirmSignUp(email, code);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function signOut() {
    try {
      await Auth.signOut();
      setCurrentUser(null);
      setUserGroups([]);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function forgotPassword(email) {
    try {
      setError('');
      await Auth.forgotPassword(email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function forgotPasswordSubmit(email, code, newPassword) {
    try {
      setError('');
      await Auth.forgotPasswordSubmit(email, code, newPassword);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  // Check if user is an admin
  const isAdmin = () => {
    return userGroups.includes('Administrators');
  };

  // Check if user is staff
  const isStaff = () => {
    return userGroups.includes('Staff');
  };

  // Check if user has specific permission
  const hasPermission = (requiredGroup) => {
    return userGroups.includes(requiredGroup);
  };

  const value = {
    currentUser,
    userGroups,
    loading,
    error,
    signIn,
    signUp,
    confirmSignUp,
    signOut,
    forgotPassword,
    forgotPasswordSubmit,
    isAdmin,
    isStaff,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
```

### 2. Create Protected Routes

Create a component to handle protected routes:

```javascript
// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requiredGroup = null }) {
  const { currentUser, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a specific group is required, check permissions
  if (requiredGroup && !hasPermission(requiredGroup)) {
    // Redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and has required permissions
  return children;
}

export default ProtectedRoute;
```

### 3. Set Up App Routes with Authentication

Configure your routes to use authentication:

```javascript
// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import your components
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import UserProfile from './pages/UserProfile';
import Bookings from './pages/Bookings';
import ForgotPassword from './pages/ForgotPassword';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Protected routes for any authenticated user */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/bookings" 
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin-only routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredGroup="Administrators">
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

## API Integration

### 1. Create API Service Modules

Create service modules for each API domain to keep your code organized:

```javascript
// src/services/userService.js
import { API } from 'aws-amplify';

const apiName = 'PilotForceAPI';
const basePath = '/api/v1/users';

export async function getCurrentUser() {
  try {
    return await API.get(apiName, `${basePath}/me`);
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
}

export async function getUserById(userId) {
  try {
    return await API.get(apiName, `${basePath}/${userId}`);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
}

export async function updateUserProfile(userId, userData) {
  try {
    return await API.put(apiName, `${basePath}/${userId}`, {
      body: userData
    });
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
}

// Additional user-related API functions
```

```javascript
// src/services/bookingService.js
import { API } from 'aws-amplify';

const apiName = 'PilotForceAPI';
const basePath = '/api/v1/bookings';

export async function getMyBookings(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const path = queryString ? `${basePath}/me?${queryString}` : `${basePath}/me`;
    return await API.get(apiName, path);
  } catch (error) {
    console.error('Error fetching my bookings:', error);
    throw error;
  }
}

export async function createBooking(bookingData) {
  try {
    return await API.post(apiName, basePath, {
      body: bookingData
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

export async function updateBooking(bookingId, bookingData) {
  try {
    return await API.put(apiName, `${basePath}/${bookingId}`, {
      body: bookingData
    });
  } catch (error) {
    console.error(`Error updating booking ${bookingId}:`, error);
    throw error;
  }
}

export async function cancelBooking(bookingId) {
  try {
    return await API.put(apiName, `${basePath}/${bookingId}/cancel`);
  } catch (error) {
    console.error(`Error canceling booking ${bookingId}:`, error);
    throw error;
  }
}

// Additional booking-related API functions
```

```javascript
// src/services/assetService.js
import { API, Storage } from 'aws-amplify';

const apiName = 'PilotForceAPI';
const basePath = '/api/v1/assets';

export async function getUploadURL(fileInfo) {
  try {
    return await API.post(apiName, `${basePath}/upload-url`, {
      body: fileInfo
    });
  } catch (error) {
    console.error('Error getting upload URL:', error);
    throw error;
  }
}

export async function getMyAssets() {
  try {
    return await API.get(apiName, `${basePath}/me`);
  } catch (error) {
    console.error('Error fetching my assets:', error);
    throw error;
  }
}

export async function uploadFile(file, options = {}) {
  try {
    // First get a presigned URL
    const fileInfo = {
      fileName: file.name,
      fileType: file.type,
      directory: options.directory || 'uploads'
    };
    
    const { uploadURL, fileKey } = await getUploadURL(fileInfo);
    
    // Upload directly to S3 using the URL
    await fetch(uploadURL, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });
    
    // Create asset record in the database
    const assetData = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      s3Key: fileKey,
      assetType: options.assetType || 'document',
      tags: options.tags || []
    };
    
    return await API.post(apiName, basePath, {
      body: assetData
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Alternative method using Amplify Storage directly
export async function uploadFileWithAmplify(file, options = {}) {
  try {
    const result = await Storage.put(
      `${options.directory || 'uploads'}/${file.name}`,
      file,
      {
        contentType: file.type,
        metadata: {
          assetType: options.assetType || 'document'
        }
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error uploading file with Amplify:', error);
    throw error;
  }
}

// Additional asset-related API functions
```

### 2. Use API Services in React Components

Example of using these services in a React component:

```javascript
// src/pages/Bookings.js
import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../services/bookingService';
import BookingForm from '../components/BookingForm';
import { useAuth } from '../contexts/AuthContext';

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      setLoading(true);
      const result = await getMyBookings();
      setBookings(result);
      setError('');
    } catch (err) {
      setError('Failed to load bookings. Please try again.');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking(bookingId) {
    try {
      await cancelBooking(bookingId);
      // Update the local state
      setBookings(bookings.map(booking => 
        booking.bookingId === bookingId 
          ? { ...booking, status: 'cancelled' } 
          : booking
      ));
    } catch (err) {
      setError('Failed to cancel booking. Please try again.');
      console.error('Error canceling booking:', err);
    }
  }

  function handleBookingSuccess() {
    setShowBookingForm(false);
    fetchBookings(); // Refresh the bookings list
  }

  if (loading) return <div>Loading bookings...</div>;

  return (
    <div className="bookings-page">
      <h1>My Bookings</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        className="new-booking-button"
        onClick={() => setShowBookingForm(true)}
      >
        New Booking
      </button>
      
      {showBookingForm && (
        <BookingForm 
          onSuccess={handleBookingSuccess}
          onCancel={() => setShowBookingForm(false)}
        />
      )}
      
      {bookings.length === 0 ? (
        <p>No bookings found. Create your first booking!</p>
      ) : (
        <div className="bookings-list">
          {bookings.map(booking => (
            <div key={booking.bookingId} className="booking-card">
              <h3>{booking.serviceType}</h3>
              <p>Date: {booking.bookingDate}</p>
              <p>Time: {booking.bookingTime}</p>
              <p>Status: <span className={`status-${booking.status}`}>{booking.status}</span></p>
              
              {booking.status === 'confirmed' || booking.status === 'pending' ? (
                <button 
                  className="cancel-button"
                  onClick={() => handleCancelBooking(booking.bookingId)}
                >
                  Cancel Booking
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Bookings;
```

### 3. File Upload Component

Create a reusable file upload component:

```javascript
// src/components/FileUploader.js
import React, { useState } from 'react';
import { uploadFile } from '../services/assetService';

function FileUploader({ onUploadSuccess, directory = 'uploads', assetType = 'document', allowedTypes = [], maxSizeMB = 5 }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    
    // Check file type if allowed types are specified
    if (allowedTypes.length > 0 && !allowedTypes.includes(selectedFile.type)) {
      setError(`File type not allowed. Please upload: ${allowedTypes.join(', ')}`);
      return;
    }
    
    // Check file size
    const fileSizeMB = selectedFile.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File too large. Maximum size: ${maxSizeMB}MB`);
      return;
    }
    
    setFile(selectedFile);
    setError('');
  }

  async function handleUpload() {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setUploading(true);
      setProgress(0);
      
      // Create a simulated progress effect since direct S3 uploads don't report progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Upload the file
      const result = await uploadFile(file, {
        directory,
        assetType,
        tags: []
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Call the success callback with the result
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
      
      setFile(null);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="file-uploader">
      {error && <div className="error-message">{error}</div>}
      
      <div className="file-input-container">
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          className="file-input"
        />
        
        {file && (
          <div className="selected-file">
            <p>Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
          </div>
        )}
      </div>
      
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      )}
      
      {uploading && (
        <div className="progress-container">
          <div 
            className="progress-bar"
            style={{ width: `${progress}%` }}
          ></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
```

## State Management

For larger applications, consider implementing a more robust state management solution:

### 1. Using React Context for Global State

```javascript
// src/contexts/AppContext.js
import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  notifications: [],
  darkMode: localStorage.getItem('darkMode') === 'true',
  sidebarOpen: true
};

// Actions
const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
const REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION';
const TOGGLE_DARK_MODE = 'TOGGLE_DARK_MODE';
const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    case REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case TOGGLE_DARK_MODE:
      localStorage.setItem('darkMode', !state.darkMode);
      return {
        ...state,
        darkMode: !state.darkMode
      };
    case TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen
      };
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Context provider
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Action creators
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    dispatch({
      type: ADD_NOTIFICATION,
      payload: { id, message, type }
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      dispatch({
        type: REMOVE_NOTIFICATION,
        payload: id
      });
    }, 5000);
  };
  
  const removeNotification = (id) => {
    dispatch({
      type: REMOVE_NOTIFICATION,
      payload: id
    });
  };
  
  const toggleDarkMode = () => {
    dispatch({ type: TOGGLE_DARK_MODE });
  };
  
  const toggleSidebar = () => {
    dispatch({ type: TOGGLE_SIDEBAR });
  };
  
  const value = {
    ...state,
    addNotification,
    removeNotification,
    toggleDarkMode,
    toggleSidebar
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useApp() {
  return useContext(AppContext);
}
```

### 2. Implementing Notifications Component

```javascript
// src/components/Notifications.js
import React from 'react';
import { useApp } from '../contexts/AppContext';

function Notifications() {
  const { notifications, removeNotification } = useApp();
  
  if (notifications.length === 0) {
    return null;
  }
  
  return (
    <div className="notifications-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification notification-${notification.type}`}
        >
          <p>{notification.message}</p>
          <button 
            className="close-button"
            onClick={() => removeNotification(notification.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

export default Notifications;
```

## Error Handling

### 1. Create a Global Error Boundary

```javascript
// src/components/ErrorBoundary.js
import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // You could send this error to a monitoring service like Sentry
    // if (typeof window.Sentry !== 'undefined') {
    //   window.Sentry.captureException(error);
    // }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <p>
            The application encountered an unexpected error. 
            Please try refreshing the page.
          </p>
          {this.props.showDetails && this.state.error && (
            <details style={{ whiteSpace: 'pre-wrap' }}>
              <summary>Error Details</summary>
              {this.state.error.toString()}
              <br />
              {this.state.errorInfo.componentStack}
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="refresh-button"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 2. Implement a Custom Hook for API Requests

```javascript
// src/hooks/useApi.js
import { useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';

function useApi(apiFunction) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addNotification } = useApp();

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      
      // Show error notification
      addNotification(
        err.message || 'An error occurred. Please try again.',
        'error'
      );
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, addNotification]);

  return {
    data,
    loading,
    error,
    execute
  };
}

export default useApi;
```

Example usage of the `useApi` hook:

```javascript
// src/pages/UserProfile.js
import React, { useEffect, useState } from 'react';
import { getCurrentUser, updateUserProfile } from '../services/userService';
import useApi from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';

function UserProfile() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: ''
  });
  
  // Use the custom hook for API calls
  const { 
    loading: userLoading, 
    error: userError, 
    execute: fetchUser 
  } = useApi(getCurrentUser);
  
  const { 
    loading: updateLoading, 
    error: updateError, 
    execute: executeUpdate 
  } = useApi(updateUserProfile);

  useEffect(() => {
    async function loadUserData() {
      try {
        const userData = await fetchUser();
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phoneNumber: userData.phoneNumber || ''
        });
      } catch (err) {
        // Error is handled by the hook
      }
    }
    
    loadUserData();
  }, [fetchUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await executeUpdate(currentUser.username, formData);
      // Success notification is handled by the caller
    } catch (err) {
      // Error is handled by the hook
    }
  };

  if (userLoading) return <div>Loading profile...</div>;

  return (
    <div className="user-profile">
      <h1>User Profile</h1>
      
      {(userError || updateError) && (
        <div className="error-message">
          {userError?.message || updateError?.message || 'An error occurred'}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled
          />
          <small>Email cannot be changed</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={updateLoading}
        >
          {updateLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default UserProfile;
```

## Best Practices for Frontend-Backend Integration

1. **Separation of Concerns**:
   - Keep API calls in dedicated service modules
   - Use hooks or context for shared state management
   - Separate UI components from data fetching logic

2. **Error Handling**:
   - Implement consistent error handling
   - Use error boundaries for unexpected errors
   - Provide meaningful error messages to users

3. **Authentication**:
   - Manage tokens securely
   - Refresh tokens before they expire
   - Clear sensitive data during logout

4. **Performance**:
   - Use pagination for large data sets
   - Implement caching where appropriate
   - Use skeleton loaders for better user experience

5. **Security**:
   - Validate inputs on both client and server
   - Use HTTPS for all communications
   - Implement proper CORS configuration

## Deployment Considerations

1. **Environment Configuration**:
   - Create separate configuration for development, staging, and production
   - Use environment variables for sensitive information

```javascript
// src/configs/amplify-config.js
const getAmplifyConfig = () => {
  const environment = process.env.REACT_APP_ENVIRONMENT || 'development';
  
  const configs = {
    development: {
      Auth: {
        region: 'us-east-1',
        userPoolId: process.env.REACT_APP_USER_POOL_ID,
        userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
        // ...other config
      },
      API: {
        endpoints: [
          {
            name: 'PilotForceAPI',
            endpoint: process.env.REACT_APP_API_ENDPOINT,
            region: 'us-east-1'
          }
        ]
      },
      // ...other services
    },
    production: {
      // Production configuration
      Auth: {
        region: 'us-east-1',
        userPoolId: process.env.REACT_APP_USER_POOL_ID,
        userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
        // ...other config
      },
      API: {
        endpoints: [
          {
            name: 'PilotForceAPI',
            endpoint: process.env.REACT_APP_API_ENDPOINT,
            region: 'us-east-1'
          }
        ]
      },
      // ...other services
    }
  };
  
  return configs[environment];
};

export default getAmplifyConfig;
```

2. **CI/CD Setup**:
   - Use AWS Amplify, CodePipeline, or similar services for deployment
   - Implement testing stages before production deployment
   - Configure environment variables in the CI/CD pipeline

## Monitoring and Debug Tools

1. **Error Tracking**:
   - Implement logging service like AWS CloudWatch
   - Consider using error monitoring services like Sentry

```javascript
// Add to index.js
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 0.1,
  });
}
```

2. **Performance Monitoring**:
   - Use AWS X-Ray for tracing requests
   - Monitor API Gateway and Lambda metrics
   - Track frontend performance with tools like Lighthouse

## Next Steps

1. Implement comprehensive form validation
2. Add pagination and filtering for data tables
3. Create admin interfaces for user and content management
4. Set up a proper CI/CD pipeline
5. Implement unit and integration tests