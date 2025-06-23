# PilotForce Environment Setup Guide

This guide provides detailed instructions for setting up the environment variables and configuration for the PilotForce application.

## 📋 Prerequisites

Before setting up the environment, ensure you have:
- AWS Account with appropriate permissions
- Node.js 18+ installed
- AWS CLI configured
- Access to required third-party services

## 🔧 Environment Variables

### Create Environment File

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file** with your actual values

### Required Environment Variables

#### AWS Configuration
```env
# AWS Region
REACT_APP_AWS_REGION=eu-north-1

# Cognito User Pool Configuration
REACT_APP_USER_POOL_ID=eu-north-1_xxxxxxxxx
REACT_APP_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### API Configuration
```env
# API Gateway Endpoint
REACT_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod
```

#### Storage Configuration
```env
# S3 Bucket for file storage
REACT_APP_S3_BUCKET_NAME=pilotforce-app-production
```

#### External Services
```env
# Mapbox Configuration
REACT_APP_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Maps Configuration
REACT_APP_GOOGLE_MAPS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🏗️ AWS Services Setup

### 1. AWS Cognito User Pool

#### Create User Pool
```bash
aws cognito-idp create-user-pool \
  --pool-name PilotForceUserPool \
  --policies PasswordPolicy={MinimumLength=12,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true} \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OPTIONAL \
  --region eu-north-1
```

#### Create User Pool Client
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id eu-north-1_xxxxxxxxx \
  --client-name PilotForceWebClient \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --supported-identity-providers COGNITO \
  --callback-urls "http://localhost:3000/callback" "https://your-domain.com/callback" \
  --logout-urls "http://localhost:3000/logout" "https://your-domain.com/logout" \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes email openid profile \
  --allowed-o-auth-flows-user-pool-client \
  --region eu-north-1
```

### 2. S3 Bucket Setup

#### Create S3 Bucket
```bash
aws s3 mb s3://pilotforce-app-production --region eu-north-1
```

#### Configure CORS
```bash
aws s3api put-bucket-cors --bucket pilotforce-app-production --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
      "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

#### Configure Bucket Policy
```bash
aws s3api put-bucket-policy --bucket pilotforce-app-production --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pilotforce-app-production/*"
    }
  ]
}'
```

### 3. API Gateway Setup

#### Create API
```bash
aws apigateway create-rest-api \
  --name PilotForceAPI \
  --description "PilotForce API Gateway" \
  --region eu-north-1
```

#### Configure CORS
```bash
aws apigateway put-method-response \
  --rest-api-id xxxxxxxxxx \
  --resource-id xxxxxxxxxx \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Headers": true,
    "method.response.header.Access-Control-Allow-Methods": true,
    "method.response.header.Access-Control-Allow-Origin": true
  }'
```

## 🗺️ External Services Setup

### 1. Mapbox Configuration

1. **Create Mapbox Account**: Visit [Mapbox](https://www.mapbox.com/)
2. **Generate Access Token**: Go to Account > Access Tokens
3. **Set Token Permissions**: Ensure token has appropriate scopes
4. **Add Token to Environment**:
   ```env
   REACT_APP_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 2. Google Maps Configuration

1. **Create Google Cloud Project**: Visit [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable Maps JavaScript API**
3. **Create API Key**: Go to APIs & Services > Credentials
4. **Restrict API Key**: Set appropriate restrictions
5. **Add Key to Environment**:
   ```env
   REACT_APP_GOOGLE_MAPS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## 🔒 Security Configuration

### 1. Environment-specific Settings

#### Development
```env
REACT_APP_ENVIRONMENT=development
REACT_APP_LOG_LEVEL=debug
REACT_APP_ENABLE_DEBUG=true
REACT_APP_ENABLE_MOCK_DATA=true
```

#### Staging
```env
REACT_APP_ENVIRONMENT=staging
REACT_APP_LOG_LEVEL=info
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_ANALYTICS=false
```

#### Production
```env
REACT_APP_ENVIRONMENT=production
REACT_APP_LOG_LEVEL=error
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_ANALYTICS=true
```

### 2. Security Headers

Ensure CloudFront function is configured with security headers:
```javascript
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    
    headers['x-frame-options'] = {value: 'DENY'};
    headers['x-content-type-options'] = {value: 'nosniff'};
    headers['x-xss-protection'] = {value: '1; mode=block'};
    headers['strict-transport-security'] = {value: 'max-age=31536000; includeSubDomains; preload'};
    headers['content-security-policy'] = {value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://api.mapbox.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.mapbox.com https://maps.googleapis.com; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"};
    headers['referrer-policy'] = {value: 'strict-origin-when-cross-origin'};
    headers['permissions-policy'] = {value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), gamepad=(), keyboard-map=(), midi=(), navigation-override=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb-device=(), web-share=(), xr-spatial-tracking=()'};
    
    return response;
}
```

## 🧪 Testing Configuration

### 1. Local Development

```bash
# Start development server
npm start

# Verify environment variables
npm run verify-env

# Run tests
npm test
```

### 2. Environment Validation

Create a validation script:
```javascript
// scripts/validate-env.js
const requiredVars = [
  'REACT_APP_AWS_REGION',
  'REACT_APP_USER_POOL_ID',
  'REACT_APP_USER_POOL_WEB_CLIENT_ID',
  'REACT_APP_API_ENDPOINT',
  'REACT_APP_S3_BUCKET_NAME',
  'REACT_APP_MAPBOX_TOKEN'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

console.log('✅ All required environment variables are set');
```

### 3. Configuration Testing

```bash
# Test AWS connectivity
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://pilotforce-app-production/

# Test Cognito access
aws cognito-idp describe-user-pool --user-pool-id eu-north-1_xxxxxxxxx
```

## 🔄 Environment Management

### 1. Multiple Environments

Create environment-specific files:
```bash
.env.development
.env.staging
.env.production
```

### 2. Environment Switching

```bash
# Development
cp .env.development .env
npm start

# Staging
cp .env.staging .env
npm run build:staging

# Production
cp .env.production .env
npm run build:production
```

### 3. Secret Management

For production, use AWS Secrets Manager:
```bash
# Store secrets
aws secretsmanager create-secret \
  --name pilotforce/production/api-keys \
  --description "PilotForce Production API Keys" \
  --secret-string '{"MAPBOX_TOKEN":"pk.xxx","GOOGLE_MAPS_KEY":"xxx"}'

# Retrieve secrets
aws secretsmanager get-secret-value --secret-id pilotforce/production/api-keys
```

## 📊 Monitoring Configuration

### 1. CloudWatch Alarms

```bash
# Create application health alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "PilotForce-Health-Check" \
  --alarm-description "Monitor application health" \
  --metric-name HealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2
```

### 2. Logging Configuration

```bash
# Enable CloudTrail
aws cloudtrail create-trail \
  --name PilotForceTrail \
  --s3-bucket-name pilotforce-logs \
  --include-global-service-events
```

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**:
   ```bash
   # Restart development server
   npm start
   
   # Check .env file location
   ls -la .env
   ```

2. **AWS Credentials Issues**:
   ```bash
   # Configure AWS CLI
   aws configure
   
   # Test credentials
   aws sts get-caller-identity
   ```

3. **CORS Issues**:
   ```bash
   # Check S3 CORS configuration
   aws s3api get-bucket-cors --bucket pilotforce-app-production
   
   # Check API Gateway CORS
   aws apigateway get-method-response --rest-api-id xxx --resource-id xxx --http-method OPTIONS
   ```

### Validation Checklist

- [ ] All required environment variables set
- [ ] AWS services properly configured
- [ ] External API keys valid and restricted
- [ ] CORS policies configured
- [ ] Security headers implemented
- [ ] Monitoring and logging enabled
- [ ] Backup procedures in place

## 📞 Support

For environment setup issues:
1. Check this guide and documentation
2. Review AWS service status
3. Contact development team
4. Check external service status

---

**Environment Setup Guide Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: March 2024 