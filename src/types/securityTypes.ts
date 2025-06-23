/**
 * Security-related type definitions to support Cyber Essentials compliance
 */

// Types from security.ts
export interface CsrfToken {
  token: string;
  expires: number;
}

export interface SecureStorageItem {
  data: string; // Base64 encoded encrypted data
  iv: string;   // Base64 encoded initialization vector
  expires: number; // Expiration timestamp
}

export interface AuthResult {
  token: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  userId: string;
  username: string;
  userGroups?: string[];
}

export interface SecurityConfig {
  enforceHttps: boolean;
  sessionTimeoutMinutes: number;
  advancedSecurity: boolean;
  maxLoginAttempts: number;
}

// Original types from securityTypes.ts
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  success: boolean;
}

export type AccessLevel = 'none' | 'read' | 'write' | 'admin';

export interface Permission {
  resourceType: string;
  resourceId?: string; 
  accessLevel: AccessLevel;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigits: boolean;
    requireSpecialChars: boolean;
    preventPasswordReuse: number; // Number of previous passwords to check
    expiryDays: number; // Password expiration in days, 0 = never
  };
  sessionPolicy: {
    timeoutMinutes: number;
    maxConcurrentSessions: number;
    enforceIpBinding: boolean;
  };
  mfaPolicy: {
    required: boolean;
    allowedMethods: ('app' | 'sms' | 'email')[];
  };
  loginPolicy: {
    maxAttempts: number;
    lockoutDurationMinutes: number;
    allowRememberMe: boolean;
  };
}

export interface VulnerabilityReport {
  id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  affectedComponent: string;
  remediation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'wontfix';
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  ROLE_CHANGED = 'role_changed',
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  SETTINGS_CHANGED = 'settings_changed',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_DELETED = 'api_key_deleted'
}

export interface DataProtectionPolicy {
  dataRetentionDays: Record<string, number>;
  dataEncryptionEnabled: boolean;
  dataBackupFrequency: 'daily' | 'weekly' | 'monthly';
  personalDataCategories: string[];
  dataMaskingRules: Array<{
    fieldPattern: string;
    maskingStrategy: 'full' | 'partial' | 'pseudonymize';
  }>;
}
