export interface Booking {
  id: string;
  BookingId: string;
  title?: string;
  description?: string;
  status: string;
  userId: string;
  UserId: string;
  companyId: string;
  CompanyId: string;
  username: string;
  userEmail: string;
  companyName: string;
  date: string;
  time?: string;
  location: string;
  assetId?: string;
  assetName?: string;
  type?: string;
  details?: string;
  notes?: string;
  flightDate: string;
  jobTypes: Array<string | { S: string }>;
  serviceOptions?: any;
  siteContact?: any;
  scheduling?: {
    scheduleType: string;
    timeSlot: string;
    date?: string;
  };
  createdAt: string;
  updatedAt: string;
  quote?: { amount: number; currency: string };
  priority?: number;
} 