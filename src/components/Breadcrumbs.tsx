import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface BreadcrumbItem {
  // Support both name and label properties for compatibility
  name?: string;
  label?: string;
  href?: string;
  path?: string;
  current?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const { user } = useAuth();
  
  // Hide breadcrumbs for SubUsers
  if (user?.role?.toLowerCase() === 'subuser') {
    return null;
  }

  return (
    <nav className={`flex py-4 px-4 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li className="flex items-center">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <svg className="flex-shrink-0 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
            </svg>
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          // Get item text from either name or label
          const itemText = item.label || item.name || 'Unnamed';
          // Get link path from either href or path
          const itemPath = item.href || item.path || '#';
          // Check if current from either current or isCurrent
          const isCurrent = item.current || item.isCurrent;
          
          return (
            <li key={itemText + index} className="flex items-center">
              <svg className="flex-shrink-0 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
              {isCurrent ? (
                <span className="ml-2 text-sm font-medium text-gray-700" aria-current="page">
                  {itemText}
                </span>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {itemText}
                </button>
              ) : (
                <Link
                  to={itemPath}
                  className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {itemText}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Add default export to support both named and default imports
export default Breadcrumbs;
