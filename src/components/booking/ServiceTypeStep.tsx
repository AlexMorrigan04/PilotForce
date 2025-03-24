import React from "react";

interface ServiceTypeStepProps {
  bookingData: {
    serviceType: string;
  };
  updateBookingData: (data: { serviceType: string }) => void;
  onNext: () => void;
}

export const ServiceTypeStep: React.FC<ServiceTypeStepProps> = ({
  bookingData,
  updateBookingData,
  onNext,
}) => {
  const serviceTypes = [
    {
      id: "property-inspection",
      title: "Property Inspection",
      description: "Aerial photography and video of a property for real estate",
      icon: "🏠",
    },
    {
      id: "roof-inspection",
      title: "Roof Inspection",
      description: "Detailed roof inspection for damage or maintenance",
      icon: "🔍",
    },
    {
      id: "land-survey",
      title: "Land Survey",
      description: "Aerial survey of land for development or planning",
      icon: "📏",
    },
    {
      id: "construction-progress",
      title: "Construction Progress",
      description: "Document construction progress from above",
      icon: "🏗️",
    },
    {
      id: "solar-panel-inspection",
      title: "Solar Panel Inspection",
      description: "Inspect solar panels for damage or efficiency",
      icon: "☀️",
    },
  ];

  const isSelected = (id: string) => bookingData.serviceType === id;

  const handleContinue = () => {
    if (bookingData.serviceType) {
      onNext();
    } else {
      alert("Please select a service type to continue.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-xl font-medium">What type of service do you need?</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {serviceTypes.map((service) => (
          <div
            key={service.id}
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all
              ${
                isSelected(service.id)
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-400"
              }
            `}
            onClick={() => updateBookingData({ serviceType: service.id })}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{service.icon}</div>
              <div>
                <h3 className="font-medium">{service.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {service.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={handleContinue}
          className={`
            px-6 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 transition-colors focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${!bookingData.serviceType && "opacity-50 cursor-not-allowed"}
          `}
          disabled={!bookingData.serviceType}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
