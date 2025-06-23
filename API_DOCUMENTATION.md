# PilotForce API Documentation

This document provides comprehensive API documentation for the PilotForce drone operations management platform.

## 🔗 Base URL

```
Production: https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/prod
Development: https://xxxxxxxxxx.execute-api.eu-north-1.amazonaws.com/dev
```

## 🔐 Authentication

### Overview

PilotForce uses AWS Cognito for authentication with JWT tokens. All API requests require a valid JWT token in the Authorization header.

### Authentication Flow

1. **Login**: User authenticates via Cognito
2. **Token Retrieval**: JWT tokens are returned
3. **API Requests**: Include token in Authorization header
4. **Token Refresh**: Automatically handled by AWS Amplify

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "cognito:groups": ["Administrator", "User"],
  "custom:role": "Administrator",
  "custom:companyId": "company-uuid",
  "exp": 1640995200,
  "iat": 1640908800
}
```

## 📋 API Endpoints

### Authentication

#### POST /auth/login
Authenticate user and retrieve JWT tokens.

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "idToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "role": "Administrator",
      "companyId": "company-uuid"
    }
  }
}
```

#### POST /auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "companyId": "company-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for confirmation."
}
```

#### POST /auth/confirm
Confirm user account with verification code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### POST /auth/refresh
Refresh JWT tokens.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Asset Management

#### GET /assets
Retrieve all assets for the authenticated user's company.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `search` (string): Search term for asset name/description
- `status` (string): Filter by asset status (active, inactive, maintenance)
- `type` (string): Filter by asset type (drone, camera, sensor)

**Response:**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": "asset-uuid",
        "name": "DJI Mavic 3 Pro",
        "type": "drone",
        "model": "Mavic 3 Pro",
        "serialNumber": "DJI123456789",
        "status": "active",
        "companyId": "company-uuid",
        "specifications": {
          "maxFlightTime": "46 minutes",
          "maxRange": "15 km",
          "camera": "4/3 CMOS"
        },
        "location": {
          "latitude": 51.5074,
          "longitude": -0.1278
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### POST /assets
Create a new asset.

**Request Body:**
```json
{
  "name": "DJI Mavic 3 Pro",
  "type": "drone",
  "model": "Mavic 3 Pro",
  "serialNumber": "DJI123456789",
  "specifications": {
    "maxFlightTime": "46 minutes",
    "maxRange": "15 km",
    "camera": "4/3 CMOS"
  },
  "location": {
    "latitude": 51.5074,
    "longitude": -0.1278
  }
}
```

#### GET /assets/:id
Retrieve specific asset details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "asset-uuid",
    "name": "DJI Mavic 3 Pro",
    "type": "drone",
    "model": "Mavic 3 Pro",
    "serialNumber": "DJI123456789",
    "status": "active",
    "companyId": "company-uuid",
    "specifications": {
      "maxFlightTime": "46 minutes",
      "maxRange": "15 km",
      "camera": "4/3 CMOS"
    },
    "location": {
      "latitude": 51.5074,
      "longitude": -0.1278
    },
    "maintenanceHistory": [
      {
        "id": "maintenance-uuid",
        "date": "2024-01-10T14:00:00Z",
        "description": "Regular maintenance check",
        "technician": "John Smith",
        "cost": 150.00
      }
    ],
    "flightHistory": [
      {
        "id": "flight-uuid",
        "date": "2024-01-12T09:00:00Z",
        "duration": "45 minutes",
        "distance": "12.5 km",
        "pilot": "Jane Doe"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### PUT /assets/:id
Update asset information.

**Request Body:**
```json
{
  "name": "DJI Mavic 3 Pro - Updated",
  "status": "maintenance",
  "specifications": {
    "maxFlightTime": "46 minutes",
    "maxRange": "15 km",
    "camera": "4/3 CMOS",
    "batteryHealth": "85%"
  }
}
```

#### DELETE /assets/:id
Delete an asset (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Asset deleted successfully"
}
```

### Booking Management

#### GET /bookings
Retrieve all bookings for the authenticated user.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `status` (string): Filter by booking status (pending, confirmed, completed, cancelled)
- `dateFrom` (string): Filter bookings from date (ISO 8601)
- `dateTo` (string): Filter bookings to date (ISO 8601)
- `assetId` (string): Filter by specific asset

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking-uuid",
        "title": "Aerial Photography - London Bridge",
        "description": "Aerial photography session for construction monitoring",
        "startDate": "2024-01-20T09:00:00Z",
        "endDate": "2024-01-20T11:00:00Z",
        "status": "confirmed",
        "assetId": "asset-uuid",
        "pilotId": "user-uuid",
        "location": {
          "latitude": 51.5074,
          "longitude": -0.1278,
          "address": "London Bridge, London, UK"
        },
        "requirements": {
          "weather": "Clear skies",
          "permissions": ["CAA Permission"],
          "equipment": ["Camera", "GPS"]
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}
```

#### POST /bookings
Create a new booking.

**Request Body:**
```json
{
  "title": "Aerial Photography - London Bridge",
  "description": "Aerial photography session for construction monitoring",
  "startDate": "2024-01-20T09:00:00Z",
  "endDate": "2024-01-20T11:00:00Z",
  "assetId": "asset-uuid",
  "location": {
    "latitude": 51.5074,
    "longitude": -0.1278,
    "address": "London Bridge, London, UK"
  },
  "requirements": {
    "weather": "Clear skies",
    "permissions": ["CAA Permission"],
    "equipment": ["Camera", "GPS"]
  }
}
```

#### GET /bookings/:id
Retrieve specific booking details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "title": "Aerial Photography - London Bridge",
    "description": "Aerial photography session for construction monitoring",
    "startDate": "2024-01-20T09:00:00Z",
    "endDate": "2024-01-20T11:00:00Z",
    "status": "confirmed",
    "assetId": "asset-uuid",
    "pilotId": "user-uuid",
    "location": {
      "latitude": 51.5074,
      "longitude": -0.1278,
      "address": "London Bridge, London, UK"
    },
    "requirements": {
      "weather": "Clear skies",
      "permissions": ["CAA Permission"],
      "equipment": ["Camera", "GPS"]
    },
    "flightData": {
      "takeoffTime": "2024-01-20T09:15:00Z",
      "landingTime": "2024-01-20T10:45:00Z",
      "maxAltitude": 120,
      "totalDistance": 8.5,
      "batteryUsage": 85
    },
    "files": [
      {
        "id": "file-uuid",
        "name": "flight_log.csv",
        "type": "flight_data",
        "size": 2048,
        "url": "https://s3.amazonaws.com/bucket/flight_log.csv"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### PUT /bookings/:id
Update booking information.

**Request Body:**
```json
{
  "title": "Aerial Photography - London Bridge - Updated",
  "status": "completed",
  "flightData": {
    "takeoffTime": "2024-01-20T09:15:00Z",
    "landingTime": "2024-01-20T10:45:00Z",
    "maxAltitude": 120,
    "totalDistance": 8.5,
    "batteryUsage": 85
  }
}
```

#### DELETE /bookings/:id
Cancel a booking.

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
```

### File Management

#### POST /upload
Upload files to S3.

**Request Body (multipart/form-data):**
```
file: [binary file data]
type: "flight_data" | "image" | "document"
bookingId: "booking-uuid" (optional)
assetId: "asset-uuid" (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "name": "flight_log.csv",
    "type": "flight_data",
    "size": 2048,
    "url": "https://s3.amazonaws.com/bucket/flight_log.csv",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /files/:id
Download file information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file-uuid",
    "name": "flight_log.csv",
    "type": "flight_data",
    "size": 2048,
    "url": "https://s3.amazonaws.com/bucket/flight_log.csv",
    "uploadedAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "contentType": "text/csv",
      "encoding": "utf-8"
    }
  }
}
```

#### DELETE /files/:id
Delete a file.

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### User Management

#### GET /users
Retrieve all users (Admin only).

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `role` (string): Filter by user role
- `companyId` (string): Filter by company

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "Administrator",
        "companyId": "company-uuid",
        "status": "active",
        "lastLogin": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

#### POST /users
Create a new user (Admin only).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "User",
  "companyId": "company-uuid"
}
```

#### PUT /users/:id
Update user information.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith-Updated",
  "role": "Administrator",
  "status": "active"
}
```

### Company Management

#### GET /companies
Retrieve all companies (Admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "company-uuid",
        "name": "AeroTech Solutions",
        "description": "Professional drone services",
        "address": {
          "street": "123 Aviation Way",
          "city": "London",
          "postcode": "SW1A 1AA",
          "country": "UK"
        },
        "contact": {
          "email": "contact@aerotech.com",
          "phone": "+44 20 1234 5678"
        },
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST /companies
Create a new company.

**Request Body:**
```json
{
  "name": "AeroTech Solutions",
  "description": "Professional drone services",
  "address": {
    "street": "123 Aviation Way",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "UK"
  },
  "contact": {
    "email": "contact@aerotech.com",
    "phone": "+44 20 1234 5678"
  }
}
```

## 📊 Data Models

### Asset Model
```typescript
interface Asset {
  id: string;
  name: string;
  type: 'drone' | 'camera' | 'sensor' | 'other';
  model: string;
  serialNumber: string;
  status: 'active' | 'inactive' | 'maintenance';
  companyId: string;
  specifications: Record<string, any>;
  location: {
    latitude: number;
    longitude: number;
  };
  maintenanceHistory: MaintenanceRecord[];
  flightHistory: FlightRecord[];
  createdAt: string;
  updatedAt: string;
}
```

### Booking Model
```typescript
interface Booking {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  assetId: string;
  pilotId: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  requirements: {
    weather: string;
    permissions: string[];
    equipment: string[];
  };
  flightData?: FlightData;
  files: FileRecord[];
  createdAt: string;
  updatedAt: string;
}
```

### User Model
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Administrator' | 'User' | 'SubUser';
  companyId: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}
```

## 🚨 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Email format is invalid"
    }
  }
}
```

### Common Error Codes
- `AUTHENTICATION_ERROR`: Invalid or expired token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error

## 📈 Rate Limiting

- **Standard Users**: 1000 requests per 5 minutes
- **Administrators**: 2000 requests per 5 minutes
- **File Uploads**: 100MB per request, 1GB per hour

## 🔒 Security

### CORS Configuration
```json
{
  "allowedOrigins": ["https://your-domain.com"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["Authorization", "Content-Type"],
  "maxAge": 3600
}
```

### Data Validation
- All input data is validated using JSON Schema
- SQL injection protection via parameterized queries
- XSS protection via input sanitization
- File upload validation for type and size

## 📞 Support

For API support:
1. Check error messages and status codes
2. Review request/response examples
3. Contact development team for issues
4. Monitor API status page

---

**API Version**: v1.0  
**Last Updated**: January 2024 