import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiEye, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Booking } from '../../types/booking';

interface AdminBookingsCalendarProps {
  showActions: boolean;
  onDelete: (bookingId: string) => Promise<void>;
  bookings: Booking[];
}

const AdminBookingsCalendar: React.FC<AdminBookingsCalendarProps> = ({
  showActions,
  onDelete,
  bookings
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-gray-200 bg-gray-50"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayBookings = getBookingsForDate(date);

      days.push(
        <div key={day} className="h-32 border border-gray-200 p-2 overflow-auto">
          <div className="font-semibold mb-2">{day}</div>
          {dayBookings.map(booking => (
            <div
              key={booking.id}
              className="text-xs mb-1 p-1 rounded bg-blue-50 flex justify-between items-center"
            >
              <span className="truncate">{booking.title || `Booking #${booking.id.slice(0, 8)}`}</span>
              {showActions && (
                <div className="flex space-x-1">
                  <Link
                    to={`/admin/bookings/details/${booking.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FiEye size={12} />
                  </Link>
                  <button
                    onClick={() => onDelete(booking.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <FiChevronLeft />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}
        {renderCalendar()}
      </div>
    </div>
  );
};

export default AdminBookingsCalendar; 