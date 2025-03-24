import React, { useState } from "react";

interface PropertyDetailsStepProps {
  bookingData: {
    propertyType: string;
    address: string;
    propertySize: string;
  };
  updateBookingData: (data: Partial<PropertyDetailsStepProps["bookingData"]>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const PropertyDetailsStep: React.FC<PropertyDetailsStepProps> = ({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
}) => {
  const [errors, setErrors] = useState({
    propertyType: false,
    address: false,
    propertySize: false,
  });

  const propertyTypes = [
    { id: "residential", label: "Residential" },
    { id: "commercial", label: "Commercial" },
    { id: "land", label: "Land/Vacant Lot" },
    { id: "industrial", label: "Industrial" },
    { id: "agricultural", label: "Agricultural" },
  ];

  const propertySizes = [
    { id: "small", label: "Small (< 1 acre)" },
    { id: "medium", label: "Medium (1-5 acres)" },
    { id: "large", label: "Large (5-20 acres)" },
    { id: "xlarge", label: "Extra Large (> 20 acres)" },
  ];

  const handleContinue = () => {
    const newErrors = {
      propertyType: !bookingData.propertyType,
      address: !bookingData.address.trim(),
      propertySize: !bookingData.propertySize,
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some((error) => error)) {
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-medium">Property Details</div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {propertyTypes.map((type) => (
              <div
                key={type.id}
                className={`
                  px-4 py-3 text-center border rounded-md cursor-pointer transition-all
                  ${
                    bookingData.propertyType === type.id
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-gray-300 hover:border-blue-300"
                  }
                `}
                onClick={() => updateBookingData({ propertyType: type.id })}
              >
                <span className="text-sm">{type.label}</span>
              </div>
            ))}
          </div>
          {errors.propertyType && (
            <p className="mt-1 text-sm text-red-600">Please select a property type</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Address
          </label>
          <textarea
            value={bookingData.address}
            onChange={(e) => updateBookingData({ address: e.target.value })}
            className={`
              w-full px-3 py-2 border rounded-md resize-none h-24
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.address ? "border-red-500" : "border-gray-300"}
            `}
            placeholder="Enter the full property address"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">Please enter the property address</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Size
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {propertySizes.map((size) => (
              <div
                key={size.id}
                className={`
                  px-4 py-3 text-center border rounded-md cursor-pointer transition-all
                  ${
                    bookingData.propertySize === size.id
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-gray-300 hover:border-blue-300"
                  }
                `}
                onClick={() => updateBookingData({ propertySize: size.id })}
              >
                <span className="text-sm">{size.label}</span>
              </div>
            ))}
          </div>
          {errors.propertySize && (
            <p className="mt-1 text-sm text-red-600">Please select a property size</p>
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
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 transition-colors focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
