type AuditLogType = 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PROFILE_UPDATE' | 'DATA_ACCESS' | 'ADMIN_ACTION';

type AuditLog = {
  type: AuditLogType;
  userId: string;
  action: string;
  details?: any;
  timestamp: string;
  ipAddress?: string;
  success: boolean;
};

export class SecurityAuditLogger {
  private logs: AuditLog[] = [];
  
  public logEvent(
    type: AuditLogType,
    userId: string,
    action: string,
    details?: any,
    success = true
  ): void {
    const auditLog: AuditLog = {
      type,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
      success
    };
    
    this.logs.push(auditLog);
    
    // In production, send to audit logging service or store in DynamoDB
    if (process.env.NODE_ENV === 'production') {
      this.saveAuditLog(auditLog);
    } else {
      console.info('Security audit:', auditLog);
    }
  }
  
  private async saveAuditLog(auditLog: AuditLog): Promise<void> {
    try {
      const AWS = await import('aws-sdk');
      const dynamoDb = new AWS.DynamoDB.DocumentClient();
      
      const params = {
        TableName: 'SecurityAuditLogs',
        Item: {
          UserId: auditLog.userId,
          Timestamp: auditLog.timestamp,
          Type: auditLog.type,
          Action: auditLog.action,
          Details: auditLog.details,
          Success: auditLog.success
        }
      };
      
      await dynamoDb.put(params).promise();
    } catch (error) {
      console.error('Error saving audit log:', error);
    }
  }
}

export const securityAuditLogger = new SecurityAuditLogger();
