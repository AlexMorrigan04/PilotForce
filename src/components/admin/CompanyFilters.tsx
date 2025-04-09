import React from 'react';
import { FiFilter, FiX } from 'react-icons/fi';

interface CompanyFiltersProps {
  filters: {
    status: string;
  };
  onFilterChange: (name: string, value: string) => void;
  onClearFilters: () => void;
}

const CompanyFilters: React.FC<CompanyFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const hasActiveFilters = filters.status;

  return (
    <div className="bg-white p-4 mb-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800 flex items-center">
          <FiFilter className="mr-2" />
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="mt-2 md:mt-0 text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <FiX className="mr-1" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default CompanyFilters;
