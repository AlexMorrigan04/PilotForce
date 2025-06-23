import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/common/Navbar';
import { FiCalendar, FiSearch, FiRefreshCw, FiDownload, FiFilter, FiX, FiGrid, FiList, FiClock } from 'react-icons/fi';
import * as adminService from '../services/adminService';
import AdminBookingsList from '../components/admin/AdminBookingsList';
import AdminBookingsCalendar from '../components/admin/AdminBookingsCalendar';
import AdminBookingsGrid from '../components/admin/AdminBookingsGrid';
import { Booking } from '../types/booking';
import { securityAuditLogger } from '../utils/securityAuditLogger';

interface BookingStats {
  total: number;
  pending: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  [key: string]: number;
}

const AdminBookings: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    companyId: '',
    priority: ''
  });
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  });

  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }

    loadBookings();
  }, [isAdmin, navigate, filters]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllBookings();
      if (response && response.bookings) {
        // Calculate priority for each booking
        const processedBookings = response.bookings.map((apiBooking: any) => {
          const bookingDate = new Date(apiBooking.date || apiBooking.flightDate || apiBooking.createdAt);
          const today = new Date();
          const daysDiff = Math.floor((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          let priority = 0;
          if (apiBooking.status === 'pending') {
            if (daysDiff <= 3) priority = 3; // High priority
            else if (daysDiff <= 7) priority = 2; // Medium priority
            else priority = 1; // Low priority
          }

          return {
            id: apiBooking.BookingId || apiBooking.id || '',
            BookingId: apiBooking.BookingId || apiBooking.id || '',
            title: Array.isArray(apiBooking.jobTypes) ? 
              apiBooking.jobTypes.map((jt: string | { S: string }) => 
                typeof jt === 'string' ? jt : jt.S
              ).join(', ') : 'No Job Type',
            status: apiBooking.status || 'pending',
            userId: apiBooking.UserId || '',
            UserId: apiBooking.UserId || '',
            companyId: apiBooking.CompanyId || '',
            CompanyId: apiBooking.CompanyId || '',
            username: ((apiBooking as any).username || (apiBooking as any).userName || 'Unknown') as string,
            userEmail: apiBooking.userEmail || '',
            companyName: apiBooking.companyName || 'Unknown',
            date: apiBooking.flightDate || apiBooking.scheduling?.date || apiBooking.createdAt || new Date().toISOString(),
            time: apiBooking.scheduling?.timeSlot || '',
            location: apiBooking.location || 'No location specified',
            assetId: apiBooking.assetId || '',
            assetName: apiBooking.assetName || '',
            type: apiBooking.type || '',
            details: apiBooking.details || '',
            notes: apiBooking.notes || '',
            flightDate: apiBooking.flightDate || apiBooking.scheduling?.date || apiBooking.createdAt || new Date().toISOString(),
            jobTypes: Array.isArray(apiBooking.jobTypes) ? apiBooking.jobTypes : [],
            serviceOptions: apiBooking.serviceOptions || {},
            siteContact: apiBooking.siteContact || {},
            scheduling: apiBooking.scheduling || { scheduleType: '', timeSlot: '' },
            createdAt: apiBooking.createdAt || new Date().toISOString(),
            updatedAt: apiBooking.updatedAt || new Date().toISOString(),
            quote: apiBooking.quote || undefined,
            priority
          } as Booking;
        });

        // Sort bookings based on priority and date
        const sortedBookings = processedBookings.sort((a: Booking, b: Booking) => {
          if (sortBy === 'priority') {
            if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
            const dateA = new Date(a.date || a.flightDate || a.createdAt || '').getTime();
            const dateB = new Date(b.date || b.flightDate || b.createdAt || '').getTime();
            return dateA - dateB;
          } else {
            const dateA = new Date(a.date || a.flightDate || a.createdAt || '').getTime();
            const dateB = new Date(b.date || b.flightDate || b.createdAt || '').getTime();
            return dateA - dateB;
          }
        });

        setBookings(sortedBookings);

        // Calculate stats
        const newStats = processedBookings.reduce((acc: BookingStats, booking: Booking) => {
          acc.total++;
          const status = (booking.status || '').toLowerCase();
          if (acc[status] !== undefined) {
            acc[status]++;
          }
          return acc;
        }, { total: 0, pending: 0, scheduled: 0, completed: 0, cancelled: 0 });
        
        setStats(newStats);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      dateRange: '',
      companyId: '',
      priority: ''
    });
    setSearchTerm('');
  };

  const handleExportBookings = async () => {
    try {
      const response = await adminService.getAllBookings();
      if (!response || !response.bookings) {
        throw new Error('No bookings data available');
      }

      // Convert bookings to CSV format
      const bookings = response.bookings;
      const csvRows = [];

      // Add headers
      const headers = [
        'Booking ID',
        'Customer Name',
        'Email',
        'Company',
        'Flight Date',
        'Location',
        'Status',
        'Created At',
        'Job Types'
      ];
      csvRows.push(headers.join(','));

      // Add data rows
      bookings.forEach(booking => {
        const row = [
          booking.BookingId || '',
          (booking.username || '').replace(/,/g, ' '), // Replace commas to avoid CSV issues
          (booking.userEmail || '').replace(/,/g, ' '),
          (booking.companyName || '').replace(/,/g, ' '),
          booking.flightDate || '',
          (booking.location || '').replace(/,/g, ' '),
          booking.status || '',
          booking.createdAt || '',
          Array.isArray(booking.jobTypes) 
            ? booking.jobTypes.map((jt: string | { S: string }) => 
                typeof jt === 'string' ? jt : jt.S
              ).join(';')
            : ''
        ];
        csvRows.push(row.join(','));
      });

      // Create and download the CSV file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Log successful export
      securityAuditLogger.logDataAccess(
        localStorage.getItem('userId') || 'unknown',
        'export',
        'bookings_csv',
        'Export Bookings',
        true,
        { recordCount: bookings.length, exportDate: new Date().toISOString() }
      );
      
    } catch (err: any) {
      // Log failed export
      securityAuditLogger.logDataAccess(
        localStorage.getItem('userId') || 'unknown',
        'export',
        'bookings_csv',
        'Export Bookings',
        false,
        { error: err.message }
      );
      
      setError(err.message || 'Failed to export bookings');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Booking Management
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <div className="flex space-x-2 bg-white rounded-md shadow-sm p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiList className="mr-1.5 h-4 w-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiGrid className="mr-1.5 h-4 w-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                  viewMode === 'calendar' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiCalendar className="mr-1.5 h-4 w-4" />
                Calendar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'priority' ? 'date' : 'priority')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiClock className="mr-2" />
              {sortBy === 'priority' ? 'Sort by Date' : 'Sort by Priority'}
            </button>
            <button
              type="button"
              onClick={handleExportBookings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiDownload className="mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 rounded-md p-3">
                    <FiCalendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-yellow-100 rounded-md p-3">
                    <FiCalendar className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 rounded-md p-3">
                    <FiCalendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.scheduled}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-green-100 rounded-md p-3">
                    <FiCalendar className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.completed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-red-100 rounded-md p-3">
                    <FiCalendar className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.cancelled}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Search
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search bookings..."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                  Date Range
                </label>
                <select
                  id="dateRange"
                  name="dateRange"
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                </select>
              </div>

              <div className="flex items-end space-x-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiX className="mr-2" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={loadBookings}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiRefreshCw className="mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiX className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          /* Bookings Content */
          <div className="bg-white shadow rounded-lg">
            {viewMode === 'list' && (
              <AdminBookingsList
                showActions={true}
                sortBy={sortBy}
                bookings={bookings}
                onDelete={async (bookingId: string) => {
                  try {
                    await adminService.deleteBooking(bookingId);
                    loadBookings();
                  } catch (err: any) {
                    setError(err.message || 'Failed to delete booking');
                  }
                }}
              />
            )}
            {viewMode === 'grid' && (
              <AdminBookingsGrid
                showActions={true}
                sortBy={sortBy}
                bookings={bookings}
                onDelete={async (bookingId: string) => {
                  try {
                    await adminService.deleteBooking(bookingId);
                    loadBookings();
                  } catch (err: any) {
                    setError(err.message || 'Failed to delete booking');
                  }
                }}
              />
            )}
            {viewMode === 'calendar' && (
              <AdminBookingsCalendar
                showActions={true}
                bookings={bookings}
                onDelete={async (bookingId: string) => {
                  try {
                    await adminService.deleteBooking(bookingId);
                    loadBookings();
                  } catch (err: any) {
                    setError(err.message || 'Failed to delete booking');
                  }
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;
