import React, { useState, useRef, useCallback } from 'react';
import { FiX, FiUpload, FiFile, FiImage, FiMap, FiDownload } from 'react-icons/fi';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as s3Service from '../../services/s3Service';
import { splitFileIntoChunks, chunkToBase64, FileChunk } from '../../utils/fileSplitter';
import { uploadDirectlyToS3, extractImageMetadata } from '../../utils/directS3Upload';

// Maximum file size constant - 4MB in bytes for regular API uploads
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes
// Maximum total file size - 100MB
const MAX_TOTAL_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';

interface ResourceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onUploadComplete: () => void;
}

const ResourceUploadModal: React.FC<ResourceUploadModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | JSX.Element | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug function to check file sizes
  const debugFileSize = useCallback((file: File) => {
    const sizeInMB = file.size / (1024 * 1024);
    console.log(`Debug - File: ${file.name}, Size: ${sizeInMB.toFixed(2)}MB, Exceeds limit: ${file.size > MAX_FILE_SIZE}`);
    return file.size > MAX_FILE_SIZE;
  }, []);

  if (!isOpen) return null;

  // For large files, offer an immediate download option instead of trying server upload
  const handleLargeFileFallback = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    
    return (
      <div className="mt-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
        <p className="mb-2">
          The file <strong>{file.name}</strong> ({formatFileSize(file.size)}) is too large to upload directly.
        </p>
        <p className="mb-2">
          Since your API has CORS restrictions, we've created a local link for this file that you can:
        </p>
        <ol className="list-decimal ml-5 mb-3">
          <li>Download this file to your device</li>
          <li>Upload it manually to your S3 bucket</li>
          <li>Register it with the backend system</li>
        </ol>
        <div className="flex justify-center">
          <a 
            href={objectUrl} 
            download={file.name}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            }}
          >
            <FiDownload className="mr-2" />
            Download File
          </a>
        </div>
      </div>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const fileList = Array.from(e.target.files);
    
    const oversizedFiles = fileList.filter(file => file.size > MAX_TOTAL_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size limit of ${formatFileSize(MAX_TOTAL_FILE_SIZE)}: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    fileList.forEach(debugFileSize);
    
    const largeFiles = fileList.filter(file => file.size > MAX_FILE_SIZE);
    if (largeFiles.length > 0) {
      console.log(`Found ${largeFiles.length} files exceeding 4MB limit that will be uploaded directly to S3`);
    }
    
    setFiles(prevFiles => [...prevFiles, ...fileList]);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  // Convert small files to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Upload small file via API Gateway
  const uploadSmallFileViaAPI = async (file: File): Promise<any> => {
    try {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      console.log(`Uploading standard file via API Gateway: ${file.name}, size: ${file.size}, type: ${file.type}`);

      const base64File = await convertFileToBase64(file);
      const metadata = file.type.startsWith('image/') ? await extractImageMetadata(file) : null;

      const response = await axios.post(
        `${API_BASE_URL}/admin/bookings/${bookingId}/resources`,
        {
          file: base64File,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          resourceType: file.type.startsWith('image/') ? 'image' : 'file',
          metadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(prev => ({ ...prev, [file.name]: percentCompleted }));
            }
          }
        }
      );

      console.log("Upload response from API Gateway:", response.data);
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      return { file, success: true, result: response.data };
    } catch (err: any) {
      console.error(`Error uploading ${file.name} via API:`, err);
      return { file, success: false, error: err };
    }
  };

  // Upload large file directly to S3
  const uploadLargeFileDirectly = async (file: File): Promise<any> => {
    try {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      console.log(`Uploading large file directly to S3: ${file.name}, size: ${file.size}, type: ${file.type}`);
      
      // Use the direct S3 upload utility with proper progress tracking
      const result = await uploadDirectlyToS3(
        file, 
        bookingId,
        (progress) => setUploadProgress(prev => ({ ...prev, [file.name]: progress }))
      );
      
      if (result.success) {
        console.log(`Successfully uploaded ${file.name} directly to S3`);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        return { file, success: true, result };
      } else {
        // Handle manual upload fallback if automatic upload failed
        setError(prev => {
          const fallbackMessage = (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              <p className="mb-2">
                <strong>Note:</strong> Automatic upload for {file.name} failed due to CORS restrictions.
              </p>
              <p className="mb-2">Please use one of these options:</p>
              <ol className="list-decimal ml-5 mb-3">
                <li>Download the file and manually upload it to the S3 bucket</li>
                <li>Try again with a smaller file (under 4MB)</li>
                <li>Contact support for assistance with large file uploads</li>
              </ol>
              <div className="flex justify-center mt-3">
                <a 
                  href={result.resourceUrl} 
                  download={file.name}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTimeout(() => URL.revokeObjectURL(result.resourceUrl), 1000);
                  }}
                >
                  <FiDownload className="mr-2" />
                  Download File
                </a>
              </div>
            </div>
          );
          
          return typeof prev === 'string' ? fallbackMessage : (
            <>
              {prev}
              {fallbackMessage}
            </>
          );
        });
        
        throw new Error(`Failed to upload ${file.name} directly to S3`);
      }
    } catch (err: any) {
      console.error(`Error in direct S3 upload for ${file.name}:`, err);
      return { file, success: false, error: err };
    }
  };

  // Updated function to update booking status to 'Completed'
  const updateBookingStatus = async (bookingId: string): Promise<boolean> => {
    try {
      console.log(`Updating booking ${bookingId} status to 'Completed'`);
      
      const response = await axios.put(
        `${API_BASE_URL}/admin/bookings/${bookingId}/status`,
        {
          status: 'Completed'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          }
        }
      );

      console.log("Booking status update response:", response.data);
      
      // Check for success in the response data
      if (response.data.success || 
          (response.data.message && response.data.message.includes('success'))) {
        return true;
      }
      return false;
    } catch (err: any) {
      console.error(`Error updating booking status for ${bookingId}:`, err);
      // Check if error response contains success message
      if (err.response?.data?.message?.includes('success')) {
        console.log("Found success message in error response - treating as success");
        return true;
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      console.log("Uploading files for booking ID:", bookingId);
      
      const standardFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
      const largeFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      
      console.log(`Standard files (${standardFiles.length}):`, standardFiles.map(file => file.name).join(', '));
      console.log(`Large files (${largeFiles.length}):`, largeFiles.map(file => file.name).join(', '));
      
      // Process all files - use direct S3 upload for large files
      const uploadPromises = [
        ...standardFiles.map(file => uploadSmallFileViaAPI(file))
      ];
      
      // Start with standard files first
      let standardUploadSuccess = false;
      if (standardFiles.length > 0) {
        const standardResults = await Promise.allSettled(uploadPromises);
        // Check if any standard file uploads were successful
        standardUploadSuccess = standardResults.some(
          result => result.status === 'fulfilled' && result.value.success
        );
      }
      
      // Then handle large files one at a time with improved error handling
      const largeFileResults = [];
      let largeUploadSuccess = false;
      
      if (largeFiles.length > 0) {
        setError(
          <div className="text-blue-700">
            <p className="mb-2 font-medium">Processing {largeFiles.length} large file(s) using chunked upload through API...</p>
            <p className="text-sm">This may take several minutes. Please don't close this window.</p>
          </div>
        );
        
        for (const file of largeFiles) {
          try {
            const result = await uploadLargeFileDirectly(file);
            largeFileResults.push(result);
            if (result.success) {
              largeUploadSuccess = true;
            }
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            largeFileResults.push({ 
              file, 
              success: false, 
              error 
            });
          }
        }
      }
      
      // Combine all results
      const results = [...await Promise.allSettled(uploadPromises), ...largeFileResults];
      
      // Process fulfilled and rejected promises
      const failures = results
        .filter((result) => 
          result.status === 'rejected' || 
          (result.status === 'fulfilled' && !result.value.success))
        .map((result) => {
          if (result.status === 'rejected') return result.reason;
          return result.status === 'fulfilled' ? result.value : null;
        });

      // Check if any upload was successful
      const anyUploadSuccessful = standardUploadSuccess || largeUploadSuccess;

      if (failures.length > 0) {
        const errorFiles = failures
          .filter(f => f && f.file)
          .map(f => f.file?.name || 'Unknown file')
          .join(', ');
          
        if (errorFiles) {
          setError(prev => {
            const newError = `Failed to upload the following files: ${errorFiles}. Please try again or contact support.`;
            return typeof prev === 'string' ? `${prev} ${newError}` : newError;
          });
        }
      }
      
      // If any file was successfully uploaded, update booking status to 'Completed'
      if (anyUploadSuccessful) {
        try {
          const statusUpdateSuccess = await updateBookingStatus(bookingId);
          if (statusUpdateSuccess) {
            console.log(`Successfully updated booking ${bookingId} status to 'Completed'`);
          } else {
            console.warn(`Failed to update booking ${bookingId} status to 'Completed'`);
          }
        } catch (statusError) {
          console.error("Error updating booking status:", statusError);
        }
        
        // Only close and reset if we had success with at least one file
        setFiles([]);
        onUploadComplete();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during file upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      const oversizedFiles = droppedFiles.filter(file => file.size > MAX_TOTAL_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        setError(`Some files exceed the maximum size limit of ${formatFileSize(MAX_TOTAL_FILE_SIZE)}: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full lg:max-w-4xl">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              disabled={uploading}
            >
              <span className="sr-only">Close</span>
              <FiX className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Upload Resources for Booking #{bookingId}
                </h3>

                <div className="mt-4">
                  <div
                    className="border-dashed border-2 border-gray-300 rounded-md px-6 pt-5 pb-6 flex flex-col items-center cursor-pointer hover:border-blue-500"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="sr-only"
                      accept="image/*,.tif,.tiff,.pdf,.zip"
                      disabled={uploading}
                    />
                    <div className="space-y-1 text-center">
                      <div className="mx-auto h-12 w-12 text-gray-400">
                        <FiUpload className="h-12 w-12" />
                      </div>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                        >
                          <span>Upload files</span>
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Images, GeoTIFF, PDFs, and other supported files (max {formatFileSize(MAX_TOTAL_FILE_SIZE)})
                      </p>
                      <p className="text-xs font-medium text-blue-600 mt-1">
                        Files larger than {formatFileSize(MAX_FILE_SIZE)} will be uploaded via chunking
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900">Files to upload ({files.length})</h4>
                      <div className="max-h-60 overflow-y-auto mt-2">
                        <ul className="divide-y divide-gray-200">
                          {files.map((file, index) => (
                            <li key={`${file.name}-${index}`} className="py-3 flex justify-between items-center">
                              <div className="flex items-center">
                                {getFileIcon(file)}
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                  {file.size > MAX_FILE_SIZE && (
                                    <p className="text-xs text-blue-600">Will use chunked upload</p>
                                  )}
                                </div>
                              </div>

                              <div>
                                {uploadProgress[file.name] !== undefined ? (
                                  <div className="w-24">
                                    <div className="bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${uploadProgress[file.name]}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-gray-500">{uploadProgress[file.name]}%</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    disabled={uploading}
                                    className={`text-red-500 hover:text-red-700 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <span className="sr-only">Remove</span>
                                    <FiX className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={uploading || files.length === 0}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm 
                ${uploading || files.length === 0 
                  ? 'bg-blue-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
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
                'Upload'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className={`mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm 
                ${uploading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) {
    return <FiImage className="h-5 w-5 text-blue-500" />;
  } else if (file.name.match(/\.(tif|tiff)$/i)) {
    return <FiMap className="h-5 w-5 text-green-500" />;
  } else {
    return <FiFile className="h-5 w-5 text-gray-500" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export default ResourceUploadModal;
