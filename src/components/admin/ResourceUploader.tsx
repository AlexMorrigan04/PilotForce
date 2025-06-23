import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as s3Service from '../../services/s3Service';

interface ResourceUploaderProps {
  bookingId: string;
  onUploadComplete?: (resourceId: string) => void;
  onUploadError?: (error: Error) => void;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface ImageMetadata {
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  altitude?: number;
  header?: Record<string, any>;
}

// Simple metadata extractor - replace with actual implementation
const extractImageMetadata = async (file: File): Promise<ImageMetadata> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      // In a real implementation, you would parse the image data
      // and extract actual metadata. For now, return empty object
      resolve({});
    };
    reader.readAsArrayBuffer(file);
  });
};

export const ResourceUploader: React.FC<ResourceUploaderProps> = ({
  bookingId,
  onUploadComplete,
  onUploadError
}) => {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const updateProgress = useCallback((fileName: string, update: Partial<UploadProgress>) => {
    setUploads(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        ...update
      }
    }));
  }, []);

  const handleUpload = async (file: File) => {
    try {
      // Initialize upload progress
      updateProgress(file.name, {
        fileName: file.name,
        progress: 0,
        status: 'pending'
      });

      // Extract metadata if it's an image
      let metadata = {};
      if (file.type.startsWith('image/')) {
        metadata = await extractImageMetadata(file);
      }

      // Start upload
      updateProgress(file.name, { status: 'uploading' });
      
      const resourceId = await s3Service.uploadFile(
        bookingId,
        file,
        (progress) => {
          updateProgress(file.name, { progress: progress.percentage });
        },
        metadata
      );
      
      // Update status and notify completion
      updateProgress(file.name, { status: 'complete', progress: 100 });
      onUploadComplete?.(resourceId);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateProgress(file.name, {
        status: 'error',
        error: errorMessage
      });
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(handleUpload);
  }, [bookingId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif'],
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  return (
    <div className="resource-uploader">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag 'n' drop files here, or click to select files</p>
        )}
          </div>
          
      {Object.values(uploads).length > 0 && (
        <div className="upload-progress">
          {Object.values(uploads).map((upload) => (
            <div key={upload.fileName} className={`upload-item ${upload.status}`}>
              <div className="upload-info">
                <span className="filename">{upload.fileName}</span>
                <span className="status">{upload.status}</span>
        </div>
              <div className="progress-bar">
                <div
                  className="progress"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              {upload.error && (
                <div className="error-message">{upload.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
