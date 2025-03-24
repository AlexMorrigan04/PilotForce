import React from "react";
import { Stat } from "../types/types";

export const StatCard: React.FC<Stat> = ({ count, label, icon, bgColor, textColor }) => {
  return (
    <div className="flex flex-col justify-between p-6 bg-white rounded-lg shadow-sm border border-gray-100 transition-transform duration-300 hover:transform hover:scale-105">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-3xl font-bold text-gray-900">{count}</p>
          <p className="text-sm font-medium text-gray-500">{label}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <img
            loading="lazy"
            src={icon}
            alt={label}
            className={`w-6 h-6 ${textColor}`}
          />
        </div>
      </div>
      <div className="flex items-center text-xs">
        {/* <span className={`${textColor} font-semibold`}>View details</span> */}
        {/* <svg className={`ml-1 w-4 h-4 ${textColor}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg> */}
      </div>
    </div>
  );
};
