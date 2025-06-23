import { callApiGateway } from './apiGatewayHelper';
import config from './environmentConfig';
import { API_BASE_URL } from '../config';
import secureLogger from './secureLogger';

type AuditLogType = 
  | 'AUTHENTICATION'  // Login attempts (success/failure)
  | 'ACCESS_DENIED'   // Failed access attempts
  | 'SYSTEM_ERROR'    // System errors
  | 'SECURITY_EVENT'  // Security-related events
  | 'ADMIN_ACTION'    // Administrative actions
  | 'PERMISSION_CHANGE' // Changes to user permissions
  | 'SECURITY_CONFIG_CHANGE'; // Changes to security settings

type AuditLog = {
  type: AuditLogType;
  userId: string;
  action: string;
  details?: any;
  timestamp: string;
  ipAddress?: string;
  success: boolean;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

export class SecurityAuditLogger {
  private readonly tableName = 'SecurityAuditLogs';
  
  constructor() {
    secureLogger.info('SecurityAuditLogger: Initializing instance');
  }
  
  public logEvent(
    type: AuditLogType,
    userId: string,
    action: string,
    details?: any,
    timestamp: string | undefined = undefined,
    ipAddress: string | undefined = undefined,
    success: boolean = true,
    userAgent: string | undefined = undefined,
    resourceType: string | undefined = undefined,
    resourceId: string | undefined = undefined,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  ): void {
    secureLogger.info('SecurityAuditLogger: Attempting to log event:', {
      type,
      userId,
      action,
      success,
      severity
    });

    // Only log if it's a security-relevant event or an error
    if (this.shouldLogEvent(type, severity, success)) {
      secureLogger.info('SecurityAuditLogger: Event passed shouldLogEvent check');
      
      const auditLog: AuditLog = {
        type,
        userId,
        action,
        details,
        timestamp: timestamp || new Date().toISOString(),
        ipAddress: ipAddress || this.getClientIP(),
        success,
        userAgent: userAgent || this.getUserAgent(),
        resourceType,
        resourceId,
        severity
      };
      
      secureLogger.info('SecurityAuditLogger: Prepared audit log:', auditLog);
      
      // Always try to save the audit log
      this.saveAuditLog(auditLog).catch(error => {
        secureLogger.error('SecurityAuditLogger: Failed to save audit log:', error);
      });
    } else {
      secureLogger.info('SecurityAuditLogger: Event filtered out by shouldLogEvent check');
    }
  }

  private shouldLogEvent(
    type: AuditLogType,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    success: boolean
  ): boolean {
    secureLogger.info('SecurityAuditLogger: Checking if event should be logged:', {
      type,
      severity,
      success
    });

    // Always log authentication events and failures
    const shouldLog = (
      type === 'AUTHENTICATION' ||  // Always log auth events
      !success ||                   // Always log failures
      type === 'ACCESS_DENIED' ||
      type === 'SYSTEM_ERROR' ||
      severity === 'HIGH' ||
      severity === 'CRITICAL' ||
      type === 'ADMIN_ACTION' ||
      type === 'PERMISSION_CHANGE' ||
      type === 'SECURITY_CONFIG_CHANGE'
    );

    secureLogger.info('SecurityAuditLogger: Should log event:', shouldLog);
    return shouldLog;
  }
  
  private async saveAuditLog(auditLog: AuditLog): Promise<void> {
    try {
      // Always log to console first
      secureLogger.info('SecurityAuditLogger: Logging event:', auditLog);
      
      // Use the full API Gateway URL
      const apiUrl = `${API_BASE_URL}/security/log`;
      secureLogger.info('SecurityAuditLogger: Using API URL:', apiUrl);
      
      // For pre-authentication events, we need to handle them differently
      const isPreAuth = !localStorage.getItem('idToken') && !localStorage.getItem('tokens');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': window.location.origin
      };

      if (!isPreAuth) {
        const idToken = localStorage.getItem('idToken');
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(auditLog),
        mode: 'cors',
        credentials: 'same-origin'
      });
      
      // Check if the response is OK before proceeding
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Failed to save audit log: ${response.status} ${response.statusText}`;
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage += ` - ${JSON.stringify(errorData)}`;
          } else {
            const errorText = await response.text();
            errorMessage += ` - ${errorText}`;
          }
        } catch (e) {
          secureLogger.error('SecurityAuditLogger: Error reading error response:', e);
        }
        
        secureLogger.error('SecurityAuditLogger: API Error:', errorMessage);
        return; // Don't throw, just log and return
      }
      
      // Check content type before trying to parse JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const responseData = await response.json();
          secureLogger.info('SecurityAuditLogger: API Success response:', responseData);
        } catch (jsonError) {
          secureLogger.error('SecurityAuditLogger: Failed to parse JSON response:', jsonError);
          // Don't throw, just log the error
        }
      } else {
        secureLogger.warn('SecurityAuditLogger: Received non-JSON response:', contentType);
        // Try to read the response as text for debugging
        try {
          const text = await response.text();
          secureLogger.info('SecurityAuditLogger: Response text:', text);
        } catch (e) {
          secureLogger.error('SecurityAuditLogger: Failed to read response text:', e);
        }
      }
    } catch (error) {
      secureLogger.error('SecurityAuditLogger: Error in saveAuditLog:', error);
      // Always show full error details
      secureLogger.error('SecurityAuditLogger: Full error details:', error);
      if (error instanceof Error) {
        secureLogger.error('SecurityAuditLogger: Stack trace:', error.stack);
      }
      // Don't throw the error, just log it
    }
  }

  private getClientIP(): string | undefined {
    // Try to get IP from request headers
    const forwardedFor = window.location.hostname;
    const xForwardedFor = document.referrer;
    
    // Return the first available IP
    return forwardedFor || xForwardedFor || undefined;
  }

  private getUserAgent(): string | undefined {
    // Get user agent from browser
    return navigator.userAgent || undefined;
  }

  private getUserId(): string {
    try {
      const idToken = localStorage.getItem('idToken');
      if (idToken) {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          // Use sub (subject) as the user ID, fallback to email if not available
          return payload.sub || payload.email || 'unknown';
        }
      }
    } catch (e) {
      secureLogger.error('SecurityAuditLogger: Error extracting user ID from token:', e);
    }
    return 'unknown';
  }

  // Convenience methods for common audit events
  public logAuthentication(userId: string, success: boolean, details?: any): void {
    secureLogger.info('SecurityAuditLogger: logAuthentication called:', {
      userId,
      success,
      details
    });

    const actualUserId = this.getUserId();
    const resourceId = userId; // Keep the email as resourceId for reference

    // Determine severity based on context
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    
    // Check if this is an SSO flow event
    const isSsoFlow = details?.provider === 'google' || details?.provider === 'microsoft' || 
                     details?.flow === 'sso' || details?.isSSO;
    
    // Check if this is a failed attempt
    if (!success) {
      if (userId === 'unknown' || userId === 'pending') {
        // Initial SSO flow events should be LOW severity
        if (isSsoFlow) {
          severity = 'LOW';
        } else {
          // Non-SSO unknown user attempts are MEDIUM
          severity = 'MEDIUM';
        }
      } else {
        // Failed attempts for known users are HIGH unless it's part of SSO flow
        severity = isSsoFlow ? 'LOW' : 'HIGH';
      }
    } else {
      // Successful authentications are LOW unless suspicious
      severity = details?.suspicious ? 'HIGH' : 'LOW';
    }

    // Add SSO flow flag to details if detected
    const enhancedDetails = {
      ...details,
      isSSO: isSsoFlow
    };

    this.logEvent(
      'AUTHENTICATION',
      actualUserId,
      isSsoFlow ? 'SSO authentication attempt' : 'User authentication attempt',
      enhancedDetails,
      new Date().toISOString(),
      this.getClientIP(),
      success,
      this.getUserAgent(),
      'auth',
      resourceId,
      severity
    );

    secureLogger.info('SecurityAuditLogger: logAuthentication completed');
  }

  public logAccessDenied(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    details?: any
  ): void {
    this.logEvent(
      'ACCESS_DENIED',
      userId,
      action,
      details,
      undefined,
      undefined,
      false,
      undefined,
      resourceType,
      resourceId,
      'HIGH'
    );
  }

  public logSystemError(
    userId: string,
    action: string,
    details?: any
  ): void {
    this.logEvent(
      'SYSTEM_ERROR',
      userId,
      action,
      details,
      undefined,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      'HIGH'
    );
  }

  public logAdminAction(
    userId: string,
    action: string,
    details?: any,
    success = true
  ): void {
    this.logEvent(
      'ADMIN_ACTION',
      userId,
      action,
      details,
      undefined,
      undefined,
      success,
      undefined,
      undefined,
      undefined,
      'HIGH'
    );
  }

  public logPermissionChange(
    userId: string,
    targetUserId: string,
    action: string,
    details?: any,
    success = true
  ): void {
    this.logEvent(
      'PERMISSION_CHANGE',
      userId,
      action,
      { targetUserId, ...details },
      undefined,
      undefined,
      success,
      undefined,
      undefined,
      undefined,
      'HIGH'
    );
  }

  public logSecurityConfigChange(
    userId: string,
    action: string,
    details?: any,
    success = true
  ): void {
    this.logEvent(
      'SECURITY_CONFIG_CHANGE',
      userId,
      action,
      details,
      undefined,
      undefined,
      success,
      undefined,
      undefined,
      undefined,
      'HIGH'
    );
  }

  public logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    success: boolean,
    details?: any
  ): void {
    this.logEvent(
      'SECURITY_EVENT',
      userId,
      action,
      details,
      undefined,
      undefined,
      success,
      undefined,
      resourceType,
      resourceId,
      success ? 'LOW' : 'HIGH'
    );
  }
}

secureLogger.info('SecurityAuditLogger: Creating singleton instance');
export const securityAuditLogger = new SecurityAuditLogger();
// Ensure it's the default export as well for compatibility
export default securityAuditLogger;
