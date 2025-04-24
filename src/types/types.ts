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
  icon: string | React.ReactNode; // Update to support both string paths and React nodes
  bgColor: string;
  textColor: string;
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

// Enhanced User interface with security considerations
export interface User {
  id: string;
  username: string;
  email: string;
  companyId: string;
  role?: string;
  emailDomain?: string;
  phoneNumber?: string;
  lastLoginAt?: string;
  passwordLastChangedAt?: string;
  mfaEnabled?: boolean;
  accountLocked?: boolean;
  loginAttempts?: number;
  requirePasswordChange?: boolean;
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

// Add security validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
  errorMessage?: string;
}

export interface SecurityConfig {
  passwordMinLength: number;
  passwordRequiresLowercase: boolean;
  passwordRequiresUppercase: boolean;
  passwordRequiresNumber: boolean;
  passwordRequiresSymbol: boolean;
  sessionTimeoutMinutes: number;
  mfaRequired: boolean;
  maxLoginAttempts: number;
}
