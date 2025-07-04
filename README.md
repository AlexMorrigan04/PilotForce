# PilotForce - Drone Operations Management Platform

A comprehensive React-based web application for managing drone operations, bookings, assets, and flight data. Built with modern web technologies and AWS cloud services.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- AWS Account with configured services
- Environment variables properly set

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pilotforce-app

# Install dependencies
npm install
# or
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your AWS configuration

# Start development server
npm start
```

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Functionality
- **User Authentication**: AWS Cognito integration with SSO (Google, Microsoft)
- **Role-Based Access Control**: Administrator, User, and SubUser roles
- **Asset Management**: Drone fleet tracking and management
- **Booking System**: Flight booking and scheduling
- **Flight Data Analysis**: Real-time flight data visualization
- **Resource Management**: File uploads and data storage
- **Company Management**: Multi-tenant organization support

### Technical Features
- **Real-time Maps**: Mapbox and Leaflet integration
- **Data Visualization**: D3.js charts and analytics
- **File Processing**: GeoTIFF, image processing, and data extraction
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **TypeScript**: Full type safety and better development experience

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **React Router** for navigation
- **Chakra UI & Material-UI** for components
- **Tailwind CSS** for styling
- **AWS Amplify** for authentication and API calls

### Backend Services (AWS)
- **Amazon Cognito**: User authentication and authorization
- **Amazon S3**: File storage and static hosting
- **Amazon CloudFront**: CDN and security headers
- **AWS WAF**: Rate limiting and security protection
- **AWS Lambda**: Serverless API functions
- **Amazon RDS**: Database storage
- **Amazon CloudWatch**: Monitoring and logging

### Key Dependencies
- **Mapping**: Mapbox GL, Leaflet, React Leaflet
- **Data Processing**: D3.js, Turf.js, GeoTIFF
- **Authentication**: AWS Amplify, JWT
- **File Handling**: React Dropzone, JSZip, Archiver
- **UI Components**: React Bootstrap, Framer Motion

## 🔧 Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory:

```env
# AWS Configuration
REACT_APP_AWS_REGION=eu-north-1
REACT_APP_USER_POOL_ID=eu-north-1_xxxxxxxxx
REACT_APP_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# API Configuration
REACT_APP_API_ENDPOINT=https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod

# Storage Configuration
REACT_APP_S3_BUCKET_NAME=pilotforce-app-bucket

# Optional: External Services
REACT_APP_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_GOOGLE_MAPS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### AWS Services Configuration

1. **Cognito User Pool**: Configure with email/username login
2. **S3 Bucket**: Set up with proper CORS and bucket policies
3. **CloudFront Distribution**: Configure with WAF and security headers
4. **Lambda Functions**: Deploy API functions for backend logic
5. **RDS Database**: Set up MySQL/PostgreSQL database

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from Create React App (one-way operation)
npm run eject
```

### Development Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/your-feature-name
   # Make changes
   npm start  # Test locally
   npm test   # Run tests
   git commit -m "Add feature description"
   ```

2. **Code Quality**:
   - TypeScript strict mode enabled
   - ESLint configuration for code standards
   - Prettier for code formatting

3. **Testing Strategy**:
   - Unit tests with Jest and React Testing Library
   - Integration tests for API calls
   - E2E tests for critical user flows

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components and routing
├── services/           # API and external service integrations
├── utils/              # Utility functions and helpers
├── hooks/              # Custom React hooks
├── contexts/           # React context providers
├── types/              # TypeScript type definitions
├── styles/             # CSS and styling files
├── config/             # Configuration files
└── middleware/         # Authentication and route protection
```

## 🚀 Deployment

### Production Build

```bash
# Create optimized production build
npm run build

# The build folder contains the production-ready files
```

### AWS Deployment

1. **S3 Static Website Hosting**:
   ```bash
   aws s3 sync build/ s3://your-bucket-name --delete
   ```

2. **CloudFront Distribution**:
   - Configure with custom domain
   - Enable HTTPS
   - Set up WAF rules for security

3. **Environment Variables**:
   - Set production environment variables
   - Configure different values for staging/production

### CI/CD Pipeline

Recommended GitHub Actions workflow:

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Deploy to S3
        run: aws s3 sync build/ s3://${{ secrets.S3_BUCKET }} --delete
      - name: Invalidate CloudFront
        run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

## 🔒 Security

### Security Features

- **WAF Protection**: Rate limiting (1000 requests/5min per IP)
- **Security Headers**: Comprehensive CSP, HSTS, and Permissions-Policy
- **Authentication**: JWT tokens with AWS Cognito
- **Authorization**: Role-based access control
- **HTTPS Only**: TLS 1.2+ enforced
- **CORS Configuration**: Proper cross-origin resource sharing

### Security Headers

The application includes comprehensive security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy`: Restrictive policy for XSS protection
- `Permissions-Policy`: Feature restrictions for privacy

### Authentication Flow

1. **Login**: Email/username with password or SSO
2. **Token Management**: JWT tokens stored securely
3. **Role Verification**: Cognito groups and custom attributes
4. **Route Protection**: Middleware-based access control

## 📚 API Documentation

### Authentication Endpoints

- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/confirm` - Account confirmation
- `POST /auth/refresh` - Token refresh

### Asset Management

- `GET /assets` - List all assets
- `POST /assets` - Create new asset
- `GET /assets/:id` - Get asset details
- `PUT /assets/:id` - Update asset
- `DELETE /assets/:id` - Delete asset

### Booking Management

- `GET /bookings` - List bookings
- `POST /bookings` - Create booking
- `GET /bookings/:id` - Get booking details
- `PUT /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Cancel booking

### File Upload

- `POST /upload` - Upload files to S3
- `GET /files/:id` - Download file
- `DELETE /files/:id` - Delete file

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Check Cognito configuration
   - Verify environment variables
   - Clear browser cache and localStorage

2. **File Upload Issues**:
   - Verify S3 bucket permissions
   - Check CORS configuration
   - Ensure file size limits

3. **Map Loading Problems**:
   - Verify Mapbox/Google Maps API keys
   - Check network connectivity
   - Clear browser cache

4. **Build Errors**:
   - Clear node_modules and reinstall
   - Check TypeScript compilation
   - Verify all dependencies are installed

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

### Performance Optimization

- **Code Splitting**: React.lazy for route-based splitting
- **Image Optimization**: WebP format and lazy loading
- **Bundle Analysis**: Use webpack-bundle-analyzer
- **Caching**: CloudFront caching strategies

## 📞 Support

### Getting Help

1. **Documentation**: Check this README and inline code comments
2. **Issues**: Create GitHub issues for bugs or feature requests
3. **Discussions**: Use GitHub Discussions for questions
4. **Security**: Report security issues privately

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🔄 Version History

- **v0.1.0**: Initial release with core functionality
- **v0.2.0**: Added flight data analysis and mapping
- **v0.3.0**: Enhanced security and performance improvements

---

**PilotForce** - Empowering drone operations with intelligent management solutions.