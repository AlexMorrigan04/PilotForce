import React from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiTrash2, FiCheck, FiClock, FiUpload } from 'react-icons/fi';
import { Booking } from '../../types/booking';

interface AdminBookingsGridProps {
  showActions: boolean;
  sortBy: 'priority' | 'date';
  onDelete: (bookingId: string) => Promise<void>;
  bookings: Booking[];
}

const AdminBookingsGrid: React.FC<AdminBookingsGridProps> = ({
  showActions,
  sortBy,
  onDelete,
  bookings
}) => {
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      // Reload the page to refresh the data
      window.location.reload();
    } catch (error) {
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {bookings.map(booking => (
        <div
          key={booking.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          <div className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {booking.title || `Booking #${booking.id.slice(0, 8)}`}
              </h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(booking.status)}`}>
                {booking.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <FiClock className="mr-2" />
                <span>{formatDate(booking.date)}</span>
                {booking.time && <span className="ml-2">{booking.time}</span>}
              </div>
              <div className="flex items-center">
                <FiUpload className="mr-2" />
                <span className="truncate">{booking.location}</span>
              </div>
              {sortBy === 'priority' && booking.priority !== undefined && (
                <div className="flex items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(booking.priority)}`}>
                    {getPriorityLabel(booking.priority)} Priority
                  </span>
                </div>
              )}
            </div>

            {showActions && (
              <div className="mt-4 flex justify-end space-x-2">
                <Link
                  to={`/admin/bookings/details/${booking.id}`}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiEye className="mr-1" />
                  View
                </Link>
                <button
                  onClick={() => onDelete(booking.id)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FiTrash2 className="mr-1" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminBookingsGrid; 