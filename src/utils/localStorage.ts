import { User, Tokens, AuthResponse } from '../types/auth';

/**
 * Store an item in localStorage as JSON
 */
export const setItem = (key: string, value: any): void => {
  try {
    const jsonValue = JSON.stringify(value);
    localStorage.setItem(key, jsonValue);
  } catch (error) {
  }
};

/**
 * Get an item from localStorage and parse as JSON with type safety
 */
export const getItem = <T>(key: string, defaultValue: T | null = null): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Get user data from localStorage with proper typing
 */
export const getUser = (): User | null => {
  return getItem<User>('user', null);
};

/**
 * Get tokens from localStorage with proper typing
 */
export const getTokens = (): Tokens | null => {
  return getItem<Tokens>('tokens', null);
};

/**
 * Remove an item from localStorage
 */
export const removeItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
  }
};

/**
 * Store authentication data in localStorage
 */
export const storeAuthData = (responseData: any): void => {
  // Parse the response if needed
  let parsedData = responseData;
  
  if (responseData.body && typeof responseData.body === 'string') {
    try {
      parsedData = JSON.parse(responseData.body);
    } catch (error) {
    }
  }
  
  // Store the raw/original response
  setItem('lastAuthResponse', responseData);
  
  // Store tokens if present
  if (parsedData.tokens) {
    setItem('tokens', parsedData.tokens);
    localStorage.setItem('idToken', parsedData.tokens.idToken);
    localStorage.setItem('accessToken', parsedData.tokens.accessToken);
    if (parsedData.tokens.refreshToken) {
      localStorage.setItem('refreshToken', parsedData.tokens.refreshToken);
    }
  }
  
  // Store user data if present
  if (parsedData.user) {
    setItem('user', parsedData.user);
  }
};

/**
 * Get authentication data from localStorage
 */
export const getAuthData = (): { user: User | null; tokens: Tokens | null; lastResponse: any } => {
  return {
    user: getUser(),
    tokens: getTokens(),
    lastResponse: getItem('lastAuthResponse')
  };
};

export default {
  setItem,
  getItem,
  getUser,
  getTokens,
  removeItem,
  storeAuthData,
  getAuthData
};
