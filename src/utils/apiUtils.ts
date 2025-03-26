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
