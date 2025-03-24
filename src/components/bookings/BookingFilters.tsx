import React from 'react';
import { BookingStatus } from '../../types/bookingTypes';

interface BookingFiltersProps {
  activeFilters: BookingStatus[];
  onFilterChange: (status: BookingStatus) => void;
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bookingCounts: {
    total: number;
    pending: number;
    scheduled: number;
    completed: number;
  };
  setActiveFilters: React.Dispatch<React.SetStateAction<BookingStatus[]>>;
}

export const BookingFilters: React.FC<BookingFiltersProps> = ({
  activeFilters,
  onFilterChange,
  searchTerm,
  onSearchChange,
  bookingCounts,
  setActiveFilters
}) => {
  const filters: { label: string; value: BookingStatus; count: number }[] = [
    { label: 'Pending', value: 'pending', count: bookingCounts.pending },
    { label: 'Scheduled', value: 'scheduled', count: bookingCounts.scheduled },
    { label: 'Completed', value: 'completed', count: bookingCounts.completed },
  ];

  const isFilterActive = (status: BookingStatus) => activeFilters.includes(status);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-4 md:space-y-0">
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              className={`
                flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${isFilterActive(filter.value)
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}
              `}
            >
              {filter.label}
              <span className="ml-1 text-xs bg-white rounded-full px-2 py-0.5">
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Search bookings..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">
          {activeFilters.length > 0 ? 'Filtered bookings' : 'All bookings'}
          <span className="ml-1 font-medium text-gray-900">({bookingCounts.total})</span>
        </span>

        {activeFilters.length > 0 && (
          <button
            onClick={() => setActiveFilters([])}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
