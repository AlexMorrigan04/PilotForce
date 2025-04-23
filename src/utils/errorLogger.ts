type ErrorLog = {
  message: string;
  stack?: string;
  context?: any;
  timestamp: string;
  userAgent: string;
  url: string;
};

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private readonly MAX_LOGS = 50;
  
  public logError(error: Error, context?: any): void {
    // Remove sensitive information
    const sanitizedContext = this.sanitizeData(context);
    
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      context: sanitizedContext,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.logs.push(errorLog);
    
    // Keep logs array at a reasonable size
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
    
    // In production, send to error logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorLog);
    } else {
    }
  }
  
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
    
    if (typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });
    
    return sanitized;
  }
  
  private sendToLoggingService(errorLog: ErrorLog): void {
    // Replace with your actual error logging service
    fetch('https://your-logging-service.com/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.REACT_APP_LOGGER_API_KEY || ''
      },
      body: JSON.stringify(errorLog)
    }).catch(err => console.error('Error sending to logging service:', err));
  }
  
  public getLogs(): ErrorLog[] {
    return [...this.logs];
  }
  
  public clearLogs(): void {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();
