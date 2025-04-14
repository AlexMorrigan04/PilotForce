import React, { useState } from 'react';
import { FiEdit, FiTrash2, FiExternalLink, FiChevronUp, FiChevronDown, FiUpload, FiCheckCircle, FiXCircle, FiClock, FiEye } from 'react-icons/fi';
import BookingResourcesModal from './BookingResourcesModal';

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

interface BookingTableProps {
  bookings: Booking[];
  loading: boolean;
  onEdit: (bookingId: string) => void;
  onDelete: (bookingId: string) => void;
  onViewDetails: (bookingId: string) => void;
  onUploadData: (bookingId: string) => void;
  onUpdateStatus: (bookingId: string, status: string) => void;
  selectedBookings: string[];
  onSelectBooking: (bookingId: string) => void;
  onSelectAll: () => void;
}

type SortField = 'companyName' | 'username' | 'date' | 'status' | 'type' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const BookingTable: React.FC<BookingTableProps> = ({
  bookings,
  loading,
  onEdit,
  onDelete,
  onViewDetails,
  onUploadData,
  onUpdateStatus,
  selectedBookings,
  onSelectBooking,
  onSelectAll
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewingResourcesFor, setViewingResourcesFor] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    // Special handling for dates
    if (sortField === 'date' || sortField === 'createdAt') {
      const aDate = new Date(a[sortField]);
      const bDate = new Date(b[sortField]);
      if (aDate.getTime() === bDate.getTime()) return 0;
      const result = aDate < bDate ? -1 : 1;
      return sortDirection === 'asc' ? result : -result;
    }
    
    // Handle non-date fields
    const aValue = a[sortField];
    const bValue = b[sortField];
    if (aValue === bValue) return 0;
    const result = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? result : -result;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  };

  const renderSortableHeader = (field: SortField, label: string) => (
    <th 
      scope="col" 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
      onClick={() => handleSort(field)}
    >
      {label} {getSortIcon(field)}
    </th>
  );

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusActions = (booking: Booking) => {
    switch (booking.status.toLowerCase()) {
      case 'pending':
        return (
          <>
            <button
              onClick={() => onUpdateStatus(booking.id, 'confirmed')}
              className="text-blue-600 hover:text-blue-900 mr-3"
              title="Confirm Booking"
            >
              <FiCheckCircle />
            </button>
            <button
              onClick={() => onUpdateStatus(booking.id, 'cancelled')}
              className="text-red-600 hover:text-red-900 mr-3"
              title="Cancel Booking"
            >
              <FiXCircle />
            </button>
            <button
              onClick={() => setViewingResourcesFor(booking.id)}
              className="text-blue-600 hover:text-blue-900 mr-3"
              title="View Resources"
            >
              <FiEye />
            </button>
          </>
        );
      case 'confirmed':
        return (
          <>
            <button
              onClick={() => onUploadData(booking.id)}
              className="text-blue-600 hover:text-blue-900 mr-3"
              title="Upload Data"
            >
              <FiUpload />
            </button>
            <button
              onClick={() => setViewingResourcesFor(booking.id)}
              className="text-blue-600 hover:text-blue-900 mr-3"
              title="View Resources"
            >
              <FiEye />
            </button>
            <button
              onClick={() => onUpdateStatus(booking.id, 'completed')}
              className="text-green-600 hover:text-green-900 mr-3"
              title="Mark as Completed"
            >
              <FiCheckCircle />
            </button>
          </>
        );
      case 'completed':
        return (
          <>
            <button
              onClick={() => onUploadData(booking.id)}
              className="text-blue-600 hover:text-blue-900 mr-3"
              title="Upload Additional Data"
            >
              <FiUpload />
            </button>
            <button
              onClick={() => setViewingResourcesFor(booking.id)}
              className="text-blue-600 hover:text-blue-900 mr-3"
              title="View Resources"
            >
              <FiEye />
            </button>
          </>
        );
      default:
        return (
          <button
            onClick={() => setViewingResourcesFor(booking.id)}
            className="text-blue-600 hover:text-blue-900 mr-3"
            title="View Resources"
          >
            <FiEye />
          </button>
        );
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-2"
                    checked={selectedBookings.length === bookings.length && bookings.length > 0}
                    onChange={onSelectAll}
                  />
                  <span className="sr-only">Select All</span>
                </div>
              </th>
              {renderSortableHeader('companyName', 'Company')}
              {renderSortableHeader('username', 'User')}
              {renderSortableHeader('date', 'Date')}
              {renderSortableHeader('type', 'Type')}
              {renderSortableHeader('status', 'Status')}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex justify-center items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                    <span>Loading bookings...</span>
                  </div>
                </td>
              </tr>
            ) : sortedBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  No bookings found
                </td>
              </tr>
            ) : (
              sortedBookings.map(booking => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      checked={selectedBookings.includes(booking.id)}
                      onChange={() => onSelectBooking(booking.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.companyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{new Date(booking.date).toLocaleDateString()}</div>
                    <div className="text-xs">{booking.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {getStatusActions(booking)}
                    <button
                      onClick={() => onEdit(booking.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Edit Booking"
                    >
                      <FiEdit />
                    </button>
                    <button
                      onClick={() => onDelete(booking.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Delete Booking"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Resources Viewing Modal */}
      {viewingResourcesFor && (
        <BookingResourcesModal
          bookingId={viewingResourcesFor}
          isOpen={!!viewingResourcesFor}
          onClose={() => setViewingResourcesFor(null)}
        />
      )}
    </>
  );
};

export default BookingTable;
