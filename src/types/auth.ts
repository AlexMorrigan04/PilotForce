// Auth-related types shared across the application

export interface User {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  Name?: string;  // Adding support for uppercase Name property for Cognito
  role?: string;
  isAdmin?: boolean;
  companyId?: string;
  [key: string]: any;
}

export interface Tokens {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  tokens?: Tokens;
  needsConfirmation?: boolean;
  isSignUpComplete?: boolean;
  userId?: string;
  nextStep?: any;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: { message: string } | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userRole: string;
  login: (username: string, password: string) => Promise<any>;
  signup: (username: string, password: string, email: string, companyId: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  confirmUser: (username: string, code: string) => Promise<any>;
  resendConfirmationCode: (username: string) => Promise<any>;
  signIn: (username: string, password: string) => Promise<any>;
  signUp: (username: string, password: string, attributes: Record<string, string>) => Promise<any>;
  confirmSignUp: (username: string, code: string) => Promise<any>;
  checkAdminStatus: () => Promise<boolean>;
  initiateGoogleLogin: () => Promise<boolean>;
  handleGoogleRedirect: (url: string) => Promise<AuthResponse>;
  isGoogleAuthenticated: () => Promise<boolean>;
  handleOAuthCallback: (code: string) => Promise<AuthResponse>;
}
