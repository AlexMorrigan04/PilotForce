import React from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // Import jwtDecode

const AccessDenied: React.FC = () => {
  const [userInfo, setUserInfo] = React.useState<any>(null);
  
  React.useEffect(() => {
    // Get user info from token - check multiple token locations
    const token = localStorage.getItem("token") || 
                localStorage.getItem("idToken") || 
                localStorage.getItem("accessToken");
    if (token) {
      try {
        // Use jwt-decode for more reliable token decoding
        const decoded = jwtDecode(token);
        setUserInfo(decoded);
      } catch (error) {
      }
    }
  }, []);

  const handleLogout = () => {
    // Clear all token types
    localStorage.removeItem("token");
    localStorage.removeItem("idToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("isAdmin");
    
    // Redirect to login page instead of logout
    window.location.href = "/login";
  };

  // Display role information for debugging
  const userRole = userInfo?.['custom:role'] || 
                  userInfo?.['custom:userRole'] || 
                  userInfo?.role || 
                  "Unknown";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {userInfo?.groupError || 
             "Your account doesn't have the necessary permissions to access this application."}
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="text-sm text-center">
            <p className="font-medium text-gray-700 mb-4">
              Your account: {userInfo?.email || "Unknown"}
            </p>
            <p className="font-medium text-gray-700 mb-4">
              Your role: {userRole}
            </p>
            <p className="text-gray-500 mb-4">
              Please contact your administrator to get appropriate permissions assigned to your account.
            </p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <Link to="/dashboard"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Try Dashboard Access
            </Link>
            
            <button
              onClick={handleLogout}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
