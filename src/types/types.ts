export interface StatCardProps {
  count: string;
  label: string;
  icon: string;
  bgColor: string;
}

export interface InspectionCardProps extends Inspection {}

export interface ActionButtonProps {
  icon: string;
  label: string;
  bgColor: string;
  onClick?: () => void;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface Stat {
  count: string;
  label: string;
  icon: string;
  bgColor: string;
  textColor?: string;
}

export interface Inspection {
  imageUrl: string;
  address: string;
  date: string;
  imagesCount?: number;
  status: "completed" | "in progress" | "scheduled";
}

export interface QuickAction {
  icon: string;
  label: string;
  bgColor: string;
  onClick?: () => void;
}

export interface User {
  id: string;
  username: string;
  email: string;
  companyId: string;
  role?: string;
  emailDomain?: string;
  phoneNumber?: string; // Add phone number to the User interface
}

export interface Asset {
  id: string;
  userId: string;
  companyId?: string;
  name: string;
  description?: string;
  assetType: string;
  address?: string;
  postcode?: string; // Add postcode to the Asset interface
  coordinates: any;
  area?: number;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}
