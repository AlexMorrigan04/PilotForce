import React, { useState } from "react";

interface DateTimeStepProps {
  bookingData: {
    dateTime: Date | null;
  };
  updateBookingData: (data: { dateTime: Date | null }) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    bookingData.dateTime 
      ? bookingData.dateTime.toISOString().split('T')[0]
      : ""
  );
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(
    bookingData.dateTime 
      ? `${bookingData.dateTime.getHours().toString().padStart(2, '0')}:${bookingData.dateTime.getMinutes().toString().padStart(2, '0')}`
      : ""
  );
  
  const [error, setError] = useState<string>("");

  // Get dates for the next 14 days
  const getNextTwoWeeks = () => {
    const dates = [];
    const today = new Date();
    
    // Start from tomorrow
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", 
    "12:00", "13:00", "14:00", "15:00", "16:00"
  ];

  const handleContinue = () => {
    if (!selectedDate || !selectedTimeSlot) {
      setError("Please select both a date and time to continue");
      return;
    }

    const [hours, minutes] = selectedTimeSlot.split(':');
    const dateTime = new Date(selectedDate);
    dateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    
    updateBookingData({ dateTime });
    onNext();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setError("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTimeSlot(time);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-medium">Select Date & Time</div>
      
      <div>
        <h3 className="text-base font-medium text-gray-700">Select Date</h3>
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {getNextTwoWeeks().map((date, index) => {
            const dateString = date.toISOString().split('T')[0];
            const isSelected = dateString === selectedDate;
            
            return (
              <button
                key={index}
                className={`
                  p-3 border rounded-lg text-center transition-all
                  ${isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-800" 
                    : "border-gray-200 hover:border-blue-400"
                  }
                `}
                onClick={() => handleDateSelect(dateString)}
              >
                <div className="text-xs font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="font-medium mt-1">{date.getDate()}</div>
                <div className="text-xs">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
              </button>
            );
          })}
        </div>
      </div>
      
      <div>
        <h3 className="text-base font-medium text-gray-700">Select Time</h3>
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {timeSlots.map((time) => {
            const isSelected = time === selectedTimeSlot;
            
            return (
              <button
                key={time}
                className={`
                  py-3 border rounded-lg text-center transition-all
                  ${isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-800" 
                    : "border-gray-200 hover:border-blue-400"
                  }
                `}
                onClick={() => handleTimeSelect(time)}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>
      
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      
      {selectedDate && selectedTimeSlot && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h4 className="font-medium text-blue-800">Selected Appointment</h4>
          <p className="text-gray-700">
            {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} at {selectedTimeSlot}
          </p>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md
            hover:bg-gray-50 transition-colors focus:outline-none
            focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className={`
            px-6 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 transition-colors focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${(!selectedDate || !selectedTimeSlot) && "opacity-50 cursor-not-allowed"}
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
