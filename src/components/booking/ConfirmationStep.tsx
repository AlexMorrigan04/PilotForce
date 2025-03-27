import React from "react";
import { useNavigate } from "react-router-dom";

interface ConfirmationStepProps {
  bookingData: {
    serviceType: string;
    propertyType: string;
    address: string;
    propertySize: string;
    dateTime: Date | null;
    additionalInfo: string;
    contactPerson: string;
    contactPhone: string;
    contactEmail: string;
  };
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  bookingData,
}) => {
  const navigate = useNavigate();

  const formatServiceType = (serviceType: string): string => {
    const map: { [key: string]: string } = {
      "property-inspection": "Property Inspection",
      "roof-inspection": "Roof Inspection",
      "land-survey": "Land Survey",
      "construction-progress": "Construction Progress",
      "solar-panel-inspection": "Solar Panel Inspection",
    };
    return map[serviceType] || serviceType;
  };

  const formatPropertyType = (propertyType: string): string => {
    const map: { [key: string]: string } = {
      "residential": "Residential",
      "commercial": "Commercial",
      "land": "Land/Vacant Lot",
      "industrial": "Industrial",
      "agricultural": "Agricultural",
    };
    return map[propertyType] || propertyType;
  };

  const formatPropertySize = (propertySize: string): string => {
    const map: { [key: string]: string } = {
      "small": "Small (< 1 acre)",
      "medium": "Medium (1-5 acres)",
      "large": "Large (5-20 acres)",
      "xlarge": "Extra Large (> 20 acres)",
    };
    return map[propertySize] || propertySize;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "Not selected";
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return "Not selected";
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mt-3 text-xl font-bold text-gray-900">Booking Confirmed!</h2>
        <p className="mt-1 text-gray-500">
          Your booking has been successfully submitted. We'll contact you shortly to confirm details.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
        
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Service Type:</div>
            <div className="font-medium">
              {formatServiceType(bookingData.serviceType)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Property Type:</div>
            <div className="font-medium">
              {formatPropertyType(bookingData.propertyType)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Property Size:</div>
            <div className="font-medium">
              {formatPropertySize(bookingData.propertySize)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Appointment Date:</div>
            <div className="font-medium">
              {formatDate(bookingData.dateTime)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Appointment Time:</div>
            <div className="font-medium">
              {formatTime(bookingData.dateTime)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Address:</div>
            <div className="font-medium">
              {bookingData.address}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Contact Person:</div>
            <div className="font-medium">
              {bookingData.contactPerson}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Phone Number:</div>
            <div className="font-medium">
              {bookingData.contactPhone}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2">
            <div className="text-gray-600">Email:</div>
            <div className="font-medium">
              {bookingData.contactEmail}
            </div>
          </div>
          
          {bookingData.additionalInfo && (
            <div className="grid grid-cols-1 gap-y-2">
              <div className="text-gray-600">Additional Information:</div>
              <div className="font-medium">
                {bookingData.additionalInfo}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        <button
          onClick={() => navigate('/my-bookings')}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md
            hover:bg-gray-50 transition-colors focus:outline-none
            focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          View My Flights
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 transition-colors focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
