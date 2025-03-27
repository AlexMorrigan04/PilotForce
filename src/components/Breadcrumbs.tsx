import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

type BreadcrumbItem = {
  label: string;
  path?: string;
  onClick?: () => void;
  isCurrent?: boolean;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const navigate = useNavigate();

  // Handle clicking on a breadcrumb item
  const handleClick = (item: BreadcrumbItem, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto max-w-6xl px-4 py-2">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3 flex-wrap">
            {items.map((item, index) => (
              <li 
                key={index} 
                className={`inline-flex items-center ${index > 0 ? 'ml-2' : ''}`}
                aria-current={item.isCurrent ? 'page' : undefined}
              >
                {index > 0 && (
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                
                {item.isCurrent ? (
                  <span className={`${index === 0 ? '' : 'ml-1'} text-sm font-medium text-gray-500 md:ml-2 truncate max-w-[150px] md:max-w-xs`}>
                    {item.label}
                  </span>
                ) : (
                  <a 
                    href={item.path || '#'}
                    onClick={(e) => handleClick(item, e)}
                    className={`${index === 0 ? 'inline-flex items-center' : 'ml-1'} text-sm font-medium text-gray-600 hover:text-blue-600 md:ml-2`}
                  >
                    {index === 0 && (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    )}
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumbs;
