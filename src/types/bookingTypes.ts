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
  status: BookingStatus | string;
  userName: string;
  userEmail: string;
  userPhone: string;
  companyName: string;
  notes: string;
  address?: string;     // Added missing property
  time?: string;        // Added missing property 
  serviceOptions?: any;
  serviceType?: string;
  siteContact: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    isAvailableOnsite?: boolean;
  };
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
