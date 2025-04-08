import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import BookingTable from '../components/admin/BookingTable';
import BookingFilters from '../components/admin/BookingFilters';
import { FiSearch, FiRefreshCw, FiCalendar, FiDownload } from 'react-icons/fi';
import * as adminService from '../services/adminService';

interface Booking {
  id: string;
  userId: string;
  username: string;
  companyId: string;
  companyName: string;
  status: string;
  date: string;
  time: string;
  location: string;
  type: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

const AdminBookings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    company: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: ''
  });
  const navigate = useNavigate();

  // Verify admin status and load data
  useEffect(() => {
    if (!isAdmin) {
      setError('You do not have permission to access this page');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return;
    }
    
    fetchBookings();
    fetchCompanies();
  }, [isAdmin, navigate]);

  // Fetch bookings from API
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllBookings(filters);
      setBookings(response.bookings || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies for filters
  const fetchCompanies = async () => {
    try {
      const response = await adminService.getAllCompanies();
      setCompanies(response.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  // Apply filters
  useEffect(() => {
    fetchBookings();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      company: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Filter bookings based on search term
  const filteredBookings = bookings.filter(booking => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      booking.username.toLowerCase().includes(searchTermLower) ||
      booking.companyName.toLowerCase().includes(searchTermLower) ||
      booking.location.toLowerCase().includes(searchTermLower) ||
      booking.type.toLowerCase().includes(searchTermLower) ||
      booking.status.toLowerCase().includes(searchTermLower)
    );
  });

  // Handle booking selection for bulk actions
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

  // Booking management actions
  const handleEditBooking = (bookingId: string) => {
    navigate(`/admin/bookings/edit/${bookingId}`);
  };

  const handleViewBookingDetails = (bookingId: string) => {
    navigate(`/admin/bookings/details/${bookingId}`);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      try {
        setLoading(true);
        await adminService.deleteBooking(bookingId);
        // Update local state
        setBookings(bookings.filter(booking => booking.id !== bookingId));
        // Remove from selected bookings if present
        setSelectedBookings(selectedBookings.filter(id => id !== bookingId));
        alert('Booking deleted successfully');
      } catch (err: any) {
        console.error('Error deleting booking:', err);
        setError(err.message || 'Failed to delete booking');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      setLoading(true);
      await adminService.updateBookingStatus(bookingId, status);
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId ? { ...booking, status } : booking
      ));
      alert(`Booking status updated to ${status}`);
    } catch (err: any) {
      console.error('Error updating booking status:', err);
      setError(err.message || 'Failed to update booking status');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadData = (bookingId: string) => {
    navigate(`/admin/bookings/upload/${bookingId}`);
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    if (selectedBookings.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedBookings.length} bookings? This action cannot be undone.`)) {
      try {
        setLoading(true);
        
        // Process deletions sequentially
        for (const bookingId of selectedBookings) {
          await adminService.deleteBooking(bookingId);
        }
        
        // Update local state
        setBookings(bookings.filter(booking => !selectedBookings.includes(booking.id)));
        setSelectedBookings([]);
        alert('Bookings deleted successfully');
      } catch (err: any) {
        console.error('Error deleting bookings:', err);
        setError(err.message || 'Failed to delete bookings');
      } finally {
        setLoading(false);
      }
    }
  };

  // Export bookings to CSV
  const handleExportBookings = () => {
    const headers = ['Company', 'User', 'Date', 'Time', 'Type', 'Status', 'Location'];
    
    const csvData = filteredBookings.map(booking => [
      booking.companyName,
      booking.username,
      new Date(booking.date).toLocaleDateString(),
      booking.time,
      booking.type,
      booking.status,
      booking.location
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AdminNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
            <p className="text-gray-600">View and manage all bookings</p>
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

        {/* Booking filters */}
        <BookingFilters 
          companies={companies}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Booking management controls */}
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
                {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={fetchBookings}
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
                {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} selected
              </span>
              <button 
                onClick={handleBulkDelete}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
          
          {/* Booking table */}
          <BookingTable 
            bookings={filteredBookings}
            loading={loading}
            onEdit={handleEditBooking}
            onDelete={handleDeleteBooking}
            onViewDetails={handleViewBookingDetails}
            onUploadData={handleUploadData}
            onUpdateStatus={handleUpdateBookingStatus}
            selectedBookings={selectedBookings}
            onSelectBooking={handleSelectBooking}
            onSelectAll={handleSelectAll}
          />
          
          {/* Pagination - could be implemented if needed */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredBookings.length}</span> of <span className="font-medium">{filteredBookings.length}</span> results
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminBookings;
