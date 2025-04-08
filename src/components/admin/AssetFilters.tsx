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
  onClearFilters
}) => {
  const types = ['All', 'Drone', 'Camera', 'Accessories', 'Other'];
  const statuses = ['All', 'Active', 'Inactive', 'Pending Approval', 'Under Maintenance'];
  
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange(name, value === 'All' ? '' : value);
  };
  
  const isFiltersApplied = filters.company || filters.type || filters.status;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FiFilter className="mr-2" /> Filters
        </h3>
        {isFiltersApplied && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <FiX className="mr-1" /> Clear Filters
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            Company
          </label>
          <select
            id="company"
            name="company"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.company || 'All'}
            onChange={handleSelectChange}
          >
            <option value="All">All Companies</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Asset Type
          </label>
          <select
            id="type"
            name="type"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.type || 'All'}
            onChange={handleSelectChange}
          >
            {types.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.status || 'All'}
            onChange={handleSelectChange}
          >
            {statuses.map(status => (
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
