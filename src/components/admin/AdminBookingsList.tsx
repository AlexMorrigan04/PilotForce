import React, { useState, useEffect } from 'react';
import * as adminService from '../../services/adminService';
import { FiEye, FiUpload } from 'react-icons/fi';

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

  useEffect(() => {
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

    fetchBookings();
  }, []);

  if (loading) {
    return <div>Loading bookings...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
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
