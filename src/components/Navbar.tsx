"use client";
import React, { useState } from "react";
import { NavItem } from "../types/types";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Import useAuth hook

interface NavbarProps {
  userInfo?: {
    username: string;
    email: string;
    name: string;
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({ userInfo }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { logout } = useAuth(); // Get the logout function from context

  // Generate navigation items
  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    // { label: "Make Booking", href: "/make-booking" },
    { label: "Flights", href: "/my-bookings" },
    { label: "Assets", href: "/assets" },
  ];

  const handleLogout = async () => {
    await logout();
    // Redirect to logout endpoint
    window.location.href = '/login';
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.user-menu')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav className="flex flex-wrap items-center gap-5 justify-between px-8 py-4 w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="flex items-center">
        {/* Logo */}
        <h1 className="text-xl font-bold text-blue-600 flex items-center">
          <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5Z" stroke="currentColor" strokeWidth="2" />
            <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          PilotForce
        </h1>
      </div>

      <div className="flex gap-8 my-auto text-base font-medium">
        {navItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.href}
            className={({ isActive }) =>
              isActive
                ? "text-blue-600 font-semibold border-b-2 border-blue-600 pb-1"
                : "text-gray-600 hover:text-blue-600 transition-colors duration-200"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="relative flex items-center user-menu">
        {userInfo && (
          <span className="mr-4 text-gray-700 hidden md:block">{userInfo.email}</span>
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
                <p className="text-sm font-medium text-gray-900">{userInfo.name || userInfo.username}</p>
                <p className="text-xs text-gray-500">{userInfo.email}</p>
              </div>
            )}
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
