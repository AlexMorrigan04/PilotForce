# Connecting Your React Frontend to AWS Backend: Step-by-Step Guide

## Introduction

This guide will walk you through the process of connecting your React frontend application to the AWS backend services we've set up. By the end, your frontend will be able to authenticate users, make API calls, and handle file uploads/downloads.

## Prerequisites

Before starting, make sure you have:

1. Your React frontend application running
2. Completed the AWS backend setup (Cognito, API Gateway, Lambda, and S3)
3. The following information ready:
   - Cognito User Pool ID and App Client ID
   - API Gateway endpoint URL
   - S3 bucket names

## Step 1: Install AWS Amplify

AWS Amplify is a library that makes it easy to connect to AWS services from your frontend.

```bash
# Navigate to your React project directory
cd /Users/alexh/Documents/Internship/PilotForce

# Install AWS Amplify
npm install aws-amplify @aws-amplify/ui-react
```

## Step 2: Configure Amplify in Your App

Create a configuration file to store your AWS settings:

```javascript
// src/aws-config.js
const awsConfig = {
  // Auth configuration - replace with your values
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_xxxxxxxx',
    userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  },
  
  // API configuration
  API: {
    endpoints: [
      {
        name: 'PilotForceAPI',
        endpoint: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      }
    ]
  },
  
  // Storage configuration
  Storage: {
    AWSS3: {
      bucket: 'your-uploads-bucket-name',
      region: 'us-east-1'
    }
  }
};

export default awsConfig;
```

Next, initialize Amplify in your application:

```javascript
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';
import App from './App';
import './index.css';

// Configure Amplify with your AWS resources
Amplify.configure(awsConfig);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
```

## Step 3: Set Up Authentication Components

Create an authentication context to manage authentication state:

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if a user is already signed in
    const checkAuthState = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setCurrentUser(user);
      } catch (error) {
        // No user is signed in
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthState();
  }, []);
  
  // Sign in function
  const signIn = async (email, password) => {
    try {
      const user = await Auth.signIn(email, password);
      setCurrentUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  // Sign up function
  const signUp = async (email, password, name) => {
    try {
      const { user } = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name
        }
      });
      return user;
    } catch (error) {
      throw error;
    }
  };
  
  // Confirm sign up function
  const confirmSignUp = async (email, code) => {
    try {
      await Auth.confirmSignUp(email, code);
    } catch (error) {
      throw error;
    }
  };
  
  // Sign out function
  const signOut = async () => {
    try {
      await Auth.signOut();
      setCurrentUser(null);
    } catch (error) {
      throw error;
    }
  };
  
  const value = {
    currentUser,
    loading,
    signIn,
    signUp,
    confirmSignUp,
    signOut
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

Wrap your application with the AuthProvider:

```javascript
// src/App.js
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Routes from './Routes';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </Router>
  );
}

export default App;
```

## Step 4: Create Login and Signup Forms

Create a login component:

```javascript
// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to sign in: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-links">
          <p>
            Don't have an account? <a href="/signup">Sign Up</a>
          </p>
          <p>
            <a href="/forgot-password">Forgot Password?</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
```

Create a signup component:

```javascript
// src/pages/Signup.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const navigate = useNavigate();
  const { signUp, confirmSignUp } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    try {
      setError('');
      setLoading(true);
      await signUp(email, password, name);
      setShowConfirmation(true);
    } catch (error) {
      setError('Failed to create an account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmation = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await confirmSignUp(email, confirmationCode);
      navigate('/login');
    } catch (error) {
      setError('Failed to confirm signup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        {!showConfirmation ? (
          <>
            <h2>Sign Up</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Signing Up...' : 'Sign Up'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Confirm Sign Up</h2>
            <p>Please check your email for a confirmation code.</p>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleConfirmation}>
              <div className="form-group">
                <label>Confirmation Code</label>
                <input
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Sign Up'}
              </button>
            </form>
          </>
        )}
        <div className="auth-links">
          <p>
            Already have an account? <a href="/login">Log In</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
```

## Step 5: Create Protected Routes

Create a component to protect routes that require authentication:

```javascript
// src/components/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;
```

Set up your routes:

```javascript
// src/Routes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
```

## Step 6: Create API Service Files

Organize your API calls into service files:

```javascript
// src/services/userService.js
import { API } from 'aws-amplify';

const API_NAME = 'PilotForceAPI';
const BASE_PATH = '/api/v1/users';

// Get current user's profile
export async function getCurrentUserProfile() {
  try {
    return await API.get(API_NAME, `${BASE_PATH}/me`);
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(userData) {
  try {
    return await API.put(API_NAME, `${BASE_PATH}/me`, {
      body: userData
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}
```

```javascript
// src/services/bookingService.js
import { API } from 'aws-amplify';

const API_NAME = 'PilotForceAPI';
const BASE_PATH = '/api/v1/bookings';

// Get all bookings for current user
export async function getUserBookings() {
  try {
    return await API.get(API_NAME, `${BASE_PATH}/user`);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    throw error;
  }
}

// Create a new booking
export async function createBooking(bookingData) {
  try {
    return await API.post(API_NAME, BASE_PATH, {
      body: bookingData
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

// Update a booking
export async function updateBooking(bookingId, bookingData) {
  try {
    return await API.put(API_NAME, `${BASE_PATH}/${bookingId}`, {
      body: bookingData
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}

// Cancel a booking
export async function cancelBooking(bookingId) {
  try {
    return await API.del(API_NAME, `${BASE_PATH}/${bookingId}`);
  } catch (error) {
    console.error('Error canceling booking:', error);
    throw error;
  }
}
```

## Step 7: Create a File Upload Component

Create a component for uploading files to S3:

```javascript
// src/components/FileUploader.js
import React, { useState } from 'react';
import { Storage } from 'aws-amplify';

function FileUploader({ onUploadSuccess, path = 'uploads/' }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setUploading(true);
    setProgress(0);
    setError('');
    
    try {
      // Upload file to S3
      const result = await Storage.put(
        `${path}${file.name}`,
        file,
        {
          contentType: file.type,
          progressCallback(progress) {
            setProgress(Math.round((progress.loaded / progress.total) * 100));
          }
        }
      );
      
      if (onUploadSuccess) {
        onUploadSuccess({
          key: result.key,
          fileName: file.name,
          fileType: file.type
        });
      }
      
      setFile(null);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="file-uploader">
      <div className="file-input">
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-btn"
        >
          {uploading ? `Uploading... ${progress}%` : 'Upload'}
        </button>
      </div>
      
      {error && <p className="error">{error}</p>}
      
      {uploading && (
        <div className="progress-bar">
          <div 
            className="progress-bar-inner" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
```

## Step 8: Create a User Profile Page

Now let's build a page that uses our components:

```javascript
// src/pages/Profile.js
import React, { useState, useEffect } from 'react';
import { Storage } from 'aws-amplify';
import { getCurrentUserProfile, updateUserProfile } from '../services/userService';
import FileUploader from '../components/FileUploader';
import { useAuth } from '../contexts/AuthContext';

function Profile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    profilePicture: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const userProfile = await getCurrentUserProfile();
        setProfile(userProfile);
        
        // If there's a profile picture, get its URL
        if (userProfile.profilePicture) {
          const pictureUrl = await Storage.get(userProfile.profilePicture);
          setProfilePictureUrl(pictureUrl);
        }
      } catch (error) {
        setError('Failed to load profile: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await updateUserProfile(profile);
      setSuccess('Profile updated successfully!');
    } catch (error) {
      setError('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleProfilePictureUpload = async (fileInfo) => {
    try {
      setError('');
      
      // Update user profile with new profile picture key
      const updatedProfile = {
        ...profile,
        profilePicture: fileInfo.key
      };
      
      await updateUserProfile(updatedProfile);
      setProfile(updatedProfile);
      
      // Get the URL for the new profile picture
      const pictureUrl = await Storage.get(fileInfo.key);
      setProfilePictureUrl(pictureUrl);
      
      setSuccess('Profile picture updated successfully!');
    } catch (error) {
      setError('Failed to update profile picture: ' + error.message);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }
  
  return (
    <div className="profile-container">
      <h1>Your Profile</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-picture">
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt="Profile" />
            ) : (
              <div className="profile-picture-placeholder">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
          
          <div className="profile-picture-upload">
            <h3>Profile Picture</h3>
            <FileUploader 
              onUploadSuccess={handleProfilePictureUpload}
              path="profile-pictures/"
            />
          </div>
        </div>
        
        <div className="profile-details">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={profile.name || ''}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={profile.email || ''}
                onChange={handleChange}
                required
                disabled
              />
              <small>Email cannot be changed</small>
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={profile.phoneNumber || ''}
                onChange={handleChange}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
```

## Step 9: Create a Dashboard with Bookings

Now let's create a dashboard that displays and manages bookings:

```javascript
// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { getUserBookings, createBooking, cancelBooking } from '../services/bookingService';

function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewBookingForm, setShowNewBookingForm] = useState(false);
  const [newBooking, setNewBooking] = useState({
    serviceType: '',
    bookingDate: '',
    bookingTime: '',
    notes: ''
  });
  
  useEffect(() => {
    loadBookings();
  }, []);
  
  async function loadBookings() {
    try {
      setLoading(true);
      const userBookings = await getUserBookings();
      setBookings(userBookings);
      setError('');
    } catch (error) {
      setError('Failed to load bookings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
  
  const handleNewBookingChange = (e) => {
    const { name, value } = e.target;
    setNewBooking(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      await createBooking(newBooking);
      
      // Reset form and reload bookings
      setNewBooking({
        serviceType: '',
        bookingDate: '',
        bookingTime: '',
        notes: ''
      });
      setShowNewBookingForm(false);
      loadBookings();
    } catch (error) {
      setError('Failed to create booking: ' + error.message);
    }
  };
  
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    
    try {
      setError('');
      await cancelBooking(bookingId);
      loadBookings();
    } catch (error) {
      setError('Failed to cancel booking: ' + error.message);
    }
  };
  
  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="bookings-section">
        <div className="section-header">
          <h2>Your Bookings</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewBookingForm(true)}
          >
            New Booking
          </button>
        </div>
        
        {showNewBookingForm && (
          <div className="booking-form-container">
            <h3>Create New Booking</h3>
            <form onSubmit={handleCreateBooking}>
              <div className="form-group">
                <label>Service Type</label>
                <select
                  name="serviceType"
                  value={newBooking.serviceType}
                  onChange={handleNewBookingChange}
                  required
                >
                  <option value="">Select a service</option>
                  <option value="flight_training">Flight Training</option>
                  <option value="aircraft_rental">Aircraft Rental</option>
                  <option value="ground_school">Ground School</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  name="bookingDate"
                  value={newBooking.bookingDate}
                  onChange={handleNewBookingChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  name="bookingTime"
                  value={newBooking.bookingTime}
                  onChange={handleNewBookingChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={newBooking.notes}
                  onChange={handleNewBookingChange}
                ></textarea>
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn btn-success">
                  Create Booking
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewBookingForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {loading ? (
          <div className="loading">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <p>You don't have any bookings yet.</p>
        ) : (
          <div className="bookings-list">
            {bookings.map(booking => (
              <div key={booking.bookingId} className="booking-card">
                <div className="booking-info">
                  <h3>{booking.serviceType.replace('_', ' ')}</h3>
                  <p>
                    <strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Time:</strong> {booking.bookingTime}
                  </p>
                  <p>
                    <strong>Status:</strong> {booking.status}
                  </p>
                  {booking.notes && (
                    <p>
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  )}
                </div>
                
                <div className="booking-actions">
                  {booking.status !== 'cancelled' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancelBooking(booking.bookingId)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
```

## Step 10: Add Navigation and Layout

Create a navigation component:

```javascript
// src/components/Navigation.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navigation() {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <Link to="/">PilotForce</Link>
      </div>
      
      {currentUser ? (
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/profile">Profile</Link>
          <button onClick={handleSignOut} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
        </div>
      )}
    </nav>
  );
}

export default Navigation;
```

Create a layout component:

```javascript
// src/components/Layout.js
import React from 'react';
import Navigation from './Navigation';

function Layout({ children }) {
  return (
    <div className="app-container">
      <Navigation />
      <main className="content-container">
        {children}
      </main>
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} PilotForce. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Layout;
```

Update your App component to use the layout:

```javascript
// src/App.js
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Routes from './Routes';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes />
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

## Step 11: Add Basic Styling

Create some basic styles:

```css
/* src/index.css */
/* Base styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f8f9fa;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-container {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Navigation */
.main-nav {
  background-color: #2c3e50;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.nav-brand a {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.nav-links a {
  color: white;
  text-decoration: none;
}

.nav-links a:hover {
  text-decoration: underline;
}

.sign-out-btn {
  background: none;
  border: 1px solid white;
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}

.sign-out-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Form styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  height: 100px;
  resize: vertical;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

.btn-success {
  background-color: #2ecc71;
  color: white;
}

.btn-success:hover {
  background-color: #27ae60;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Alert messages */
.alert {
  padding: 0.75rem 1.25rem;
  margin-bottom: 1rem;
  border: 1px solid transparent;
  border-radius: 4px;
}

.alert-danger {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb;
}

.alert-success {
  color: #155724;
  background-color: #d4edda;
  border-color: #c3e6cb;
}

/* Auth container */
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.auth-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.auth-card h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}

.auth-links {
  margin-top: 1.5rem;
  text-align: center;
}

.auth-links a {
  color: #3498db;
  text-decoration: none;
}

.auth-links a:hover {
  text-decoration: underline;
}

/* Dashboard */
.dashboard-container h1,
.profile-container h1 {
  margin-bottom: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.bookings-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.booking-card {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.booking-info {
  flex: 1;
}

.booking-info h3 {
  margin-bottom: 0.75rem;
  text-transform: capitalize;
}

.booking-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.booking-form-container {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.booking-form-container h3 {
  margin-bottom: 1rem;
}

.form-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

/* Profile */
.profile-card {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-header {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
}

.profile-picture {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #e0e0e0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.profile-picture img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-picture-placeholder {
  font-size: 4rem;
  color: #7f8c8d;
}

.profile-picture-upload {
  flex: 1;
}

.profile-picture-upload h3 {
  margin-bottom: 1rem;
}

/* File uploader */
.file-uploader {
  margin-bottom: 1rem;
}

.file-input {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background-color: #3498db;
  transition: width 0.2s;
}

/* Footer */
.footer {
  background-color: #2c3e50;
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: 2rem;
}

/* Loading state */
.loading {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

/* Error message */
.error {
  color: #e74c3c;
  margin-bottom: 1rem;
}
```

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "No current user" error | Make sure the AuthProvider is wrapping your components |
| "Network error" when calling API | Check your API endpoint URL and network connectivity |
| CORS errors | Ensure your API Gateway has CORS enabled |
| "Token expired" error | Implement token refresh or re-authenticate the user |
| S3 access denied | Check your S3 bucket permissions and CORS configuration |

## Next Steps

1. Add more advanced features like:
   - Password reset functionality
   - User profile image cropping
   - Real-time notifications
   - Pagination for large data sets

2. Improve error handling with:
   - Global error boundaries
   - More specific error messages
   - Automatic retry for transient errors

3. Enhance the user experience with:
   - Loading skeletons
   - Form validation
   - Animations and transitions
   - Responsive design improvements

## Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [React Router Documentation](https://reactrouter.com/)
- [AWS JavaScript SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [JWT.io](https://jwt.io/) (For understanding JWT tokens)
