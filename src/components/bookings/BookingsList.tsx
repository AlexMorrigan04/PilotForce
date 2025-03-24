import React from 'react';
import { Booking } from '../../types/bookingTypes';
import BookingCard from './BookingCard'; // Ensure correct import

interface BookingsListProps {
  bookings: Booking[];
  onViewBooking: (booking: Booking) => void;
}

export const BookingsList: React.FC<BookingsListProps> = ({ bookings, onViewBooking }) => {
  if (bookings.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
        <p className="text-gray-500">No bookings match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onViewBooking={onViewBooking} // Ensure correct prop name
        />
      ))}
    </div>
  );
};
