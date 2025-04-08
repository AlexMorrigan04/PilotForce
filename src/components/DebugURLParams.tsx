import React from 'react';
import { useParams, useLocation } from 'react-router-dom';

interface DebugURLParamsProps {
  showInProduction?: boolean;
}

/**
 * A debug component that displays URL parameters and location information
 * Only shown in development mode unless showInProduction is true
 */
const DebugURLParams: React.FC<DebugURLParamsProps> = ({ showInProduction = false }) => {
  const params = useParams();
  const location = useLocation();
  
  // Only show in development or if explicitly enabled
  if (process.env.NODE_ENV !== 'development' && !showInProduction) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 max-w-md p-4 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-80 hover:opacity-100 transition-opacity z-50 overflow-auto" style={{ maxHeight: '50vh' }}>
      <h3 className="text-xs font-bold mb-2 text-yellow-400">URL Debug Info</h3>
      <div className="mb-2">
        <span className="text-green-400">Path:</span> {location.pathname}
      </div>
      <div className="mb-2">
        <span className="text-green-400">URL Params:</span>
        <pre className="mt-1 text-blue-300 overflow-x-auto">
          {JSON.stringify(params, null, 2)}
        </pre>
      </div>
      <div>
        <span className="text-green-400">Query Params:</span>
        <pre className="mt-1 text-blue-300 overflow-x-auto">
          {JSON.stringify(Object.fromEntries(new URLSearchParams(location.search)), null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DebugURLParams;
