import React from 'react';
import { Booking } from '../../types/bookingTypes';

interface BookingCardProps {
  booking: Booking;
  onViewBooking: (booking: Booking) => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onViewBooking }) => {
  // Safe function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not specified';
    
    try {
      // Handle different date formats
      let date;
      if (dateString.includes('T')) {
        // ISO format
        date = new Date(dateString);
      } else if (dateString.includes('-') || dateString.includes('/')) {
        // YYYY-MM-DD or MM/DD/YYYY format
        date = new Date(dateString);
      } else {
        return dateString; // Return as is if we can't parse
      }
      
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid date
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'Date not specified';
    }
  };

  // Get status class for color coding
  const getStatusClass = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'; // Default
    
    switch(status.toLowerCase()) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{booking.serviceType || 'Drone Service'}</h3>
            <p className="text-gray-600 mt-1">{booking.address || 'No address specified'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
            {booking.status || 'Pending'}
          </span>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(booking.flightDate)}
          </div>
          {booking.time && (
            <div className="flex items-center text-sm">
              <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {booking.time || 'Time not specified'}
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <button
            onClick={() => onViewBooking(booking)}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingCard;
