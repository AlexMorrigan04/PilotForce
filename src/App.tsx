import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import MakeBookings from "./pages/MakeBookings";
import Booking from "./pages/Booking";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Assets from "./pages/Assets";
import MyBookings from "./pages/MyBookings";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import NewAsset from './pages/NewAsset';
import AssetDetails from './pages/AssetDetails';
import FlightDetails from "./pages/FlightDetails";
import WaitingForApproval from "./pages/WaitingForApproval";

// Error boundary component that catches errors in the UI
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode, onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    
    // Only call onError for fatal errors to prevent reload loops
    if (this.isFatalError(error)) {
      this.props.onError();
    }
  }
  
  // Add method to determine if an error is fatal enough to warrant a reload
  isFatalError(error: Error): boolean {
    // Check if error message or stack trace contains specific patterns 
    // that indicate non-recoverable errors
    const fatalPatterns = [
      'ChunkLoadError',
      'Loading chunk',
      'Failed to fetch dynamically imported module'
    ];
    
    // Skip reload for Mapbox indoor manager errors - these are handled by component cleanup
    if (error.message?.includes('indoor') || 
        error.stack?.includes('indoor_manager') ||
        error.message?.includes('Cannot read properties of undefined')) {
      console.log('Ignoring Mapbox cleanup error');
      return false;
    }
    
    // Check if it's a fatal error based on message
    return fatalPatterns.some(pattern => 
      error.message?.includes(pattern) || error.stack?.includes(pattern)
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// This component will force re-rendering when the route changes
const RouteChangeHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    // When the location changes, update the key to force re-render
    setKey(prevKey => prevKey + 1);
    
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  // Add reload prevention mechanism
  const [lastReloadTime, setLastReloadTime] = useState(0);
  const RELOAD_THRESHOLD = 10000; // 10 seconds between reloads
  
  // Modified handler with protection against frequent reloads
  const handleError = useCallback(() => {
    const now = Date.now();
    
    // Only reload if enough time has passed since last reload
    if (now - lastReloadTime > RELOAD_THRESHOLD) {
      console.log("Significant error detected, reloading page...");
      setLastReloadTime(now);
      
      // Use a timeout to prevent immediate reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      console.log("Error detected but ignoring reload due to threshold");
    }
  }, [lastReloadTime]);

  return (
    <ErrorBoundary onError={handleError}>
      <React.Fragment key={key}>{children}</React.Fragment>
    </ErrorBoundary>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <RouteChangeHandler>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/waiting-for-approval" element={<WaitingForApproval />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/make-booking" element={<ProtectedRoute><MakeBookings /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/new-asset" element={<ProtectedRoute><NewAsset /></ProtectedRoute>} />
        <Route path="/asset/:assetId" element={<ProtectedRoute><AssetDetails /></ProtectedRoute>} />
        <Route path="/flight-details/:bookingId" element={<ProtectedRoute><FlightDetails /></ProtectedRoute>} />
      </Routes>
    </RouteChangeHandler>
  );
};

// Add window error event listener for global errors
const App: React.FC = () => {
  console.log("App component rendered");
  
  // Track reload attempts to prevent loops
  const [reloadAttempts, setReloadAttempts] = useState<{[key: string]: number}>({});
  const MAX_RELOAD_ATTEMPTS = 3;
  const ATTEMPT_RESET_TIME = 60000; // 1 minute

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.log("Global error detected:", event.message);
      
      // Ensure event.message is defined before calling includes
      if (event.message && (
          event.message.includes("Error in Mapbox") || 
          event.message.includes("Cannot read properties of undefined") || 
          event.message.includes("Access Token") ||
          event.message.includes("is undefined") ||
          event.message.includes("Network request failed") ||
          event.message.includes("Failed to fetch") ||
          event.message.includes("indoor"))) {
        console.log("Ignoring non-critical error");
        event.preventDefault();
        return true;
      }
      
      // Ensure event.message is defined before calling substring
      if (event.message) {
        // Create a key from the error message to track specific errors
        const errorKey = event.message.substring(0, 50);
        
        // Track reload attempts for this specific error
        const attempts = reloadAttempts[errorKey] || 0;
        
        if (attempts < MAX_RELOAD_ATTEMPTS) {
          // Specific errors that should trigger a reload
          if (event.message.includes("indoor_manager") || 
              event.error?.stack?.includes("indoor_manager.ts")) {
            console.log(`Map error detected (attempt ${attempts + 1}/${MAX_RELOAD_ATTEMPTS}), reloading page...`);
            
            // Update attempts counter
            setReloadAttempts({
              ...reloadAttempts,
              [errorKey]: attempts + 1
            });
            
            // Schedule reset of this error counter after some time
            setTimeout(() => {
              setReloadAttempts(current => ({
                ...current,
                [errorKey]: 0
              }));
            }, ATTEMPT_RESET_TIME);
            
            // Only reload for excessive attempts
            if (attempts >= 1) {
              event.preventDefault();
              window.location.reload();
              return true;
            }
          }
        } else {
          console.log(`Maximum reload attempts (${MAX_RELOAD_ATTEMPTS}) reached for error: ${errorKey}`);
          event.preventDefault();
          return true;
        }
      }
    };

    // Add both error and unhandledrejection listeners with improved logic
    window.addEventListener('error', handleGlobalError, true);
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.log("Unhandled rejection:", event.reason);
      
      // Skip common non-critical errors
      if (event.reason?.message?.includes("Failed to fetch") ||
          event.reason?.message?.includes("Network error") ||
          event.reason?.message?.includes("AbortError")) {
        console.log("Ignoring non-critical rejection");
        return;
      }
      
      // Only reload for specific critical errors
      if (event.reason?.message?.includes("indoor_manager") || 
          event.reason?.stack?.includes("indoor_manager.ts") ||
          event.reason?.message?.includes("ChunkLoadError")) {
        
        console.log("Critical rejection error detected, reloading page after delay...");
        
        // Add delay to prevent immediate reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [reloadAttempts]);

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

// Export App as the default export
export default App;