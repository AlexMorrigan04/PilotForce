import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiTrash2, FiCheck, FiClock, FiX, FiUpload, FiDownload } from 'react-icons/fi';
// Replace react-bootstrap with custom components until the dependency is installed
// import { Table, Button, Spinner, Alert } from 'react-bootstrap';
import * as adminService from '../../services/adminService';
import type { BookingsResponse } from '../../services/adminService';
import QuoteModal from './QuoteModal';
import { Booking } from '../../types/booking';

interface AdminBookingsListProps {
  limit?: number;
  showActions?: boolean;
  sortBy?: 'priority' | 'date';
  onDelete?: (bookingId: string) => void;
  bookings?: Booking[];
}

const AdminBookingsList: React.FC<AdminBookingsListProps> = ({
  limit,
  showActions = true,
  sortBy = 'priority',
  onDelete,
  bookings: propBookings
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedBookingForQuote, setSelectedBookingForQuote] = useState<string | null>(null);
  const navigate = useNavigate();

  const sortBookings = (bookings: Booking[]) => {
    return [...bookings].sort((a, b) => {
      // First sort by status - pending and scheduled bookings come first
      const statusOrder: { [key: string]: number } = {
        'pending': 0,
        'scheduled': 1,
        'completed': 2,
        'cancelled': 3
      };
      const statusA = statusOrder[a.status.toLowerCase()] ?? 4;
      const statusB = statusOrder[b.status.toLowerCase()] ?? 4;
      if (statusA !== statusB) return statusA - statusB;

      // Then sort by priority if that's the selected sort method
      if (sortBy === 'priority') {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        if (priorityA !== priorityB) return priorityB - priorityA;
      }

      // Finally sort by date and time
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();

      // If dates are equal, sort by time
      const timeA = a.time || '23:59';
      const timeB = b.time || '23:59';
      return timeA.localeCompare(timeB);
    });
  };

  useEffect(() => {
    if (propBookings) {
      setBookings(sortBookings(propBookings));
      setLoading(false);
    } else {
      loadBookings();
    }
  }, [propBookings, sortBy]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllBookings();
      if (response && response.bookings) {
        const mappedBookings = response.bookings.map(apiBooking => {
          return {
            id: apiBooking.BookingId || '',
            BookingId: apiBooking.BookingId || '',
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
            location: apiBooking.location || '',
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
            priority: apiBooking.priority || 0
          } as Booking;
        });
        
        setBookings(sortBookings(mappedBookings));
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!onDelete) return;
    if (window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      onDelete(bookingId);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      setUpdatingStatus(bookingId);
      await adminService.updateBookingStatus(bookingId, newStatus);
      // Refresh the bookings list
      await loadBookings();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update booking status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleQuoteSubmit = async (quote: { amount: number; currency: string; notes: string }) => {
    if (!selectedBookingForQuote) return;
    
    try {
      setUpdatingStatus(selectedBookingForQuote);
      await adminService.updateBookingQuote(selectedBookingForQuote, quote);
      await handleStatusUpdate(selectedBookingForQuote, 'scheduled');
      setQuoteModalOpen(false);
      setSelectedBookingForQuote(null);
      await loadBookings();
    } catch (err: any) {
      setError(err.message || 'Failed to update quote');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadgeClass = (status: string = '') => {
    const statusMap: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'scheduled': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'in_progress': 'bg-purple-100 text-purple-800'
    };
    return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeClass = (priority: number) => {
    const priorityMap: { [key: number]: string } = {
      3: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800',
      1: 'bg-blue-100 text-blue-800',
      0: 'bg-gray-100 text-gray-800'
    };
    return priorityMap[priority] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityLabel = (priority: number) => {
    const priorityMap: { [key: number]: string } = {
      3: 'High',
      2: 'Medium',
      1: 'Low',
      0: 'None'
    };
    return priorityMap[priority] || 'None';
  };

  const formatDateTime = (date: string, time?: string) => {
    try {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      return time ? `${formattedDate} at ${time}` : formattedDate;
    } catch (e) {
      return date;
    }
  };

  const getRelativeTimeClass = (date: string, time?: string) => {
    const now = new Date();
    const bookingDate = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':');
      bookingDate.setHours(parseInt(hours), parseInt(minutes));
    }
    
    const diffDays = Math.floor((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600 font-bold';
    if (diffDays === 0) return 'text-orange-600 font-bold';
    if (diffDays <= 3) return 'text-yellow-600';
    if (diffDays <= 7) return 'text-blue-600';
    return 'text-gray-600';
  };

  // Limit the number of bookings to display if specified
  const displayedBookings = limit ? bookings.slice(0, limit) : bookings;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded relative">
        No bookings found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Booking Details
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer & Asset
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {sortBy === 'priority' && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
            )}
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {displayedBookings.map((booking, index) => {
            const currentStatus = (booking.status || '').toLowerCase();
            const timeClass = getRelativeTimeClass(booking.date, booking.time);
            
            return (
              <tr key={booking.id} 
                  className={`hover:bg-gray-50 ${selectedBooking === booking.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedBooking(booking.id)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-lg font-bold ${timeClass}`}>
                    #{index + 1}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{booking.title || `Booking #${booking.id.slice(0,8)}`}</div>
                  <div className="text-sm text-gray-500">{booking.location}</div>
                  <div className={`text-sm ${timeClass}`}>
                    {formatDateTime(booking.date, booking.time)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{booking.username}</div>
                  <div className="text-sm text-gray-500">{booking.companyName}</div>
                  {booking.assetName && (
                    <div className="text-sm text-gray-500">
                      Asset: {booking.assetName}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(currentStatus)}`}>
                    {booking.status}
                  </span>
                </td>
                {sortBy === 'priority' && (
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeClass(booking.priority || 0)}`}>
                      {getPriorityLabel(booking.priority || 0)}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 space-x-2">
                  <div className="flex space-x-2">
                    <Link
                      to={`/admin/bookings/details/${booking.id}`}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-sm flex items-center"
                      title="View Details"
                    >
                      <FiEye className="mr-1" /> View
                    </Link>
                    
                    {currentStatus === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBookingForQuote(booking.id);
                          setQuoteModalOpen(true);
                        }}
                        disabled={updatingStatus === booking.id}
                        className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-md text-sm flex items-center"
                        title="Add Quote & Schedule"
                      >
                        {updatingStatus === booking.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600 mr-2" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <FiClock className="mr-1" /> Schedule
                          </>
                        )}
                      </button>
                    )}
                    
                    {currentStatus === 'scheduled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(booking.id, 'completed');
                        }}
                        disabled={updatingStatus === booking.id}
                        className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md text-sm flex items-center"
                        title="Mark as Complete"
                      >
                        {updatingStatus === booking.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-600 mr-2" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <FiCheck className="mr-1" /> Complete
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/bookings/upload/${booking.id}`);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm flex items-center"
                      title="Upload Resources"
                    >
                      <FiUpload className="mr-1" /> Upload
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(booking.id);
                      }}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm flex items-center"
                      title="Delete Booking"
                    >
                      <FiTrash2 className="mr-1" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => {
          setQuoteModalOpen(false);
          setSelectedBookingForQuote(null);
        }}
        onSubmit={handleQuoteSubmit}
        bookingId={selectedBookingForQuote || ''}
      />
    </div>
  );
};

export default AdminBookingsList;
