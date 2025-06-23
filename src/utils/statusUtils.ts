/**
 * Utility functions for safely handling status strings
 */

/**
 * Safely converts a status string to lowercase
 * @param status - The status to convert to lowercase
 * @returns The lowercase status string or an empty string if status is null/undefined
 */
export const safeStatusToLowerCase = (status: any): string => {
  if (status === null || status === undefined || typeof status !== 'string') {
    return '';
  }
  return status.toLowerCase();
};

/**
 * Get color classes for different statuses
 * @param status - The status to get colors for
 * @returns CSS classes for the status
 */
export const getStatusColor = (status: any): string => {
  const statusLower = safeStatusToLowerCase(status);
  
  switch (statusLower) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in-progress':
    case 'inprogress':  // handle variations
      return 'bg-blue-100 text-blue-800';
    case 'scheduled':
      return 'bg-purple-100 text-purple-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
    case 'canceled':  // handle variations
      return 'bg-red-100 text-red-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get display text for different statuses
 * @param status - The status to get display text for
 * @returns Formatted display text for the status
 */
export const getStatusText = (status: any): string => {
  if (status === null || status === undefined || typeof status !== 'string') {
    return 'Unknown';
  }
  
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
    case 'inprogress':
      return 'In Progress';
    case 'scheduled':
      return 'Scheduled';
    case 'pending':
      return 'Pending';
    case 'cancelled':
    case 'canceled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
};