# PilotForce Troubleshooting Guide

This guide provides solutions for common issues, debugging procedures, and support information for the PilotForce application.

## 🚨 Emergency Procedures

### Critical Issues

#### Application Down
1. **Check AWS Service Status**: Visit [AWS Health Dashboard](https://status.aws.amazon.com/)
2. **Verify CloudFront Distribution**: Check if distribution is enabled
3. **Check S3 Bucket**: Verify files are accessible
4. **Contact AWS Support**: If AWS services are affected

#### Security Breach
1. **Immediate Response**: Follow incident response procedures
2. **Isolate Affected Systems**: Disable compromised accounts
3. **Preserve Evidence**: Log all activities
4. **Notify Stakeholders**: Internal and external communications

## 🔍 Common Issues & Solutions

### Authentication Issues

#### Problem: User Cannot Login
**Symptoms:**
- Login page loads but authentication fails
- "Invalid credentials" error
- User account locked

**Diagnosis:**
```bash
# Check Cognito User Pool status
aws cognito-idp describe-user-pool --user-pool-id eu-north-1_xxxxxxxxx

# Check user account status
aws cognito-idp admin-get-user --user-pool-id eu-north-1_xxxxxxxxx --username user@example.com
```

**Solutions:**
1. **Reset Password**:
   ```bash
   aws cognito-idp admin-set-user-password \
     --user-pool-id eu-north-1_xxxxxxxxx \
     --username user@example.com \
     --password NewPassword123! \
     --permanent
   ```

2. **Unlock Account**:
   ```bash
   aws cognito-idp admin-set-user-password \
     --user-pool-id eu-north-1_xxxxxxxxx \
     --username user@example.com \
     --password NewPassword123! \
     --permanent
   ```

3. **Check MFA Status**:
   ```bash
   aws cognito-idp admin-get-user --user-pool-id eu-north-1_xxxxxxxxx --username user@example.com --query 'User.MFAOptions'
   ```

#### Problem: JWT Token Expired
**Symptoms:**
- 401 Unauthorized errors
- User redirected to login
- API calls failing

**Solutions:**
1. **Clear Browser Storage**:
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Check Token Expiry**:
   ```javascript
   // Decode JWT token
   const token = localStorage.getItem('idToken');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('Token expires:', new Date(payload.exp * 1000));
   ```

3. **Force Token Refresh**:
   ```javascript
   // Trigger Amplify token refresh
   import { Auth } from 'aws-amplify';
   await Auth.currentSession();
   ```

### File Upload Issues

#### Problem: File Upload Fails
**Symptoms:**
- Upload progress stuck
- "Upload failed" error
- File not appearing in system

**Diagnosis:**
```bash
# Check S3 bucket permissions
aws s3api get-bucket-policy --bucket pilotforce-app-production

# Check CORS configuration
aws s3api get-bucket-cors --bucket pilotforce-app-production
```

**Solutions:**
1. **Verify File Size Limits**:
   ```javascript
   // Check file size before upload
   const maxSize = 100 * 1024 * 1024; // 100MB
   if (file.size > maxSize) {
     alert('File too large. Maximum size is 100MB.');
   }
   ```

2. **Check File Type**:
   ```javascript
   // Validate file type
   const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/csv'];
   if (!allowedTypes.includes(file.type)) {
     alert('File type not supported.');
   }
   ```

3. **Network Issues**:
   ```javascript
   // Add retry logic
   const uploadWithRetry = async (file, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await uploadFile(file);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

### Map Loading Issues

#### Problem: Maps Not Loading
**Symptoms:**
- Blank map area
- "Map loading error" message
- Missing map tiles

**Diagnosis:**
```javascript
// Check API keys
console.log('Mapbox Token:', process.env.REACT_APP_MAPBOX_TOKEN);
console.log('Google Maps Key:', process.env.REACT_APP_GOOGLE_MAPS_API_KEY);

// Check network requests
// Open browser DevTools > Network tab
// Look for failed map tile requests
```

**Solutions:**
1. **Verify API Keys**:
   ```bash
   # Check environment variables
   echo $REACT_APP_MAPBOX_TOKEN
   echo $REACT_APP_GOOGLE_MAPS_API_KEY
   ```

2. **Check API Quotas**:
   - Visit Mapbox account dashboard
   - Check Google Cloud Console
   - Verify billing status

3. **Network Connectivity**:
   ```javascript
   // Test API connectivity
   fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/London.json?access_token=YOUR_TOKEN')
     .then(response => response.json())
     .then(data => console.log('Mapbox API working:', data))
     .catch(error => console.error('Mapbox API error:', error));
   ```

### Performance Issues

#### Problem: Slow Application Loading
**Symptoms:**
- Long initial load times
- Slow page transitions
- Unresponsive UI

**Diagnosis:**
```javascript
// Performance monitoring
console.time('app-load');
// ... app initialization
console.timeEnd('app-load');

// Bundle size analysis
npm install --save-dev webpack-bundle-analyzer
npx webpack-bundle-analyzer build/static/js/*.js
```

**Solutions:**
1. **Code Splitting**:
   ```javascript
   // Implement lazy loading
   const Dashboard = React.lazy(() => import('./pages/Dashboard'));
   const Assets = React.lazy(() => import('./pages/Assets'));
   ```

2. **Image Optimization**:
   ```javascript
   // Use WebP format and lazy loading
   <img 
     src="image.webp" 
     loading="lazy"
     alt="Description"
   />
   ```

3. **Caching Strategy**:
   ```javascript
   // Implement service worker for caching
   // Add cache headers in CloudFront
   ```

#### Problem: Memory Leaks
**Symptoms:**
- Application becomes slower over time
- Browser memory usage increases
- Crashes after extended use

**Diagnosis:**
```javascript
// Memory leak detection
const memoryUsage = performance.memory;
console.log('Memory usage:', memoryUsage);

// Check for event listener leaks
// Use React DevTools Profiler
```

**Solutions:**
1. **Cleanup Event Listeners**:
   ```javascript
   useEffect(() => {
     const handleResize = () => {
       // Handle resize
     };
     window.addEventListener('resize', handleResize);
     
     return () => {
       window.removeEventListener('resize', handleResize);
     };
   }, []);
   ```

2. **Component Cleanup**:
   ```javascript
   useEffect(() => {
     let isMounted = true;
     
     const fetchData = async () => {
       const data = await api.getData();
       if (isMounted) {
         setData(data);
       }
     };
     
     fetchData();
     
     return () => {
       isMounted = false;
     };
   }, []);
   ```

## 🛠️ Debugging Procedures

### Browser Debugging

#### Enable Debug Mode
```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');

// Enable verbose logging
localStorage.setItem('verbose', 'true');
```

#### Network Debugging
```javascript
// Monitor API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('API Call:', args);
  return originalFetch.apply(this, args);
};

// Monitor WebSocket connections
const originalWebSocket = window.WebSocket;
window.WebSocket = function(...args) {
  console.log('WebSocket:', args);
  return new originalWebSocket(...args);
};
```

#### React Debugging
```javascript
// Enable React DevTools
// Install React Developer Tools browser extension

// Debug component re-renders
const useRenderCount = (componentName) => {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`${componentName} rendered ${renderCount.current} times`);
};
```

### AWS Service Debugging

#### CloudWatch Logs
```bash
# View Lambda function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/pilotforce"

# Get recent log events
aws logs get-log-events \
  --log-group-name "/aws/lambda/pilotforce-api" \
  --log-stream-name "2024/01/15/[$LATEST]abc123" \
  --start-time 1642233600000
```

#### CloudFront Debugging
```bash
# Check distribution status
aws cloudfront get-distribution --id ECLP9E2XI47O0

# View cache statistics
aws cloudfront get-distribution-stats --id ECLP9E2XI47O0

# Create cache invalidation
aws cloudfront create-invalidation \
  --distribution-id ECLP9E2XI47O0 \
  --paths "/*"
```

#### S3 Debugging
```bash
# Check bucket contents
aws s3 ls s3://pilotforce-app-production/ --recursive

# Test bucket access
aws s3 cp test.txt s3://pilotforce-app-production/test.txt

# Check bucket policy
aws s3api get-bucket-policy --bucket pilotforce-app-production
```

### Database Debugging

#### Connection Issues
```bash
# Test database connectivity
mysql -h your-rds-endpoint -u username -p

# Check connection pool
SHOW PROCESSLIST;

# Monitor slow queries
SHOW VARIABLES LIKE 'slow_query_log';
```

#### Performance Issues
```sql
-- Find slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Check table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'pilotforce'
ORDER BY (data_length + index_length) DESC;
```

## 📊 Monitoring & Alerts

### Health Checks
```javascript
// Application health check
const healthCheck = async () => {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('Application healthy');
    } else {
      console.error('Application unhealthy:', data);
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
};

// Run health check every 5 minutes
setInterval(healthCheck, 5 * 60 * 1000);
```

### Error Tracking
```javascript
// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Send to error tracking service
  if (window.Sentry) {
    window.Sentry.captureException(event.error);
  }
});

// Unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  if (window.Sentry) {
    window.Sentry.captureException(event.reason);
  }
});
```

### Performance Monitoring
```javascript
// Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Check application health
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Verify backup completion

#### Weekly
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Clean up old files
- [ ] Performance analysis

#### Monthly
- [ ] Security audit
- [ ] Database optimization
- [ ] SSL certificate renewal
- [ ] User access review

### Backup Procedures
```bash
# Database backup
mysqldump -h your-rds-endpoint -u username -p pilotforce > backup_$(date +%Y%m%d).sql

# S3 backup
aws s3 sync s3://pilotforce-app-production s3://pilotforce-backups/$(date +%Y%m%d)/

# Configuration backup
aws s3 cp s3://pilotforce-config/config.json ./backups/config_$(date +%Y%m%d).json
```

### Update Procedures
```bash
# Application update
git pull origin main
npm install
npm run build
aws s3 sync build/ s3://pilotforce-app-production --delete
aws cloudfront create-invalidation --distribution-id ECLP9E2XI47O0 --paths "/*"

# Database migration
npm run migrate

# Dependency updates
npm audit fix
npm update
```

## 📞 Support Information

### Internal Support
- **Development Team**: dev@pilotforce.com
- **DevOps Team**: devops@pilotforce.com
- **Security Team**: security@pilotforce.com

### External Support
- **AWS Support**: aws-support@amazon.com
- **Mapbox Support**: support@mapbox.com
- **Google Cloud Support**: cloud-support@google.com

### Escalation Procedures
1. **Level 1**: Development team (24/7)
2. **Level 2**: DevOps team (business hours)
3. **Level 3**: External vendors (as needed)

### Communication Channels
- **Slack**: #pilotforce-support
- **Email**: support@pilotforce.com
- **Phone**: +44 20 1234 5678 (emergency only)

## 📚 Additional Resources

### Documentation
- [AWS Documentation](https://docs.aws.amazon.com/)
- [React Documentation](https://reactjs.org/docs/)
- [Mapbox Documentation](https://docs.mapbox.com/)

### Tools
- **AWS CLI**: Command line interface for AWS
- **React DevTools**: Browser extension for React debugging
- **Postman**: API testing tool
- **Chrome DevTools**: Browser debugging tools

### Training
- **AWS Training**: Free online courses
- **React Training**: Official React tutorials
- **Security Training**: OWASP resources

---

**Troubleshooting Guide Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: March 2024 