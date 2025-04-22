import React from 'react';
import { FiFilter, FiX } from 'react-icons/fi';

interface Company {
  id: string;
  name: string;
}

interface AssetFiltersProps {
  companies: Company[];
  filters: {
    company: string;
    type: string;
    status: string;
  };
  onFilterChange: (name: string, value: string) => void;
  onClearFilters: () => void;
}

const AssetFilters: React.FC<AssetFiltersProps> = ({
  companies,
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  // Available asset types based on your DynamoDB schema
  const assetTypes = ['buildings', 'land', 'infrastructure', 'equipment', 'other'];
  
  // Available asset statuses
  const assetStatuses = ['Active', 'Inactive', 'Maintenance', 'Planned'];

  // Add logging to help debugging
  const handleFilterChange = (name: string, value: string) => {
    console.log(`Changing filter: ${name} to value: ${value}`);
    onFilterChange(name, value);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <FiFilter className="mr-2" /> Filters
        </h2>
        {(filters.company || filters.type || filters.status) && (
          <button
            onClick={() => {
              console.log('Clearing all filters');
              onClearFilters();
            }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <FiX className="mr-1" /> Clear filters
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Company filter */}
        <div>
          <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700">
            Company
          </label>
          <select
            id="company-filter"
            value={filters.company}
            onChange={(e) => handleFilterChange('company', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Companies</option>
            {companies && companies.length > 0 ? (
              companies.map((company) => (
                <option key={company.id || `company-${Math.random()}`} value={company.id}>
                  {company.name || 'Unnamed Company'}
                </option>
              ))
            ) : (
              <option disabled>No companies available</option>
            )}
          </select>
        </div>
        
        {/* Asset type filter */}
        <div>
          <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">
            Asset Type
          </label>
          <select
            id="type-filter"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Types</option>
            {assetTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        {/* Status filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            {assetStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AssetFilters;
