import React, { useState, useEffect } from 'react';
import { BookingImage } from '../../types/bookingTypes';

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
  const [selectedImage, setSelectedImage] = useState<ImageProps | null>(null);
  const [loadedImages, setLoadedImages] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);

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

  // Determine if the file is an image
  const isImageFile = (filename: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(fileExtension || '');
  };

  // Preload images to check if they're accessible
  useEffect(() => {
    if (images.length > 0 && !isLoading) {
      const imageLoadStatus: {[key: string]: boolean} = {};
      
      images.forEach(image => {
        if (image.type !== 'GeoTIFF') { // Ignore GeoTIFF files
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
        }
      });
    }
  }, [images, isLoading]);

  // Create a fallback image URL with simple message
  const getFallbackImageUrl = () => {
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><rect width='300' height='300' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='14' fill='%236b7280'>Image Not Available</text></svg>`;
  };

  const formatSize = (size?: number): string => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleImageError = (url: string) => {
    console.error(`Failed to load image: ${url}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading images...</p>
      </div>
    );
  }

  if (images.length === 0) {
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

  return (
    <div>
      {selectedImage ? (
        <div className="image-detail">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">{selectedImage.name}</h3>
            <button
              onClick={() => setSelectedImage(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="rounded-lg overflow-hidden bg-gray-100 mb-4">
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="w-full h-auto max-h-[500px] object-contain"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-medium">{selectedImage.type || 'Image'}</p>
            </div>
            <div>
              <p className="text-gray-500">Size</p>
              <p className="font-medium">{formatSize(selectedImage.size)}</p>
            </div>
            {selectedImage.uploadDate && (
              <div className="col-span-2">
                <p className="text-gray-500">Upload Date</p>
                <p className="font-medium">{formatDate(selectedImage.uploadDate)}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href={selectedImage.url}
              download={selectedImage.name}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
            <a
              href={selectedImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-50 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in New Tab
            </a>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.filter(image => image.type !== 'GeoTIFF').map((image, index) => ( // Filter out GeoTIFF files
              <div 
                key={index} 
                className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-100 hover:shadow-md transition-shadow duration-200"
                onClick={() => setSelectedImage(image)}
              >
                <div className="aspect-w-1 aspect-h-1 w-full">
                  <img
                    src={image.url}
                    alt={image.name || `Image ${index + 1}`}
                    className="object-cover w-full h-full"
                    onError={() => handleImageError(image.url)}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">{image.name || `Image ${index + 1}`}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Displaying {images.filter(image => image.type !== 'GeoTIFF').length} image{images.filter(image => image.type !== 'GeoTIFF').length !== 1 ? 's' : ''}. Click on an image to view details.
          </p>
        </div>
      )}
    </div>
  );
};
