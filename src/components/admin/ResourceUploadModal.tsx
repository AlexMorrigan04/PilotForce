import React, { useState, useRef, useCallback } from 'react';
import { FiX, FiUpload, FiFile, FiImage, FiMap } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import * as s3Service from '../../services/s3Service';
import { uploadDirectlyToS3, extractImageMetadata } from '../../utils/directS3Upload';

// Maximum total file size - 100MB
const MAX_TOTAL_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentBatch, setCurrentBatch] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [currentChunk, setCurrentChunk] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<{ [key: string]: number }>({});
  const [processedFiles, setProcessedFiles] = useState<number>(0);
  const CHUNK_SIZE = 10; // Process 10 files at a time
  const BATCH_SIZE = 2; // Process 2 files at a time within each chunk
  const INITIAL_BATCH_DELAY = 3000; // 3 seconds initial delay
  const CHUNK_DELAY = 5000; // 5 seconds delay between chunks
  const MAX_RETRIES = 3;
  const MAX_BACKOFF_DELAY = 10000;

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const fileList = Array.from(e.target.files);
    
    const oversizedFiles = fileList.filter(file => file.size > MAX_TOTAL_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size limit of ${formatFileSize(MAX_TOTAL_FILE_SIZE)}: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const uploadWithRetry = async (file: File, attempt: number = 0): Promise<boolean> => {
    try {
      const result = await uploadDirectlyToS3(
        file,
        bookingId,
        (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
        }
      );
      
      if (!result.success) throw new Error('Upload failed');
      return true;
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        return false;
      }

      // Calculate exponential backoff delay
      const backoffDelay = Math.min(
        INITIAL_BATCH_DELAY * Math.pow(2, attempt),
        MAX_BACKOFF_DELAY
      );
      await sleep(backoffDelay);
      
      // Update retry count for UI
      setRetryCount(prev => ({
        ...prev,
        [file.name]: (prev[file.name] || 0) + 1
      }));
      
      return uploadWithRetry(file, attempt + 1);
    }
  };

  const uploadBatch = async (batch: File[]) => {
    const results = await Promise.all(
      batch.map(file => uploadWithRetry(file))
    );
    
    return batch.filter((_, index) => !results[index]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setRetryCount({});
    setProcessedFiles(0);

    try {
      // Split all files into chunks of 10
      const chunks: File[][] = [];
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        chunks.push(files.slice(i, i + CHUNK_SIZE));
      }
      setTotalChunks(chunks.length);

      const allFailedUploads: string[] = [];

      // Process each chunk
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        setCurrentChunk(chunkIndex + 1);
        const chunk = chunks[chunkIndex];

        // Split chunk into smaller batches
        const batches: File[][] = [];
        for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
          batches.push(chunk.slice(i, i + BATCH_SIZE));
        }
        setTotalBatches(batches.length);

        // Process each batch in the chunk
        for (let i = 0; i < batches.length; i++) {
          setCurrentBatch(i + 1);
          const batch = batches[i];
          
          // Process batch and collect failures
          const failedFiles = await uploadBatch(batch);
          allFailedUploads.push(...failedFiles.map(f => f.name));

          // Update processed files count
          setProcessedFiles(prev => prev + batch.length);

          // Add delay between batches
          if (i < batches.length - 1) {
            const batchDelay = Math.min(
              INITIAL_BATCH_DELAY * Math.pow(1.5, Math.floor(i / 10)),
              MAX_BACKOFF_DELAY
            );
            await sleep(batchDelay);
          }
        }

        // Add longer delay between chunks
        if (chunkIndex < chunks.length - 1) {
          await sleep(CHUNK_DELAY);
        }
      }

      if (allFailedUploads.length > 0) {
        setError(`Failed to upload ${allFailedUploads.length} file(s): ${allFailedUploads.join(', ')}`);
      } else {
        onUploadComplete();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
      setFiles([]);
      setUploadProgress({});
      setCurrentBatch(0);
      setTotalBatches(0);
      setCurrentChunk(0);
      setTotalChunks(0);
      setRetryCount({});
      setProcessedFiles(0);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const fileList = Array.from(e.dataTransfer.files);
    
    const oversizedFiles = fileList.filter(file => file.size > MAX_TOTAL_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size limit of ${formatFileSize(MAX_TOTAL_FILE_SIZE)}: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    setFiles(prevFiles => [...prevFiles, ...fileList]);
    setError(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FiImage className="h-5 w-5 text-blue-500" />;
    if (file.type.includes('tiff') || file.type.includes('tif')) return <FiMap className="h-5 w-5 text-blue-500" />;
    return <FiFile className="h-5 w-5 text-blue-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getUploadButtonText = () => {
    if (!uploading) return 'Upload';
    if (totalChunks > 1) {
      return `Uploading Chunk ${currentChunk}/${totalChunks} (${processedFiles}/${files.length} files)`;
    }
    if (totalBatches > 0) {
      return `Uploading Batch ${currentBatch}/${totalBatches}...`;
    }
    return 'Uploading...';
  };

  // Update the file list display to show retry attempts
  const getFileStatus = (file: File) => {
    if (uploading) {
      const progress = uploadProgress[file.name];
      const retries = retryCount[file.name];
      if (progress === 100) return 'Completed';
      if (retries) return `Retry ${retries}/${MAX_RETRIES}`;
      if (progress !== undefined) return `${progress}%`;
      return 'Waiting...';
    }
    return '';
  };

  // Add upload progress summary
  const getUploadSummary = () => {
    if (!uploading) return null;
    return (
      <div className="mt-4 bg-blue-50 p-4 rounded-lg">
        <div className="text-sm text-blue-700">
          <div className="font-medium">Upload Progress</div>
          <div className="mt-1">
            {totalChunks > 1 ? (
              <>
                <div>Processing files in chunks of {CHUNK_SIZE}</div>
                <div>Current chunk: {currentChunk} of {totalChunks}</div>
                <div>Files processed: {processedFiles} of {files.length}</div>
              </>
            ) : (
              <div>Processing {files.length} files</div>
            )}
          </div>
        </div>
        <div className="mt-2 w-full bg-blue-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(processedFiles / files.length) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex-none flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Upload Files</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {getUploadSummary()}

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,.pdf,.csv,.xls,.xlsx,.tif,.tiff"
            />
            <FiUpload className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 text-center">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-700"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Maximum file size: {formatFileSize(MAX_TOTAL_FILE_SIZE)}
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {uploadProgress[file.name] !== undefined && (
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-500 w-20 text-right">
                          {getFileStatus(file)}
                        </div>
                        <div className="w-24">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className={`rounded-full h-2 transition-all duration-300 ${
                                retryCount[file.name] ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={uploading}
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-none px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={files.length === 0 || uploading}
            className={`px-4 py-2 rounded-md ${
              files.length === 0 || uploading
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            {uploading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {getUploadButtonText()}
              </span>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceUploadModal;
