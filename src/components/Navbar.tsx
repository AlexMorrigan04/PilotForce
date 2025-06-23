"use client";
import React, { useState, useEffect } from "react";
import { NavItem } from "../types/types";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Navbar: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Generate navigation items based on user role
  const userRole = user?.role || user?.['custom:role'] || 'User';
  const isSubUser = userRole === 'SubUser';
  const navItems: NavItem[] = isSubUser 
    ? [
        { label: "Flights", href: "/my-bookings" },
        { label: "Assets", href: "/assets" },
      ]
    : [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Flights", href: "/my-bookings" },
        { label: "Assets", href: "/assets" },
      ];

  const handleLogout = async () => {
    await logout();
    // Redirect to logout endpoint
    window.location.href = "/login";
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest(".user-menu")) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Get user info from auth context
  const userInfo = user ? {
    username: user.username || user.email || '',
    email: user.email || '',
    name: user.name || user.username || user.email?.split('@')[0] || 'User'
  } : null;

  return (
    <nav className="flex flex-wrap items-center gap-5 justify-between px-8 py-4 w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="flex items-center">
        {/* Logo */}
        <h1 className="text-xl font-bold text-blue-600 flex items-center">
          <svg
            className="w-8 h-8 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            xmlns=""
          >
            <path
              d="M3 5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M7 7L17 17M17 7L7 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          PilotForce
        </h1>
      </div>

      <div className="flex gap-8 my-auto text-base font-medium">
        {navItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              // Prevent any navigation loop detection from interfering
              sessionStorage.removeItem('navigationInProgress');
              sessionStorage.removeItem('navigationLoopDetected');
              
              // Clear any flags that might prevent navigation
              sessionStorage.removeItem('redirectInProgress');
              
              // Use consistent navigation for all items
              // Tell NavigationHandler where we're trying to go
              sessionStorage.setItem('attemptingNavigationTo', item.href);
              
              // Use React Router navigation with replace option for all navigation
              navigate(item.href, { replace: true });
            }}
            className={
              location.pathname === item.href
                ? "text-blue-600 font-semibold border-b-2 border-blue-600 pb-1"
                : "text-gray-600 hover:text-blue-600 transition-colors duration-200"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center user-menu">
        {userInfo && (
          <span className="mr-4 text-gray-700 hidden md:block">
            {userInfo.email}
          </span>
        )}
        <button
          aria-label="User profile"
          className="flex items-center focus:outline-none"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
            {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : "U"}
          </div>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-32 w-60 bg-white border border-gray-200 rounded-lg shadow-lg">
            {userInfo && (
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {userInfo.name}
                </p>
                <p className="text-xs text-gray-500">{userInfo.email}</p>
              </div>
            )}
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/profile');
              }}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
