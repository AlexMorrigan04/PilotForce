import React from "react";
import { Inspection } from "../types/types";

export const InspectionCard: React.FC<Inspection> = ({
  imageUrl,
  address,
  date,
  imagesCount,
  status,
}) => {
  // Map status to color and text
  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format status text to be more readable
  const formatStatus = (status: string) => {
    switch (status) {
      case "in-progress":
        return "In Progress";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="flex flex-col bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="h-36 relative">
        <img
          src={imageUrl}
          alt={address}
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-medium ${getStatusClass(
            status
          )}`}
        >
          {formatStatus(status)}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-1 truncate">{address}</h3>
        <div className="flex items-center text-sm text-gray-500">
          <svg
            className="w-4 h-4 mr-1 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>{date}</span>
        </div>
        {imagesCount && (
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4 mr-1 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{imagesCount} images</span>
          </div>
        )}
      </div>
    </div>
  );
};
