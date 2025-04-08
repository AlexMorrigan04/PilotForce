import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  color = 'blue',
  className = ''
}) => {
  // Determine size classes
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };
  
  // Determine color classes
  const colorClasses = {
    blue: 'border-blue-500',
    gray: 'border-gray-500',
    white: 'border-white'
  };
  
  const spinnerSize = sizeClasses[size];
  const spinnerColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  
  return (
    <div className={`animate-spin rounded-full ${spinnerSize} border-t-transparent ${spinnerColor} ${className}`}>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;
