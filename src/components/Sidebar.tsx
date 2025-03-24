import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white shadow-md">
      <nav className="flex flex-col p-4">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            isActive
              ? "mb-4 text-blue-500 font-bold"
              : "mb-4 text-gray-300 hover:text-white"
          }
        >
          Dashboard Overview
        </NavLink>
        <NavLink
          to="/dashboard/admin/image-management"
          className={({ isActive }) =>
            isActive
              ? "mb-4 text-blue-500 font-bold"
              : "mb-4 text-gray-300 hover:text-white"
          }
        >
          Image Management
        </NavLink>
        <NavLink
          to="/dashboard/admin/user-management"
          className={({ isActive }) =>
            isActive
              ? "mb-4 text-blue-500 font-bold"
              : "mb-4 text-gray-300 hover:text-white"
          }
        >
          User Management
        </NavLink>
        <NavLink
          to="/dashboard/admin/settings"
          className={({ isActive }) =>
            isActive
              ? "mb-4 text-blue-500 font-bold"
              : "mb-4 text-gray-300 hover:text-white"
          }
        >
          Settings
        </NavLink>
        <NavLink
          to="/dashboard/admin/help-support"
          className={({ isActive }) =>
            isActive
              ? "mb-4 text-blue-500 font-bold"
              : "mb-4 text-gray-300 hover:text-white"
          }
        >
          Help & Support
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
