export interface User {
  id?: string;
  UserId?: string;
  sub?: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  companyId?: string;
  phoneNumber?: string;
  enabled?: boolean;
  createdAt?: string;
  userRole?: string;
  status?: string;
  userAccess?: boolean;
  approvalStatus?: string;
}

export interface CompanyUser {
  UserId?: string;
  id?: string;
  username?: string; // Add lowercase username
  Username?: string; // Add uppercase Username
  email?: string;
  Email?: string;
  companyId?: string;
  CompanyId?: string;
  name?: string;
  Name?: string;
  userRole?: string;
  UserRole?: string;
  role?: string;
  Role?: string;
  status?: string;
  Status?: string;
  phoneNumber?: string;
  PhoneNumber?: string;
  enabled?: boolean;
  Enabled?: boolean;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string;
  UpdatedAt?: string;
  userAccess?: boolean;
  UserAccess?: boolean;
  approvalStatus?: string;
  ApprovalStatus?: string;
}
