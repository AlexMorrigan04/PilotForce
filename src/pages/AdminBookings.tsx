import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import ResourceUploadModal from '../components/admin/ResourceUploadModal';
import BookingResourcesModal from '../components/admin/BookingResourcesModal';
import { FiCalendar, FiSearch, FiRefreshCw, FiDownload, FiFilter, FiX, FiEye, FiUpload, FiTrash2, FiCheck } from 'react-icons/fi';
import * as adminService from '../services/adminService';
import { validateAmplifyConfig } from '../utils/apiUtils';

interface Booking {
  id: string;
  title?: string | string[];
  status: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  companyName?: string;
  companyId?: string;
  location?: string;
  flightDate?: string;
  assetName?: string;
  assetId?: string;
  jobTypes?: string | string[];
  serviceOptions?: any;
  notes?: string;
  siteContact?: {
    name?: string;
    id?: string;
    isAvailableOnsite?: boolean;
    phone?: string;
    email?: string;
  };
  postcode?: string;
  emailDomain?: string;
}

const AdminBookings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    companyId: ''
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isResourcesModalOpen, setIsResourcesModalOpen] = useState<boolean>(false);
  const [selectedBookingForUpload, setSelectedBookingForUpload] = useState<string | null>(null);
  const [selectedBookingForResources, setSelectedBookingForResources] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState<boolean>(false);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    validateAmplifyConfig();
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }

    fetchBookings();
  }, [isAdmin, navigate, filters]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllBookings();

      if (!response || !response.bookings) {
        throw new Error('Invalid API response format');
      }

      const mappedBookings = response.bookings.map((booking: any, index: number) => {
        const generatedId = booking.BookingId || booking.id || `booking-${Date.now()}-${index}`;

        return {
          id: generatedId,
          title: booking.jobTypes || `Flight at ${booking.location || 'Unknown Location'}`,
          status: booking.status || 'Pending',
          createdAt: booking.createdAt || new Date().toISOString(),
          userName: booking.userName || 'No Name',
          userEmail: booking.userEmail || booking.email || 'No Email',
          userPhone: booking.userPhone || booking.phone || 'No Phone',
          companyName: booking.companyName || 'No Company',
          companyId: booking.CompanyId || booking.companyId || '',
          location: booking.location || 'No Location',
          flightDate: booking.flightDate || booking.date || 'No Date',
          assetName: booking.assetName || 'No Asset',
          assetId: booking.assetId || '',
          jobTypes: booking.jobTypes || booking.type || 'No Job Type',
          serviceOptions: booking.serviceOptions || [],
          notes: booking.notes || booking.details || 'No Notes',
          siteContact: booking.siteContact || 'No Contact',
          postcode: booking.postcode || 'No Postcode',
          emailDomain: booking.emailDomain || ''
        };
      });

      setBookings(mappedBookings);
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
      companyId: ''
    });
  };

  const filteredBookings = bookings.filter(booking => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      (booking.title && typeof booking.title === 'string' && booking.title.includes(searchTermLower)) ||
      (booking.location && typeof booking.location === 'string' && booking.location.includes(searchTermLower)) ||
      (booking.status && typeof booking.status === 'string' && booking.status.includes(searchTermLower)) ||
      (booking.userName && typeof booking.userName === 'string' && booking.userName.includes(searchTermLower)) ||
      (booking.companyName && typeof booking.companyName === 'string' && booking.companyName.includes(searchTermLower))
    );
  });

  const handleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(filteredBookings.map(booking => booking.id));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId));
    } else {
      setSelectedBookings([...selectedBookings, bookingId]);
    }
  };

  const handleViewBookingDetails = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setSelectedBooking(booking);
      setShowDetailModal(true);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      try {
        setLoading(true);
        await adminService.deleteBooking(bookingId);
        setBookings(bookings.filter(booking => booking.id !== bookingId));
        setSelectedBookings(selectedBookings.filter(id => id !== bookingId));
        alert('Booking deleted successfully');
      } catch (err: any) {
        setError(err.message || 'Failed to delete booking');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUploadClick = (bookingId: string) => {
    setSelectedBookingForUpload(bookingId);
    setIsUploadModalOpen(true);
  };

  const handleUploadComplete = () => {
    setUploadSuccess(true);
    setIsUploadModalOpen(false);

    setTimeout(() => {
      setUploadSuccess(false);
    }, 5000);

    fetchBookings();
  };

  const handleViewResources = (bookingId: string) => {
    setSelectedBookingForResources(bookingId);
    setIsResourcesModalOpen(true);
  };

  const handleExportBookings = () => {
    const headers = [
      'ID', 'Job Type', 'Status', 'Location', 'Flight Date', 
      'Asset', 'Customer', 'Company', 'Created'
    ];
    
    const csvData = filteredBookings.map(booking => [
      booking.id,
      booking.jobTypes || '',
      booking.status || '',
      booking.location || '',
      booking.flightDate || '',
      booking.assetName || '',
      booking.userName || '',
      booking.companyName || '',
      new Date(booking.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bookings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? dateString : date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') return 'bg-green-100 text-green-800';
    if (statusLower === 'confirmed') return 'bg-blue-100 text-blue-800';
    if (statusLower === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (statusLower === 'cancelled') return 'bg-red-100 text-red-800';
    if (statusLower === 'scheduled') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setUpdatingBookingId(bookingId);
      
      const response = await adminService.updateBookingStatus(bookingId, newStatus);
      
      if (response.success || (response.message && response.message.includes('success'))) {
        setBookings(bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        ));
        
        setStatusUpdateSuccess(true);
        setStatusUpdateMessage(`Booking successfully marked as ${newStatus}`);
        
        setTimeout(() => {
          setStatusUpdateSuccess(false);
          setStatusUpdateMessage('');
        }, 5000);
      } else {
        setError(`Failed to update booking: ${response.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      if (err.response?.data?.message?.includes('successfully')) {
        setBookings(bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        ));
        
        setStatusUpdateSuccess(true);
        setStatusUpdateMessage(`Booking successfully marked as ${newStatus}`);
        
        setTimeout(() => {
          setStatusUpdateSuccess(false);
          setStatusUpdateMessage('');
        }, 5000);
      } else {
        setError(`Error updating booking status: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const renderTableActions = (booking: Booking) => {
    const statusLower = booking.status.toLowerCase();
    
    return (
      <div className="flex space-x-2 justify-end">
        <button
          onClick={() => handleViewBookingDetails(booking.id)}
          className="text-blue-600 hover:text-blue-800"
          title="View Details"
        >
          <FiEye size={18} />
        </button>
        
        {statusLower === 'pending' && (
          <button
            onClick={() => handleUpdateBookingStatus(booking.id, 'Scheduled')}
            disabled={updatingBookingId === booking.id}
            className={`text-blue-600 hover:text-blue-800 ${updatingBookingId === booking.id ? 'opacity-50' : ''}`}
            title="Schedule Booking"
          >
            {updatingBookingId === booking.id ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FiCalendar size={18} />
            )}
          </button>
        )}
        
        {statusLower === 'scheduled' && (
          <button
            onClick={() => handleUpdateBookingStatus(booking.id, 'Completed')}
            disabled={updatingBookingId === booking.id}
            className={`text-green-600 hover:text-green-800 ${updatingBookingId === booking.id ? 'opacity-50' : ''}`}
            title="Mark as Completed"
          >
            {updatingBookingId === booking.id ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FiCheck size={18} />
            )}
          </button>
        )}
        
        <button
          onClick={() => handleViewResources(booking.id)}
          className="text-indigo-600 hover:text-indigo-800"
          title="View Resources"
        >
          <FiEye size={18} />
        </button>
        <button
          onClick={() => handleUploadClick(booking.id)}
          className="text-green-600 hover:text-green-800"
          title="Upload Resources"
        >
          <FiUpload size={18} />
        </button>
        <button
          onClick={() => handleDeleteBooking(booking.id)}
          className="text-red-600 hover:text-red-800"
          title="Delete Booking"
        >
          <FiTrash2 size={18} />
        </button>
      </div>
    );
  };

  const formatServiceOptions = (serviceOptions: any): JSX.Element => {
    if (!serviceOptions || Object.keys(serviceOptions).length === 0) {
      return <span className="text-sm">None</span>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(serviceOptions).map(([serviceType, options]: [string, any]) => (
          <div key={serviceType} className="bg-white rounded p-2">
            <h5 className="font-medium text-blue-600 mb-2">{serviceType}</h5>
            <div className="pl-2 space-y-2">
              {Object.entries(options).map(([optionName, optionValue]: [string, any]) => (
                <div key={optionName}>
                  <span className="text-sm font-medium capitalize">{optionName}: </span>
                  {Array.isArray(optionValue) ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {optionValue.map((value: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded-full">
                          {value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm">{String(optionValue)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
            <p className="text-gray-600">View and manage all flight bookings</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={handleExportBookings}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              <FiDownload className="mr-2" />
              Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {uploadSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">Resources uploaded successfully!</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setUploadSuccess(false)}
            >
              <span className="sr-only">Close</span>
              <FiX className="h-6 w-6" />
            </button>
          </div>
        )}

        {statusUpdateSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{statusUpdateMessage}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setStatusUpdateSuccess(false)}
            >
              <span className="sr-only">Close</span>
              <FiX className="h-6 w-6" />
            </button>
          </div>
        )}

        <div className="bg-white p-4 mb-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800 flex items-center">
              <FiFilter className="mr-2" />
              Filters
            </h2>
            {(filters.status || filters.dateRange || filters.companyId) && (
              <button
                onClick={handleClearFilters}
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
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                id="dateRange"
                name="dateRange"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-64 mb-4 sm:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookings..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredBookings.length} booking(s)
              </span>
              <button
                onClick={() => fetchBookings()}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Refresh"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {selectedBookings.length > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center">
              <span className="mr-4 text-sm text-blue-800">
                {selectedBookings.length} booking(s) selected
              </span>
            </div>
          )}
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No bookings found matching your criteria.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={selectedBookings.length > 0 && selectedBookings.length === filteredBookings.length}
                          onChange={handleSelectAll}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            checked={selectedBookings.includes(booking.id)}
                            onChange={() => handleSelectBooking(booking.id)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.jobTypes || 'General Booking'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {booking.id.substring(0, 8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Asset: {booking.assetName || 'None'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {booking.location || 'Not specified'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.postcode || 'No postcode'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {booking.userName || 'No name'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.companyName || 'No company'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.userEmail || 'No email'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(booking.status)}`}>
                          {booking.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(booking.flightDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {renderTableActions(booking)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {showDetailModal && selectedBooking && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowDetailModal(false)}></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Booking Details
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeStyle(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Basic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Booking ID</p>
                          <p className="text-sm font-medium break-all">{selectedBooking.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Job Type</p>
                          <p className="text-sm font-medium">{selectedBooking.jobTypes || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p className="text-sm font-medium">{formatDate(selectedBooking.flightDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Created At</p>
                          <p className="text-sm font-medium">{formatDate(selectedBooking.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="text-sm font-medium">{selectedBooking.status}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Location</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Coordinates/Address</p>
                          <p className="text-sm font-medium break-all">{selectedBooking.location || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Postcode</p>
                          <p className="text-sm font-medium">{selectedBooking.postcode || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Customer Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Customer Name</p>
                          <p className="text-sm font-medium">{selectedBooking.userName || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="text-sm font-medium">{selectedBooking.userEmail || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="text-sm font-medium">{selectedBooking.userPhone || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email Domain</p>
                          <p className="text-sm font-medium">{selectedBooking.emailDomain || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Company Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Company Name</p>
                          <p className="text-sm font-medium">{selectedBooking.companyName || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Company ID</p>
                          <p className="text-sm font-medium break-all">{selectedBooking.companyId || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Asset Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Asset Name</p>
                          <p className="text-sm font-medium">{selectedBooking.assetName || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Asset ID</p>
                          <p className="text-sm font-medium break-all">{selectedBooking.assetId || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    {selectedBooking.siteContact && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">Site Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="text-sm font-medium">{selectedBooking.siteContact.name || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">ID</p>
                            <p className="text-sm font-medium">{selectedBooking.siteContact.id || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="text-sm font-medium">{selectedBooking.siteContact.phone || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="text-sm font-medium">{selectedBooking.siteContact.email || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Available Onsite</p>
                            <p className="text-sm font-medium">
                              {selectedBooking.siteContact.isAvailableOnsite ? 'Yes' : 'No'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedBooking.notes && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">Notes</h4>
                        <p className="text-sm">{selectedBooking.notes}</p>
                      </div>
                    )}
                    {selectedBooking.serviceOptions && Object.keys(selectedBooking.serviceOptions).length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="font-medium text-gray-800 mb-2">Service Options</h4>
                        <div className="bg-gray-100 p-3 rounded">
                          {formatServiceOptions(selectedBooking.serviceOptions)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BookingResourcesModal
        isOpen={isResourcesModalOpen}
        onClose={() => setIsResourcesModalOpen(false)}
        bookingId={selectedBookingForResources || ''}
      />

      <ResourceUploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        bookingId={selectedBookingForUpload || ''}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export default AdminBookings;
