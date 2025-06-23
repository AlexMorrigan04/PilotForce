import React from 'react';
import { Link } from 'react-router-dom';

export const EmptyBookingState: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
      <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-blue-50 mb-5">
        <svg className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-xl font-medium text-gray-900 mb-2">No bookings yet</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        You haven't made any drone inspection bookings yet. Start by creating your first booking.
      </p>
      <Link
        to="/make-booking"
        className="inline-flex items-center px-5 py-2 bg-blue-600 border border-transparent rounded-md font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Booking
      </Link>
    </div>
  );
};