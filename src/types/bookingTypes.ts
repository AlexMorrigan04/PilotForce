export type BookingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'pending';

export interface Booking {
  id: string;
  BookingId?: string; // Some bookings use BookingId instead of id
  UserId: string;
  jobType?: string;
  jobName?: string;
  serviceType?: string;
  assetName?: string;
  companyName?: string;
  address?: string;
  flightDate?: string;
  dateTime?: string;
  location?: string;
  status: BookingStatus;
  notes?: string;
  createdAt?: string;
  images?: string[];
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  propertyType?: string;
  propertySize?: string;
  time?: string;
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
