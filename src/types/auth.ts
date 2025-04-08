/**
 * Shared type definitions for authentication and user data
 */

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  companyId: string;
  role: string;
  phone_number?: string;
  [key: string]: any; // Allow for other properties
}

export interface Tokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  tokens?: Tokens;
  needsConfirmation?: boolean;
  [key: string]: any;
}
