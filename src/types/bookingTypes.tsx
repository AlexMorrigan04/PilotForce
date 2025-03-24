export type BookingStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  BookingId?: string;
  UserId?: string;
  CompanyId?: string;
  userId?: string;
  jobName?: string;
  companyName?: string;
  assetName?: string;
  flightDate?: string;
  dateFlexibility?: string;
  repeat?: string;
  repeatFrequency?: string;
  location?: string;
  siteContact?: string;
  siteContactNumber?: string;
  notes?: string;
  inspectionOptions?: string;
  inspectionDetail?: string;
  surveyType?: string;
  surveyDetail?: string;
  thermalType?: string;
  mediaOptions?: string;
  status: BookingStatus;
  time?: string;
  dateTime?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  serviceType?: string;
  address?: string;
  propertyType?: string;
  images?: string[];
  createdAt?: string;
}