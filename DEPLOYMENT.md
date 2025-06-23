# PilotForce Deployment Guide

This guide covers the complete deployment process for the PilotForce application to production environments.

## 🎯 Overview

PilotForce is deployed as a static web application using AWS services:
- **Frontend**: React SPA hosted on S3 with CloudFront CDN
- **Backend**: AWS Lambda functions with API Gateway
- **Database**: Amazon RDS (MySQL/PostgreSQL)
- **Authentication**: AWS Cognito
- **Storage**: Amazon S3 for file storage
- **Security**: AWS WAF and CloudFront security headers

## 📋 Prerequisites

### Required AWS Services
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- Domain name (optional but recommended)

### Required Tools
- Node.js 18+ and npm/yarn
- AWS CLI v2+
- Git

## 🏗️ Infrastructure Setup

### 1. AWS S3 Bucket Setup

```bash
# Create S3 bucket for static hosting
aws s3 mb s3://pilotforce-app-production --region eu-north-1

# Enable static website hosting
aws s3 website s3://pilotforce-app-production --index-document index.html --error-document index.html

# Configure bucket policy for public read access
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

### 2. CloudFront Distribution

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

Example `cloudfront-config.json`:
```json
{
  "CallerReference": "pilotforce-app-production",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-PilotForce-App",
        "DomainName": "pilotforce-app-production.s3.eu-north-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "E3IGF46622X2RQ"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-PilotForce-App",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["HEAD", "GET"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["HEAD", "GET"]
      }
    },
    "Compress": true,
    "FunctionAssociations": {
      "Quantity": 1,
      "Items": [
        {
          "EventType": "viewer-response",
          "FunctionARN": "arn:aws:cloudfront::ACCOUNT:function/PilotForceSecurityHeaders"
        }
      ]
    }
  },
  "Enabled": true,
  "PriceClass": "PriceClass_All",
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true,
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
```

### 3. AWS WAF Setup

```bash
# Create WAF Web ACL for rate limiting
aws wafv2 create-web-acl \
  --name PilotForceRateLimitACL \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules '[
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 1000,
          "EvaluationWindowSec": 300,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitRule"
      }
    }
  ]' \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=PilotForceRateLimitACL \
  --region us-east-1
```

### 4. CloudFront Security Function

Create `security-headers-function.js`:
```javascript
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    
    // Add security headers
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

Deploy the function:
```bash
aws cloudfront create-function \
  --name PilotForceSecurityHeaders \
  --function-config Comment="Add security headers to PilotForce app",Runtime="cloudfront-js-2.0" \
  --function-code fileb://security-headers-function.js \
  --region us-east-1

aws cloudfront publish-function \
  --name PilotForceSecurityHeaders \
  --if-match ETAG \
  --region us-east-1
```

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production`:
```env
# AWS Configuration
REACT_APP_AWS_REGION=eu-north-1
REACT_APP_USER_POOL_ID=eu-north-1_xxxxxxxxx
REACT_APP_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# API Configuration
REACT_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod

# Storage Configuration
REACT_APP_S3_BUCKET_NAME=pilotforce-app-production

# External Services
REACT_APP_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_GOOGLE_MAPS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_DEBUG=false
```

### Build Configuration

Update `package.json` scripts:
```json
{
  "scripts": {
    "build:prod": "GENERATE_SOURCEMAP=false react-app-rewired build",
    "deploy:prod": "npm run build:prod && aws s3 sync build/ s3://pilotforce-app-production --delete && aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths '/*'"
  }
}
```

## 🚀 Deployment Process

### 1. Pre-deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Environment variables configured
- [ ] AWS credentials configured
- [ ] S3 bucket created and configured
- [ ] CloudFront distribution created
- [ ] WAF rules configured
- [ ] Security headers function deployed

### 2. Build and Deploy

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Build for production
npm run build:prod

# Deploy to S3
aws s3 sync build/ s3://pilotforce-app-production --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ECLP9E2XI47O0 \
  --paths "/*"
```

### 3. Post-deployment Verification

```bash
# Check deployment status
aws s3 ls s3://pilotforce-app-production/

# Verify CloudFront distribution
aws cloudfront get-distribution --id ECLP9E2XI47O0

# Test application accessibility
curl -I https://d291plyoifbxo0.cloudfront.net/
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: eu-north-1
  S3_BUCKET: pilotforce-app-production
  CLOUDFRONT_DISTRIBUTION_ID: ECLP9E2XI47O0

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:prod
      - uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: build/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: build-files
          path: build/
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Deploy to S3
        run: aws s3 sync build/ s3://${{ env.S3_BUCKET }} --delete
      
      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
      
      - name: Deploy to CloudFront
        run: |
          aws cloudfront wait invalidation-completed \
            --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} \
            --id $(aws cloudfront list-invalidations --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} --query 'InvalidationList.Items[0].Id' --output text)
```

### Required Secrets

Configure these secrets in GitHub:
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

## 🔒 Security Configuration

### SSL/TLS Certificate

For custom domains, use AWS Certificate Manager:
```bash
# Request certificate
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names "*.your-domain.com" \
  --validation-method DNS \
  --region us-east-1
```

### CORS Configuration

Configure S3 CORS policy:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["https://your-domain.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## 📊 Monitoring and Logging

### CloudWatch Alarms

```bash
# Create CloudWatch alarm for 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name PilotForce-5xx-Errors \
  --alarm-description "Alarm for 5xx errors" \
  --metric-name 5xxError \
  --namespace AWS/CloudFront \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### Application Monitoring

- **Frontend**: Google Analytics, Sentry for error tracking
- **Backend**: CloudWatch Logs, X-Ray for tracing
- **Infrastructure**: CloudWatch Metrics, AWS Health Dashboard

## 🔄 Rollback Strategy

### Quick Rollback

```bash
# Revert to previous deployment
aws s3 sync s3://pilotforce-app-production/backup/previous/ s3://pilotforce-app-production/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id ECLP9E2XI47O0 --paths "/*"
```

### Automated Rollback

Add to CI/CD pipeline:
```yaml
- name: Create backup
  run: aws s3 sync s3://${{ env.S3_BUCKET }}/ s3://${{ env.S3_BUCKET }}/backup/$(date +%Y%m%d-%H%M%S)/

- name: Rollback on failure
  if: failure()
  run: |
    LATEST_BACKUP=$(aws s3 ls s3://${{ env.S3_BUCKET }}/backup/ | tail -1 | awk '{print $2}')
    aws s3 sync s3://${{ env.S3_BUCKET }}/backup/$LATEST_BACKUP s3://${{ env.S3_BUCKET }}/ --delete
```

## 🐛 Troubleshooting

### Common Deployment Issues

1. **Build Failures**:
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build:prod
   ```

2. **S3 Sync Issues**:
   ```bash
   # Check bucket permissions
   aws s3 ls s3://pilotforce-app-production/
   
   # Force sync with delete
   aws s3 sync build/ s3://pilotforce-app-production/ --delete --force
   ```

3. **CloudFront Issues**:
   ```bash
   # Check distribution status
   aws cloudfront get-distribution --id ECLP9E2XI47O0
   
   # Force invalidation
   aws cloudfront create-invalidation --distribution-id ECLP9E2XI47O0 --paths "/*"
   ```

### Performance Optimization

1. **Bundle Analysis**:
   ```bash
   npm install --save-dev webpack-bundle-analyzer
   npx webpack-bundle-analyzer build/static/js/*.js
   ```

2. **Image Optimization**:
   ```bash
   # Use WebP format
   # Implement lazy loading
   # Use appropriate image sizes
   ```

## 📞 Support

For deployment issues:
1. Check CloudWatch Logs
2. Verify AWS service status
3. Review deployment logs
4. Contact AWS support if needed

---

**Note**: This deployment guide assumes you have the necessary AWS permissions and services configured. Adjust the configuration based on your specific requirements and security policies. 