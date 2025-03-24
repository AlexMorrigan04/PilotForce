import React from "react";
import { Navbar } from "./Navbar";

const SomeOtherComponent: React.FC = (): React.ReactElement | null => {
  // Retrieve user information from localStorage
  const token = localStorage.getItem('token');
  let userInfo = null;
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      userInfo = JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
    }
  }

  return (
    <div>
      <Navbar userInfo={userInfo} />
      {/* ...existing code... */}
    </div>
  );
};

export default SomeOtherComponent;
