import React from 'react';

interface StatCardProps {
  count: string;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

export const StatCard: React.FC<StatCardProps> = ({ count, label, icon, bgColor, textColor }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-200">
      <div className="flex items-center">
        <div className={`flex items-center justify-center h-12 w-12 rounded-md ${bgColor} ${textColor}`}>
          {typeof icon === 'string' ? (
            <img src={icon} alt={label} className="h-6 w-6" />
          ) : (
            icon
          )}
        </div>
        <div className="ml-5">
          <div className="text-2xl font-bold text-gray-800">{count}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
};
