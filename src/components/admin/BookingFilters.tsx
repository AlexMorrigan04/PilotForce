import React from 'react';
import { FiFilter, FiX, FiCalendar } from 'react-icons/fi';

interface Company {
  id: string;
  name: string;
}

interface BookingFiltersProps {
  companies: Company[];
  filters: {
    company: string;
    status: string;
    type: string;
    dateFrom: string;
    dateTo: string;
  };
  onFilterChange: (name: string, value: string) => void;
  onClearFilters: () => void;
}

const BookingFilters: React.FC<BookingFiltersProps> = ({
  companies,
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const statuses = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];
  const types = ['All', 'Drone Survey', 'Photography', 'Videography', 'Inspection', 'Mapping', 'Other'];
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange(name, value === 'All' ? '' : value);
  };
  
  const isFiltersApplied = filters.company || filters.status || filters.type || filters.dateFrom || filters.dateTo;
  
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
            Company
          </label>
          <select
            id="company"
            name="company"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.company || 'All'}
            onChange={handleInputChange}
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
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.status || 'All'}
            onChange={handleInputChange}
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Booking Type
          </label>
          <select
            id="type"
            name="type"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filters.type || 'All'}
            onChange={handleInputChange}
          >
            {types.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
            Date From
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              name="dateFrom"
              id="dateFrom"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              value={filters.dateFrom}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
            Date To
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              name="dateTo"
              id="dateTo"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
              value={filters.dateTo}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingFilters;
