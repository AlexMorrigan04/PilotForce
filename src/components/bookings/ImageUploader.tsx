import React, { useState, useRef } from 'react';
import { uploadImageWithMetadata } from '../../utils/imageUploadUtils';
import AWS from 'aws-sdk';

interface ImageUploaderProps {
  bookingId: string;
  onUploadComplete?: (images: any[]) => void;
  onUploadError?: (error: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  bookingId, 
  onUploadComplete, 
  onUploadError 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get AWS config from environment variables
  const awsConfig = {
    region: process.env.REACT_APP_AWS_REGION || '',
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || ''
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const totalFiles = files.length;
    let uploadedCount = 0;
    const newlyUploadedImages: any[] = [];
    
    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        // Upload image with metadata extraction
        const result = await uploadImageWithMetadata(file, bookingId, awsConfig);
        
        if (result.success) {
          newlyUploadedImages.push(result.data);
          
          // Extract and log the geolocation data for verification
          if (result.data.geolocation) {
            // Helper function to format DynamoDB number values
            const getNumberValue = (obj: any, key: string) => {
              if (obj[key] && obj[key].N) {
                return parseFloat(obj[key].N);
              }
              return undefined;
            };
            
            const geo = result.data.geolocation;
            const latitude = getNumberValue(geo, 'latitude');
            const longitude = getNumberValue(geo, 'longitude');
            const heading = getNumberValue(geo, 'heading');
            const altitude = getNumberValue(geo, 'altitude');
            
          } else {
          }
        } else {
          if (onUploadError) {
            onUploadError(`Failed to upload ${file.name}: ${result.error}`);
          }
        }
        
        // Update progress
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      }
      
      // Update state with new images
      setUploadedImages(prev => [...prev, ...newlyUploadedImages]);
      
      // Log summary of metadata extraction
      const withCoordinates = newlyUploadedImages.filter(img => 
        img.geolocation && img.geolocation.latitude && img.geolocation.longitude
      ).length;
      
      const withHeading = newlyUploadedImages.filter(img => 
        img.geolocation && img.geolocation.heading
      ).length;
      
      const withAltitude = newlyUploadedImages.filter(img => 
        img.geolocation && img.geolocation.altitude
      ).length;
      
      
      // Call the onUploadComplete callback with the newly uploaded images
      if (onUploadComplete && newlyUploadedImages.length > 0) {
        onUploadComplete(newlyUploadedImages);
      }
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      if (onUploadError) {
        onUploadError(`Upload process failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Drone Images
        </label>
        
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">Images with GPS data for best results</p>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>
      
      {isUploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Uploading: {uploadProgress}%</p>
          <p className="text-xs text-gray-500">Extracting GPS, altitude and heading data from images...</p>
        </div>
      )}
      
      {uploadedImages.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Recently Uploaded Images: {uploadedImages.length}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {uploadedImages.map((image, index) => {
              // Helper function to extract numeric value from DynamoDB format
              const getValue = (obj: any, key: string) => {
                if (obj && obj[key] && obj[key].N) {
                  return parseFloat(obj[key].N);
                }
                return undefined;
              };
              
              // Extract geolocation data if available
              const geo = image.geolocation;
              const lat = getValue(geo, 'latitude');
              const lng = getValue(geo, 'longitude');
              const heading = getValue(geo, 'heading');
              const altitude = getValue(geo, 'altitude');
              
              return (
                <div key={index} className="relative bg-gray-100 rounded-md overflow-hidden group">
                  <img 
                    src={image.s3Url} 
                    alt={image.filename} 
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex flex-col items-start justify-end p-1">
                    <div className="opacity-0 group-hover:opacity-100 text-white text-xs transition-opacity">
                      <div className="font-medium">{image.filename}</div>
                      {lat !== undefined && lng !== undefined && (
                        <div className="truncate max-w-full">
                          📍 {lat.toFixed(6)}, {lng.toFixed(6)}
                        </div>
                      )}
                      {heading !== undefined && (
                        <div>🧭 {heading.toFixed(1)}°</div>
                      )}
                      {altitude !== undefined && (
                        <div>📏 {altitude.toFixed(1)}m</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Add metadata summary */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800">Image Metadata Summary</h4>
            <div className="mt-1 text-xs text-blue-600">
              <p>• {uploadedImages.filter(img => img.geolocation && img.geolocation.latitude).length} images with GPS coordinates</p>
              <p>• {uploadedImages.filter(img => img.geolocation && img.geolocation.heading).length} images with heading/direction data</p>
              <p>• {uploadedImages.filter(img => img.geolocation && img.geolocation.altitude).length} images with altitude data</p>
            </div>
            <p className="mt-2 text-xs text-blue-500">Check the browser console for detailed metadata logs.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
