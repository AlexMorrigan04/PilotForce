import React, { useState, useEffect } from 'react';
import * as adminService from '../../services/adminService';
import { FiEye, FiUpload, FiCalendar, FiCheck } from 'react-icons/fi';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

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
  resources?: Array<any>;
}

interface AdminBookingsListProps {
  onViewResources?: (bookingId: string) => void;
  onUploadResource?: (bookingId: string) => void;
}

const AdminBookingsList: React.FC<AdminBookingsListProps> = ({
  onViewResources,
  onUploadResource
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllBookings();
      if (response && response.bookings) {
        setBookings(response.bookings);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Function to update booking status
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingBookingId(bookingId);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/admin/bookings/${bookingId}/status`,
        {
          status: newStatus
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          }
        }
      );

      // Check if response contains a success property or success message
      if (response.data.success || 
          (response.data.message && response.data.message.includes('success'))) {
        // Update the status in the local state
        setBookings(bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        ));
      } else {
        setError(`Failed to update booking: ${response.data.message}`);
      }
    } catch (err: any) {
      // Check if error response contains a success message
      if (err.response?.data?.message?.includes('success')) {
        // This is actually a success case
        setBookings(bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus } 
            : booking
        ));
      } else {
        setError(`Error updating booking status: ${err.message}`);
      }
    } finally {
      setUpdatingBookingId(null);
    }
  };

  if (loading) {
    return <div>Loading bookings...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button 
          className="text-blue-600 hover:text-blue-800"
          onClick={() => fetchBookings()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Bookings Management</h2>
      
      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">User</th>
              <th className="py-2 px-4 border-b">Company</th>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Type</th>
              <th className="py-2 px-4 border-b">Status</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(booking => (
              <tr key={booking.id}>
                <td className="py-2 px-4 border-b">{booking.username}</td>
                <td className="py-2 px-4 border-b">{booking.companyName}</td>
                <td className="py-2 px-4 border-b">{new Date(booking.date).toLocaleDateString()}</td>
                <td className="py-2 px-4 border-b">{booking.type}</td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                    ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      booking.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }
                  `}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </td>
                <td className="py-2 px-4 border-b">
                  <div className="flex space-x-2">
                    {onViewResources && (
                      <button
                        onClick={() => onViewResources(booking.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Resources"
                      >
                        <FiEye className="h-5 w-5" />
                      </button>
                    )}
                    {onUploadResource && (
                      <button
                        onClick={() => onUploadResource(booking.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Upload Resources"
                      >
                        <FiUpload className="h-5 w-5" />
                      </button>
                    )}
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'scheduled')}
                        disabled={updatingBookingId === booking.id}
                        className={`text-blue-600 hover:text-blue-800 ${updatingBookingId === booking.id ? 'opacity-50' : ''}`}
                        title="Mark as Scheduled"
                      >
                        {updatingBookingId === booking.id ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <FiCalendar className="h-5 w-5" />
                        )}
                      </button>
                    )}
                    {booking.status === 'scheduled' && !(booking.resources && booking.resources.length) && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'completed')}
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
                          <FiCheck className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminBookingsList;
