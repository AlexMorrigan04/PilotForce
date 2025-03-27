import React, { useState, useEffect, useRef } from 'react';

interface ImageProps {
  url: string;
  key?: string;
  name?: string;
  type?: string;
  uploadDate?: string;
  size?: number;
}

interface BookingImageGalleryProps {
  images: ImageProps[];
  isLoading: boolean;
}

export const BookingImageGallery: React.FC<BookingImageGalleryProps> = ({ images, isLoading }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [enlargedView, setEnlargedView] = useState<boolean>(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Only include images (filter out GeoTIFF)
  const filteredImages = images.filter(image => image.type !== 'GeoTIFF');

  // Format date to display nicely
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Format file size
  const formatSize = (size?: number): string => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Navigate to next image
  const nextImage = () => {
    setSelectedImageIndex((prev) => 
      prev === filteredImages.length - 1 ? 0 : prev + 1
    );
  };

  // Navigate to previous image
  const prevImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? filteredImages.length - 1 : prev - 1
    );
  };

  // Toggle enlarged view
  const toggleEnlargedView = (e: React.MouseEvent) => {
    // Prevent this from triggering when clicking navigation arrows
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setEnlargedView(!enlargedView);
  };

  // Close enlarged view when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enlargedView) {
        setEnlargedView(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enlargedView]);

  // Scroll thumbnail into view when selected image changes
  useEffect(() => {
    if (thumbnailsRef.current) {
      const selectedThumb = thumbnailsRef.current.querySelector(`[data-index="${selectedImageIndex}"]`);
      if (selectedThumb) {
        selectedThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedImageIndex]);

  // Preload images to check if they're accessible
  useEffect(() => {
    if (filteredImages.length > 0 && !isLoading) {
      const imageLoadStatus: {[key: string]: boolean} = {};
      
      filteredImages.forEach(image => {
        const img = new Image();
        img.onload = () => {
          imageLoadStatus[image.url] = true;
          setLoadedImages(prev => ({...prev, [image.url]: true}));
        };
        img.onerror = () => {
          imageLoadStatus[image.url] = false;
          setLoadedImages(prev => ({...prev, [image.url]: false}));
          console.error(`Failed to load image: ${image.url}`);
        };
        img.src = image.url;
      });
    }
  }, [filteredImages, isLoading]);

  const handleImageError = (url: string) => {
    console.error(`Failed to load image: ${url}`);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading images...</p>
      </div>
    );
  }

  if (filteredImages.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-500">No images available for this booking.</p>
        <p className="text-xs text-gray-400 mt-1">Images will appear here once they are uploaded.</p>
      </div>
    );
  }

  // Enlarged view as a modal
  if (enlargedView) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={toggleEnlargedView}>
        <div className="relative w-full max-w-5xl max-h-full">
          {/* Close button */}
          <button 
            className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition"
            onClick={() => setEnlargedView(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="relative">
            <img
              src={filteredImages[selectedImageIndex]?.url}
              alt={filteredImages[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
              className="max-h-[85vh] max-w-full mx-auto object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Navigation Arrows - Bigger for enlarged view */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 m-2 rounded-full transition"
              aria-label="Previous image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 m-2 rounded-full transition"
              aria-label="Next image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Caption for enlarged view */}
            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-4 text-center">
              <p className="text-white text-base md:text-lg font-medium">
                {filteredImages[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
              </p>
              <p className="text-gray-300 text-sm mt-1">
                {selectedImageIndex + 1} of {filteredImages.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-gallery">
      {/* Main Carousel - Increased height */}
      <div className="relative mb-4 rounded-lg overflow-hidden bg-black h-[500px]" ref={carouselRef}>
        <div 
          className="h-full flex items-center justify-center cursor-pointer"
          onClick={toggleEnlargedView}
        >
          <img
            src={filteredImages[selectedImageIndex]?.url}
            alt={filteredImages[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
            className="max-h-full max-w-full object-contain"
            onError={() => handleImageError(filteredImages[selectedImageIndex]?.url)}
          />
          
          {/* Click to enlarge indicator */}
          <div className="absolute top-2 right-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Click to enlarge
          </div>
        </div>
        
        {/* Navigation Arrows - Improved styling and positioning */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevImage();
          }}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition shadow-lg"
          aria-label="Previous image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            nextImage();
          }}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition shadow-lg"
          aria-label="Next image"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Caption */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white text-sm md:text-base font-medium">
            {filteredImages[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
          </p>
          <p className="text-gray-300 text-xs mt-1">
            {selectedImageIndex + 1} of {filteredImages.length}
          </p>
        </div>
      </div>
      
      {/* Thumbnails - Improved styling */}
      <div 
        className="flex space-x-2 overflow-x-auto py-3 px-1 mt-2 mb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 bg-gray-100 rounded-lg"
        ref={thumbnailsRef}
      >
        {filteredImages.map((image, index) => (
          <div 
            key={index}
            data-index={index}
            onClick={() => setSelectedImageIndex(index)}
            className={`flex-shrink-0 cursor-pointer rounded-md overflow-hidden border-2 shadow-sm transition-all transform ${
              selectedImageIndex === index 
                ? 'border-blue-500 scale-105 shadow-md' 
                : 'border-transparent hover:border-blue-300'
            }`}
            style={{ width: '100px', height: '75px' }}
          >
            <img
              src={image.url}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="75" viewBox="0 0 100 75"><rect width="100" height="75" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="%236b7280">Error</text></svg>';
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Image Details */}
      <div className="bg-gray-50 rounded-lg p-4 mt-2 border border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">File Type</p>
            <p className="font-medium">{filteredImages[selectedImageIndex]?.type || 'Image'}</p>
          </div>
          <div>
            <p className="text-gray-500">File Size</p>
            <p className="font-medium">{formatSize(filteredImages[selectedImageIndex]?.size)}</p>
          </div>
          {filteredImages[selectedImageIndex]?.uploadDate && (
            <div className="col-span-2">
              <p className="text-gray-500">Upload Date</p>
              <p className="font-medium">{formatDate(filteredImages[selectedImageIndex]?.uploadDate)}</p>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <a
            href={filteredImages[selectedImageIndex]?.url}
            download={filteredImages[selectedImageIndex]?.name}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
          <a
            href={filteredImages[selectedImageIndex]?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded text-sm font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Original
          </a>
          
          <button
            onClick={toggleEnlargedView}
            className="ml-auto bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded text-sm font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Enlarge
          </button>
        </div>
      </div>
    </div>
  );
};
