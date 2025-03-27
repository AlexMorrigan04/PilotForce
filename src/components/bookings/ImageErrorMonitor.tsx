import React, { useState, useEffect } from 'react';

interface ImageErrorMonitorProps {
  onFixClicked: () => void;
}

/**
 * Component that monitors image loading errors in the page
 * and provides error information and troubleshooting options
 */
const ImageErrorMonitor: React.FC<ImageErrorMonitorProps> = ({ onFixClicked }) => {
  const [errorCount, setErrorCount] = useState(0);
  const [showMonitor, setShowMonitor] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ url: string, time: Date }[]>([]);
  const [corsIssueDetected, setCorsIssueDetected] = useState(false);

  // Monitor for image errors
  useEffect(() => {
    // Function to handle image load errors
    const handleImageError = (event: ErrorEvent) => {
      // Only handle image loading errors
      if (event.target instanceof HTMLImageElement) {
        const url = (event.target as HTMLImageElement).src;
        
        // Don't count data URLs or SVG placeholders
        if (url.startsWith('data:')) return;
        
        // Check for potential CORS issues
        if (url.includes('amazonaws.com')) {
          setCorsIssueDetected(true);
          // Record in localStorage to improve future loads
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('s3_cors_issues', 'true');
          }
        }
        
        setErrorCount(prev => prev + 1);
        setErrorDetails(prev => [...prev, { url, time: new Date() }]);
        
        // Automatically show the monitor when multiple errors occur
        if (errorCount >= 2) {
          setShowMonitor(true);
        }
      }
    };

    // Add global error event listener
    window.addEventListener('error', handleImageError, true);
    
    // Cleanup
    return () => {
      window.removeEventListener('error', handleImageError, true);
    };
  }, [errorCount]);
  
  // Reset function for troubleshooting
  const resetImageLoading = () => {
    onFixClicked(); // Call parent callback
    
    // Clear local storage flags
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('s3_cors_issues');
    }
    
    // Reset state
    setErrorCount(0);
    setErrorDetails([]);
    setShowMonitor(false);
    setCorsIssueDetected(false);
    
    // Force page reload to get fresh data
    window.location.reload();
  };
  
  // Don't render anything if no errors or monitor is hidden
  if (errorCount === 0 || !showMonitor) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-lg border border-red-200 overflow-hidden">
      <div className="bg-red-100 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-sm font-medium text-red-800">Image Loading Issues</h3>
        </div>
        <button 
          onClick={() => setShowMonitor(false)}
          className="text-red-700 hover:text-red-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-700 mb-3">
          Detected {errorCount} image{errorCount !== 1 ? 's' : ''} that failed to load.
          {corsIssueDetected && ' CORS issue detected with S3 image requests.'}
        </p>
        
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Possible causes:</h4>
          <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
            <li>Images no longer exist in storage bucket</li>
            {corsIssueDetected && <li>CORS (Cross-Origin) policy restrictions</li>}
            <li>Expired pre-signed URLs</li>
            <li>Network connectivity issues</li>
          </ul>
        </div>
        
        <button
          onClick={resetImageLoading}
          className="w-full bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded text-sm"
        >
          Fix and Reload Images
        </button>
      </div>
    </div>
  );
};

export default ImageErrorMonitor;
