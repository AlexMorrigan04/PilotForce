import React, { useState, useEffect } from 'react';
import { getImageUrl, getPlaceholderImage, markImageAsFailed } from '../../utils/imageUtils';

interface BookingImageProps {
  image: {
    url?: string;
    key?: string;
    name?: string;
    type?: string;
  };
  onClick?: () => void;
  className?: string;
  alt?: string;
}

const BookingImage: React.FC<BookingImageProps> = ({ 
  image, 
  onClick, 
  className = '', 
  alt 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;
  
  // Setup image URL with fallbacks
  useEffect(() => {
    try {
      // Skip if already set or no image data
      if (imageUrl || !image) return;
      
      // Use our utility function to get the proper URL
      const url = getImageUrl(image.key || '', image.url || '');
      setImageUrl(url);
      
      // If we detect localStorage, check for CORS issues
      if (typeof window !== 'undefined' && window.localStorage) {
        // Check if we have CORS issues recorded for this domain
        const corsIssues = window.localStorage.getItem('s3_cors_issues') === 'true';
        if (corsIssues && url.includes('amazonaws.com')) {
          // Try to use a proxy path instead
          if (process.env.NODE_ENV === 'production') {
            const proxyUrl = `/api/s3proxy?key=${encodeURIComponent(image.key || '')}`;
            setImageUrl(proxyUrl);
          }
        }
      }
    } catch (err) {
      setError('Unable to load image');
      setIsLoading(false);
    }
  }, [image, imageUrl]);
  
  // Handle retry logic
  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(retryCount + 1);
      setError(null);
      setIsLoading(true);
      
      // Try different URL strategy on retry
      if (image.key && image.url) {
        const newUrl = retryCount === 0 
          ? image.url // First retry with the provided URL
          : process.env.NODE_ENV === 'production'
            ? `/api/s3proxy?key=${encodeURIComponent(image.key)}` // Second retry with proxy
            : `https://drone-images-bucket.s3.${process.env.REACT_APP_AWS_REGION || 'eu-west-2'}.amazonaws.com/${image.key}`; // Direct S3
        
        setImageUrl(newUrl);
      }
    } else {
      // Mark this image as permanently failed
      if (image.key) {
        markImageAsFailed(image.key);
      }
      
      // Record potential CORS issues
      if (typeof window !== 'undefined' && window.localStorage && imageUrl.includes('amazonaws.com')) {
        window.localStorage.setItem('s3_cors_issues', 'true');
      }
    }
  };
  
  // Handle image load success
  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };
  
  // Handle image load error
  const handleImageError = () => {
    setIsLoading(false);
    
    // Auto-retry once
    if (retryCount < MAX_RETRIES) {
      handleRetry();
    } else {
      setError("Failed to load image after multiple attempts");
    }
  };
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <svg className="animate-spin h-8 w-8 text-gray-400" xmlns="" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 p-4 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          {retryCount < MAX_RETRIES && (
            <button 
              onClick={handleRetry}
              className="mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200"
            >
              Retry
            </button>
          )}
        </div>
      )}
      
      <img 
        src={error ? getPlaceholderImage('error') : (imageUrl || getPlaceholderImage('loading'))}
        alt={alt || image.name || "Drone image"}
        className={`w-full h-full object-cover transition-all duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        onClick={onClick}
      />
    </div>
  );
};

export default BookingImage;
