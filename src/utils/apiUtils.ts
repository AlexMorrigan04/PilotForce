import { AxiosRequestConfig } from 'axios';

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Request data validation
export const validateRequestData = (data: any, schema: any): { valid: boolean; errors?: string[] } => {
  // Simple validation example - expand based on your needs
  const errors: string[] = [];
  
  Object.keys(schema).forEach(field => {
    if (schema[field].required && !data[field]) {
      errors.push(`${field} is required`);
    }
    
    if (schema[field].type && typeof data[field] !== schema[field].type) {
      errors.push(`${field} must be of type ${schema[field].type}`);
    }
    
    if (schema[field].pattern && !schema[field].pattern.test(data[field])) {
      errors.push(`${field} has invalid format`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors: errors.length ? errors : undefined
  };
};

// Add auth token to requests
export const addAuthHeader = (config: AxiosRequestConfig): AxiosRequestConfig => {
  const token = localStorage.getItem('authToken');
  if (token) {
    const tokenData = JSON.parse(token);
    if (new Date().getTime() <= tokenData.expiry) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${tokenData.value}`
        }
      };
    }
    // Token expired, handle refresh or logout
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
  return config;
};

// Utility functions for API and image handling

// Image URL validation helper
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check for common image extensions
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
  const hasValidExtension = validExtensions.some(ext => 
    url.toLowerCase().endsWith(ext)
  );
  
  // Check for invalid file types
  const invalidFiles = ['.DS_Store', 'Thumbs.db', '.json', '.txt', '.pdf'];
  const hasInvalidFile = invalidFiles.some(file => 
    url.includes(file)
  );
  
  return hasValidExtension && !hasInvalidFile;
};

// Error logging for image loading failures
export const handleImageError = (
  url: string, 
  error?: Error, 
  component?: string
): void => {
  // Check for .DS_Store files which are not valid images
  if (url.includes('.DS_Store')) {
    console.warn(`Attempted to load .DS_Store file as image: ${url}`);
    // You may want to report this to your backend to fix the data
    reportInvalidImageToAPI(url, 'DS_STORE_FILE');
    return;
  }
  
  console.error(`Failed to load image: ${url}`, error);
  
  // Add structured logging for better tracking
  const logData = {
    timestamp: new Date().toISOString(),
    url,
    component: component || 'Unknown',
    errorMessage: error?.message || 'Unknown error',
    userAgent: navigator.userAgent,
  };
  
  // For development
  console.debug('Image error details:', logData);
};

// Report invalid images to backend API for cleanup
export const reportInvalidImageToAPI = (
  imageUrl: string, 
  reason: string
): void => {
  // Implementation depends on your API
  // Example: 
  // axios.post('/api/report-invalid-image', { imageUrl, reason })
  //   .catch(err => console.error('Failed to report invalid image', err));
  
  // For now, just log
  console.info(`Image reported as invalid: ${imageUrl}, Reason: ${reason}`);
};
