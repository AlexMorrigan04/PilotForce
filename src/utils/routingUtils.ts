import { useParams, useLocation } from 'react-router-dom';

/**
 * Custom hook to safely extract booking ID from URL parameters
 * Handles multiple possible parameter names
 */
export const useBookingId = () => {
  const params = useParams();
  const location = useLocation();
  
  // Try to extract ID from URL parameters (multiple possible names)
  let bookingId = params.id || params.bookingId;
  
  // If not found in URL params, try query params
  if (!bookingId) {
    const searchParams = new URLSearchParams(location.search);
    bookingId = searchParams.get('id') || searchParams.get('bookingId') || undefined;
  }
  
  // If still not found, try to extract from pathname
  if (!bookingId) {
    const pathnameParts = location.pathname.split('/');
    const lastPart = pathnameParts[pathnameParts.length - 1];
    
    // Check if last part looks like an ID (not a route name)
    if (lastPart && !lastPart.includes('flight-details') && !lastPart.includes('bookings')) {
      bookingId = lastPart;
    }
  }
  
  return {
    bookingId,
    params,
    pathname: location.pathname,
    search: location.search
  };
};

/**
 * Utility to generate proper booking detail URLs
 */
export const getBookingDetailUrl = (bookingId: string) => {
  if (!bookingId) return '/my-bookings';
  return `/flight-details/${bookingId}`;
};

export default {
  useBookingId,
  getBookingDetailUrl
};
