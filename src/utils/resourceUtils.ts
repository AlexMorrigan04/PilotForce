/**
 * Utility functions for working with resources and files
 */

/**
 * Extracts useful information from a resource name/filename
 */
export function analyzeResourceName(filename: string): {
  isChunk: boolean;
  baseName?: string;
  partNumber?: number;
  originalFileName?: string;
  resourceIdPattern?: string;
  extension?: string;
} {
  const result = {
    isChunk: false,
    baseName: undefined as string | undefined,
    partNumber: undefined as number | undefined,
    originalFileName: undefined as string | undefined,
    resourceIdPattern: undefined as string | undefined,
    extension: undefined as string | undefined
  };
  
  if (!filename) return result;
  
  // Extract file extension
  const extensionMatch = filename.match(/\.([^.]+)$/);
  if (extensionMatch) {
    result.extension = extensionMatch[1].toLowerCase();
  }
  
  // Check for the specific pattern seen in logs:
  // resource_1744387026560_470a236d_part8_Richmond-Terrace-07-08-2022-orthophoto_2_.tif
  const match = filename.match(/^(resource_\d+_[a-zA-Z0-9]+)_part(\d+)_(.+)$/);
  if (match) {
    result.isChunk = true;
    result.baseName = match[1];
    result.partNumber = parseInt(match[2], 10);
    result.originalFileName = match[3];
    result.resourceIdPattern = match[1] + "_part*_" + match[3];
    return result;
  }
  
  // Other chunk patterns
  const altMatch = filename.match(/^(.+)_part(\d+)_(.+)$/);
  if (altMatch) {
    result.isChunk = true;
    result.baseName = altMatch[1];
    result.partNumber = parseInt(altMatch[2], 10);
    result.originalFileName = altMatch[3];
  }
  
  return result;
}

/**
 * Returns the content type based on file extension
 */
export function getContentTypeFromExtension(extension: string): string {
  const extensionLower = extension.toLowerCase();
  
  switch (extensionLower) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'tif':
    case 'tiff':
      return 'image/tiff';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Check if a file is an image based on its name or content type
 */
export function isImageFile(filename: string | undefined, contentType?: string): boolean {
  if (!filename && !contentType) return false;
  
  // Check content type first
  if (contentType) {
    return contentType.startsWith('image/');
  }
  
  // Then check file extension
  if (filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    return !!extension && ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif', 'webp', 'bmp', 'svg'].includes(extension);
  }
  
  return false;
}

export default {
  analyzeResourceName,
  getContentTypeFromExtension,
  formatFileSize,
  isImageFile
};
