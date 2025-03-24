import React, { useState, useEffect } from "react";

interface AdditionalInfoStepProps {
  bookingData: {
    additionalInfo: string;
    contactPerson: string;
    contactPhone: string;
    contactEmail: string;
  };
  updateBookingData: (data: Partial<AdditionalInfoStepProps["bookingData"]>) => void;
  onNext: () => void;
  onPrev: () => void;
  userInfo: any;
}

export const AdditionalInfoStep: React.FC<AdditionalInfoStepProps> = ({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
  userInfo,
}) => {
  const [errors, setErrors] = useState({
    contactPerson: false,
    contactPhone: false,
    contactEmail: false,
  });

  // Pre-fill data if we have user info
  useEffect(() => {
    if (userInfo && !bookingData.contactPerson && !bookingData.contactEmail) {
      updateBookingData({
        contactPerson: userInfo.name || "",
        contactEmail: userInfo.email || "",
      });
    }
  }, [userInfo, bookingData.contactPerson, bookingData.contactEmail, updateBookingData]);

  const validateForm = () => {
    const newErrors = {
      contactPerson: !bookingData.contactPerson.trim(),
      contactPhone: !bookingData.contactPhone.trim(),
      contactEmail: !validateEmail(bookingData.contactEmail),
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-medium">Additional Information</div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Requirements or Notes (optional)
          </label>
          <textarea
            value={bookingData.additionalInfo}
            onChange={(e) => updateBookingData({ additionalInfo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none h-24
              focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter any special requirements or additional information that might be helpful"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={bookingData.contactPerson}
              onChange={(e) => updateBookingData({ contactPerson: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.contactPerson ? "border-red-500" : "border-gray-300"}`}
              placeholder="Full Name"
            />
            {errors.contactPerson && (
              <p className="mt-1 text-sm text-red-600">Please enter a contact name</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={bookingData.contactPhone}
              onChange={(e) => updateBookingData({ contactPhone: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.contactPhone ? "border-red-500" : "border-gray-300"}`}
              placeholder="Phone Number"
            />
            {errors.contactPhone && (
              <p className="mt-1 text-sm text-red-600">Please enter a contact phone number</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Email
          </label>
          <input
            type="email"
            value={bookingData.contactEmail}
            onChange={(e) => updateBookingData({ contactEmail: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.contactEmail ? "border-red-500" : "border-gray-300"}`}
            placeholder="Email Address"
          />
          {errors.contactEmail && (
            <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
          )}
        </div>
      </div>

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
          onClick={handleSubmit}
          className="px-6 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 transition-colors focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Review Booking
        </button>
      </div>
    </div>
  );
};