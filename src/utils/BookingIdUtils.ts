/**
 * Utility functions for handling BookingId consistently across the application
 */

/**
 * Get the stored BookingId from localStorage
 */
export const getStoredBookingId = (): string | null => {
  return localStorage.getItem('selectedBookingId');
};

/**
 * Store a BookingId in localStorage
 */
export const storeBookingId = (bookingId: string): void => {
  if (bookingId) {
    localStorage.setItem('selectedBookingId', bookingId);
  }
};

/**
 * Clear the stored BookingId from localStorage
 */
export const clearStoredBookingId = (): void => {
  localStorage.removeItem('selectedBookingId');
};

/**
 * Generate the correct URL for viewing a booking's details
 */
export const getBookingDetailsUrl = (bookingId: string): string => {
  return `/flight-details/${bookingId}`;
};

/**
 * Extract BookingId from various possible sources
 * @param params URL parameters object
 * @param useLocalStorageFallback Whether to use localStorage as fallback
 */
export const extractBookingId = (
  params: Record<string, string | undefined>,
  useLocalStorageFallback = true
): string | null => {
  // Try from URL params (could be named id or bookingId)
  const urlBookingId = params.id || params.bookingId;
  
  // If found in URL, return it
  if (urlBookingId) {
    return urlBookingId;
  }
  
  // Check localStorage if fallback is enabled
  if (useLocalStorageFallback) {
    return getStoredBookingId();
  }
  
  return null;
};

export default {
  getStoredBookingId,
  storeBookingId,
  clearStoredBookingId,
  getBookingDetailsUrl,
  extractBookingId
};
