import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiX, FiImage, FiMap, FiFolder } from 'react-icons/fi';
import * as s3Service from '../../services/s3Service';

interface ResourceUploaderProps {
  bookingId: string;
  onUpload: (bookingId: string, file: File, resourceType: string) => Promise<void>;
  onSuccess?: (folderId: string) => void;
  onError?: (error: any) => void;
  resourceType?: string;
  maxFileSize?: number; // Maximum file size in bytes for regular uploads
  maxFileSizeTotal?: number; // Maximum file size allowed overall
}

const ResourceUploader: React.FC<ResourceUploaderProps> = ({ 
  bookingId, 
  onUpload, 
  onSuccess, 
  onError,
  resourceType = 'folder',
  maxFileSize = 4 * 1024 * 1024, // 4MB for regular uploads
  maxFileSizeTotal = 100 * 1024 * 1024 // 100MB max overall
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [folderName, setFolderName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isLargeFile, setIsLargeFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Format bytes to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Validate file size and type
  const validateFile = (file: File): string | null => {
    // Check overall size limit
    if (file.size > maxFileSizeTotal) {
      return `File size exceeds the maximum allowed limit of ${formatFileSize(maxFileSizeTotal)}`;
    }

    // For image type resources, validate file types
    if (resourceType === 'image') {
      const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'];
      if (!supportedImageTypes.includes(file.type)) {
        return 'Unsupported image format. Please use JPG, PNG, GIF, WebP, or TIFF.';
      }
    }

    // Check if it's a large file that needs direct S3 upload
    if (file.size > maxFileSize) {
      setIsLargeFile(true);
    } else {
      setIsLargeFile(false);
    }

    return null; // File is valid
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging) {
      setDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const validationError = validateFile(droppedFile);
      
      if (validationError) {
        setUploadError(validationError);
        if (onError) onError(new Error(validationError));
      } else {
        setUploadError(null);
        setFile(droppedFile);
      }
    }
  };

  // Handle file selection through input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const validationError = validateFile(selectedFile);
      
      if (validationError) {
        setUploadError(validationError);
        if (onError) onError(new Error(validationError));
        // Clear the input to allow selecting a different file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setUploadError(null);
        setFile(selectedFile);
      }
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Clear selected file
  const clearFile = () => {
    setFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    // For folder creation, use a dummy file with the folder name
    if (resourceType === 'folder') {
      if (!folderName.trim()) {
        const errorMessage = 'Please enter a folder name';
        setUploadError(errorMessage);
        onError && onError(new Error(errorMessage));
        return;
      }
      
      // Create a dummy file object with the folder name
      const folderNameFile = new File([""], folderName, {
        type: "application/folder",
        lastModified: new Date().getTime()
      });
      
      try {
        setUploading(true);
        setUploadError(null);
        await onUpload(bookingId, folderNameFile, resourceType);
        
        if (onSuccess) {
          onSuccess('folder_' + new Date().getTime());
        }
        
        // Reset form
        setFolderName('');
      } catch (error: any) {
        console.error('Error creating folder:', error);
        const errorMessage = error.message || 'Failed to create folder. Please try again.';
        setUploadError(errorMessage);
        if (onError) {
          onError(error);
        }
      } finally {
        setUploading(false);
      }
      return;
    }
    
    // For file uploads
    if (file) {
      // Double-check file size before upload
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        onError && onError(new Error(validationError));
        return;
      }
      
      try {
        setUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        
        // Handle large files with direct S3 upload
        if (isLargeFile) {
          await handleLargeFileUpload(file);
        } else {
          // Use regular upload for smaller files
          await onUpload(bookingId, file, resourceType);
        }
        
        if (onSuccess) {
          onSuccess('file_' + new Date().getTime());
        }
        
        // Reset form
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        const errorMessage = error.message || 'Failed to upload file. Please try again.';
        setUploadError(errorMessage);
        if (onError) {
          onError(error);
        }
      } finally {
        setUploading(false);
      }
    } else {
      const errorMessage = 'Please select a file to upload';
      setUploadError(errorMessage);
      onError && onError(new Error(errorMessage));
    }
  };
  
  // Handle large file uploads directly to S3
  const handleLargeFileUpload = async (file: File): Promise<void> => {
    try {
      console.log(`Starting direct S3 upload for large file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      
      // Step 1: Get presigned URL from the backend
      const presignedData = await s3Service.getPresignedUrl(
        bookingId,
        file.name,
        file.type,
        file.size,
        resourceType
      );
      
      // Step 2: Upload file directly to S3 using the presigned URL
      await s3Service.uploadToS3(
        presignedData.uploadUrl, 
        file,
        (progress) => setUploadProgress(progress)
      );
      
      // Step 3: Notify backend that upload is complete
      await s3Service.completeS3Upload(bookingId, presignedData.resourceRecordId);
      
      console.log(`Successfully uploaded large file: ${file.name}`);
    } catch (error) {
      console.error(`Error in S3 direct upload for ${file.name}:`, error);
      throw error;
    }
  };

  // Determine resource type icon
  const getResourceTypeIcon = () => {
    switch (resourceType) {
      case 'folder':
        return <FiFolder className="h-12 w-12 text-blue-500" />;
      case 'image':
        return <FiImage className="h-12 w-12 text-blue-500" />;
      case 'map':
        return <FiMap className="h-12 w-12 text-blue-500" />;
      default:
        return <FiFile className="h-12 w-12 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start mb-4">
          <FiX className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <span className="text-sm">{uploadError}</span>
        </div>
      )}
      
      {resourceType === 'folder' ? (
        // Folder creation form
        <div className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-1">
              Folder Name
            </label>
            <input
              type="text"
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm"
              placeholder="Enter folder name"
              disabled={uploading}
            />
          </div>
          
          <button
            onClick={handleUpload}
            disabled={folderName.trim() === '' || uploading}
            className={`
              w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${uploading || folderName.trim() === '' ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
            `}
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <FiFolder className="mr-2" /> Create Folder
              </>
            )}
          </button>
        </div>
      ) : (
        // File upload form
        <div className="space-y-4">
          <div
            onClick={triggerFileInput}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 cursor-pointer flex flex-col items-center justify-center
              ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
              ${uploadError ? 'border-red-300' : ''}
            `}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
              accept={resourceType === 'image' ? 'image/jpeg,image/png,image/gif,image/webp,image/tiff' : undefined}
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <FiFile className="h-8 w-8 text-blue-500 mb-2" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                  {isLargeFile && <span className="ml-1 text-amber-600">(Large file - direct upload)</span>}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                {getResourceTypeIcon()}
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Drag & drop a file here, or click to select
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supports {resourceType === 'image' ? 'JPG, PNG, GIF, WebP, TIFF' : 'images, PDFs, docs, and more'} (max {formatFileSize(maxFileSizeTotal)})
                </p>
              </>
            )}
          </div>
          
          {/* Upload progress bar */}
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {uploadProgress}% uploaded
              </p>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!file || uploading || !!uploadError}
            className={`
              w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${!file || uploading || uploadError ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
            `}
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isLargeFile ? 'Uploading directly to S3...' : 'Uploading...'}
              </>
            ) : (
              <>
                <FiUpload className="mr-2" /> Upload
              </>
            )}
          </button>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        <p>
          Note: Files under {formatFileSize(maxFileSize)} are uploaded through the API. 
          Larger files (up to {formatFileSize(maxFileSizeTotal)}) will be uploaded directly to storage.
        </p>
      </div>
    </div>
  );
};

export default ResourceUploader;
