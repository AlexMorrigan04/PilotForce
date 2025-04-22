export type BookingStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  BookingId: string;
  UserId: string;
  CompanyId: string;
  assetId: string;
  assetName: string;
  createdAt: string;
  flightDate: string;
  jobTypes: string[];
  jobType?: string;
  location: string;
  postcode?: string;    // Added for postcode information
  address?: string;     
  status: BookingStatus | string;
  userName: string;
  userEmail: string;
  userPhone: string;
  companyName: string;
  notes: string;
  time?: string;        
  serviceOptions?: any;
  serviceType?: string;
  siteContact: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    isAvailableOnsite?: boolean;
  };
  scheduling?: {
    scheduleType?: string;
    date?: string;
    timeSlot?: string;
    flexibility?: string;
    startDate?: string;
    endDate?: string;
    repeatFrequency?: string;
  };
  scheduleTime?: string; // Added for formatted time slot display
}

export interface BookingImage {
  id?: string;
  filename: string;
  s3Key: string;
  s3Url: string;
  uploadDate: string;
  userId: string;
  bookingId: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  fileType?: string;
}

export interface GeoTiffFile {
  id?: string;
  filename: string;
  s3Key: string;
  s3Url: string;
  uploadDate: string;
  userId: string;
  bookingId: string;
  size?: number;
}
