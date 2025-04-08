import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiX, FiImage, FiMap } from 'react-icons/fi';

interface ResourceUploaderProps {
  bookingId: string;
  onUpload: (bookingId: string, file: File, resourceType: string) => Promise<void>;
}

const ResourceUploader: React.FC<ResourceUploaderProps> = ({ bookingId, onUpload }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [resourceType, setResourceType] = useState<string>('image');
  const [uploading, setUploading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Trigger file selection dialog
  const handleButtonClick = () => {
    inputRef.current?.click();
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      setSelectedFiles(prevFiles => [...prevFiles, ...fileArray]);
    }
  };
  
  // Handle file drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(prevFiles => [...prevFiles, ...fileArray]);
    }
  };
  
  // Remove a file from selection
  const removeFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  // Upload selected files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrors(['Please select at least one file to upload']);
      return;
    }
    
    setUploading(true);
    setErrors([]);
    setSuccessMessage('');
    
    const uploadErrors: string[] = [];
    let successCount = 0;
    
    for (const file of selectedFiles) {
      try {
        await onUpload(bookingId, file, resourceType);
        successCount++;
      } catch (error) {
        console.error('Error uploading file:', error);
        uploadErrors.push(`Failed to upload ${file.name}: ${error}`);
      }
    }
    
    if (successCount > 0) {
      setSuccessMessage(`Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}`);
      setSelectedFiles([]);
    }
    
    if (uploadErrors.length > 0) {
      setErrors(uploadErrors);
    }
    
    setUploading(false);
  };
  
  // Get file size in human-readable format
  const formatFileSize = (sizeInBytes: number): string => {
    const KB = 1024;
    const MB = KB * 1024;
    
    if (sizeInBytes < KB) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < MB) {
      return `${(sizeInBytes / KB).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / MB).toFixed(1)} MB`;
    }
  };
  
  // Get appropriate icon based on file type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FiImage className="h-5 w-5 text-blue-500" />;
    } else if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
      return <FiMap className="h-5 w-5 text-green-500" />;
    } else {
      return <FiFile className="h-5 w-5 text-gray-500" />;
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload Resources for Booking #{bookingId}</h2>
      
      {/* Resource type selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              name="resourceType"
              value="image"
              checked={resourceType === 'image'}
              onChange={() => setResourceType('image')}
            />
            <span className="ml-2 text-sm text-gray-700">Images</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              name="resourceType"
              value="geotiff"
              checked={resourceType === 'geotiff'}
              onChange={() => setResourceType('geotiff')}
            />
            <span className="ml-2 text-sm text-gray-700">GeoTIFF Files</span>
          </label>
        </div>
      </div>
      
      {/* File dropzone */}
      <div 
        className={`mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-1 text-center">
          <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
            >
              <span>Upload files</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                multiple
                onChange={handleFileChange}
                ref={inputRef}
                accept={resourceType === 'image' ? 'image/*' : '.tif,.tiff,application/geotiff'}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            {resourceType === 'image'
              ? 'PNG, JPG, JPEG up to 10MB'
              : 'GeoTIFF files up to 50MB'}
          </p>
        </div>
      </div>
      
      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({selectedFiles.length})</h3>
          <ul className="divide-y divide-gray-200">
            {selectedFiles.map((file, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <div className="flex items-center">
                  {getFileIcon(file)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-4 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Remove file</span>
                  <FiX className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiX className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error uploading files</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {successMessage && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiUpload className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload button */}
      <div className="mt-5">
        <button
          type="button"
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            selectedFiles.length === 0 || uploading
              ? 'bg-blue-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <FiUpload className="-ml-1 mr-2 h-5 w-5" />
              Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ResourceUploader;
