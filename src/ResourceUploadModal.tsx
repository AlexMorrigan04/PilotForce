import React, { useState, useCallback } from 'react';
import axios from 'axios';
// Update imports to use AWS SDK v3 properly
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Maximum file size constant - 4MB in bytes
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes

// AWS Configuration - should use environment variables in production
const AWS_REGION = 'eu-north-1'; // Replace with your region
const S3_BUCKET = 'pilotforce-resources'; // Replace with your bucket name

interface ResourceUploadModalProps {
  bookingId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ResourceUploadModal: React.FC<ResourceUploadModalProps> = ({ 
  bookingId, 
  onClose, 
  onSuccess 
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Add a debug function to check file sizes
  const debugFileSize = useCallback((file: File) => {
    const sizeInMB = file.size / (1024 * 1024);
    console.log(`Debug - File: ${file.name}, Size: ${sizeInMB.toFixed(2)}MB, Exceeds limit: ${file.size > MAX_FILE_SIZE}`);
    return file.size > MAX_FILE_SIZE;
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Debug file sizes
      files.forEach(debugFileSize);
      
      // Add file type validation for security
      const validFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
      const invalidFileTypes = files.filter(file => !validFileTypes.includes(file.type));
      
      // Check for large files - just for notification
      const largeFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      console.log(`Found ${largeFiles.length} large files that will be uploaded directly to S3`);
      
      if (invalidFileTypes.length > 0) {
        setError(`Unsupported file types: ${invalidFileTypes.map(file => file.name).join(', ')}`);
        // Only set valid file types
        const validFiles = files.filter(file => validFileTypes.includes(file.type));
        setSelectedFiles(validFiles);
      } else {
        setError(''); // Clear any previous errors
        setSelectedFiles(files);
        
        // Inform about large files
        if (largeFiles.length > 0) {
          console.log(`${largeFiles.length} large files will be uploaded directly to S3, bypassing API Gateway.`);
          setError(`Note: ${largeFiles.length} files exceed 4MB and will be uploaded directly to S3.`);
        }
      }
    }
  };

  // Function to directly upload large files to S3
  const uploadLargeFilesToS3 = async (largeFiles: File[]) => {
    console.log(`Starting S3 direct upload for ${largeFiles.length} files`);
    largeFiles.forEach(file => {
      const sizeInMB = file.size / (1024 * 1024);
      console.log(`S3 upload - File: ${file.name}, Size: ${sizeInMB.toFixed(2)}MB`);
    });
    
    try {
      // Get credentials from your auth system - restructure for AWS SDK v3
      const credentials = {
        accessKeyId: localStorage.getItem('aws-access-key-id') || '',
        secretAccessKey: localStorage.getItem('aws-secret-access-key') || '',
        sessionToken: localStorage.getItem('aws-session-token') || undefined
      };

      // Initialize S3 client with proper configuration
      const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: credentials
      });
      
      // Process each file
      const uploadPromises = largeFiles.map(async (file) => {
        const resourceId = `resource_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const key = `${bookingId}/${resourceId}/${file.name}`;
        
        console.log(`Uploading ${file.name} directly to S3 bucket ${S3_BUCKET}, key: ${key}`);
        
        // Upload to S3
        const uploadParams = {
          Bucket: S3_BUCKET,
          Key: key,
          Body: file,
          ContentType: file.type
        };
        
        try {
          const uploadResult = await s3Client.send(new PutObjectCommand(uploadParams));
          console.log(`S3 upload successful for ${file.name}`, uploadResult);
          
          // API record keeping
          const resourceUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
          
          await axios.post(`/api/bookings/${bookingId}/resource-records`, {
            id: resourceId,
            bookingId: bookingId,
            resourceUrl: resourceUrl,
            resourceType: file.type,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString()
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('idToken')}`
            }
          });
          
          console.log(`Resource record created for ${file.name}`);
          return resourceId;
        } catch (error) {
          console.error(`Error uploading ${file.name} to S3:`, error);
          throw error;
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${largeFiles.length} large files directly to S3`);
      return true;
    } catch (err) {
      console.error('Error uploading large files directly to S3:', err);
      throw err;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if files are selected
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Please select files to upload");
      return;
    }
    
    console.log(`Uploading files for booking ID: ${bookingId}`);
    console.log(`Total files: ${selectedFiles.length}`);
    
    // Debug file sizes before processing
    selectedFiles.forEach(file => {
      const sizeInMB = file.size / (1024 * 1024);
      console.log(`Pre-upload - File: ${file.name}, Size: ${sizeInMB.toFixed(2)}MB, Type: ${file.type}`);
    });
    
    // Upload files
    setIsLoading(true);
    
    try {
      // Separate files by size
      const standardFiles = selectedFiles.filter(file => file.size <= MAX_FILE_SIZE);
      const largeFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
      
      console.log(`Standard files (${standardFiles.length}):`, standardFiles.map(file => file.name).join(', '));
      console.log(`Large files (${largeFiles.length}):`, largeFiles.map(file => file.name).join(', '));
      
      // Process large files first - make sure this runs
      if (largeFiles.length > 0) {
        console.log(`Starting S3 direct upload for ${largeFiles.length} large files`);
        
        // DEBUG: Force file sizes
        largeFiles.forEach(file => {
          const sizeInMB = file.size / (1024 * 1024);
          console.log(`Large file: ${file.name}, Size: ${sizeInMB.toFixed(2)}MB`);
        });
        
        await uploadLargeFilesToS3(largeFiles);
      }
      
      // Then process standard files through API Gateway
      if (standardFiles.length > 0) {
        console.log(`Uploading ${standardFiles.length} standard files via API Gateway`);
        const formData = new FormData();
        
        standardFiles.forEach(file => {
          const sizeInMB = file.size / (1024 * 1024);
          console.log(`Adding standard file to form: ${file.name}, size: ${sizeInMB.toFixed(2)}MB`);
          formData.append('files', file);
        });
        
        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        await axios.post(`/api/bookings/${bookingId}/resources`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(csrfToken && { 'X-CSRF-Token': csrfToken })
          },
          withCredentials: true // Send cookies for session authentication
        });
      }
      
      setIsLoading(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setIsLoading(false);
      if (axios.isAxiosError(err)) {
        setError(`Upload failed: ${err.response?.data?.message || err.message}`);
      } else {
        setError('An unexpected error occurred during upload');
      }
      console.error('Error uploading files:', err);
    }
  };

  return (
    <div className="resource-upload-modal">
      <h2>Upload Resources</h2>
      <form onSubmit={handleSubmit}>
        <div className="file-upload-container">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <p className="file-size-info">
            Files up to 4MB will be uploaded via API Gateway.
            Larger files will be uploaded directly to S3.
          </p>
          {error && <p className={error.startsWith('Note:') ? 'info-message' : 'error-message'}>{error}</p>}
        </div>
        
        <div className="modal-actions">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isLoading || selectedFiles.length === 0}
          >
            {isLoading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResourceUploadModal;