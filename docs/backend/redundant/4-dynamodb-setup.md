# DynamoDB Schema Design and Implementation Guide

## Introduction

This document provides a comprehensive guide for designing and implementing DynamoDB tables for the PilotForce application. DynamoDB is a NoSQL database service that provides fast and predictable performance with seamless scalability.

## Key Concepts for DynamoDB

- **Tables**: Collection of items (similar to rows in relational databases)
- **Items**: Collection of attributes (similar to columns)
- **Primary Key**: Unique identifier for each item (Partition Key + optional Sort Key)
- **Secondary Indexes**: Allow querying on non-primary key attributes
- **Partition Key**: Used to distribute data across storage partitions
- **Sort Key**: Used to sort items within a partition

## Table Schemas for PilotForce

### 1. Users Table

**Table Name**: `PilotForce-Users`

**Primary Key Structure**:
- Partition Key: `userId` (String)

**Attributes**:
- `userId` (String): Unique identifier for each user, can use Cognito ID
- `email` (String): User's email address
- `name` (String): User's full name
- `phoneNumber` (String): User's contact number
- `role` (String): User's role in the system (admin, customer, etc.)
- `createdAt` (String): ISO timestamp of account creation
- `updatedAt` (String): ISO timestamp of last update
- `preferences` (Map): User preferences as a JSON object
- `profileImageUrl` (String): S3 URL to profile image

**Example Item**:
```json
{
  "userId": "auth0|123456789",
  "email": "user@example.com",
  "name": "John Doe",
  "phoneNumber": "+1234567890",
  "role": "customer",
  "createdAt": "2023-07-01T14:30:00Z",
  "updatedAt": "2023-07-15T10:15:00Z",
  "preferences": {
    "theme": "dark",
    "notifications": true
  },
  "profileImageUrl": "https://pilotforce-user-assets.s3.amazonaws.com/profiles/user123.jpg"
}
```

### 2. Bookings Table

**Table Name**: `PilotForce-Bookings`

**Primary Key Structure**:
- Partition Key: `bookingId` (String)

**Global Secondary Indexes**:
1. **UserBookingIndex**:
   - Partition Key: `userId` (String)
   - Sort Key: `bookingDate` (String)

**Attributes**:
- `bookingId` (String): Unique identifier for the booking
- `userId` (String): ID of the user who made the booking
- `serviceType` (String): Type of service booked
- `bookingDate` (String): ISO date string for the booking
- `bookingTime` (String): Time of the booking
- `status` (String): Status of booking (confirmed, pending, cancelled, completed)
- `details` (Map): Additional booking details
- `paymentInfo` (Map): Payment-related information
- `createdAt` (String): ISO timestamp of booking creation
- `updatedAt` (String): ISO timestamp of last update

**Example Item**:
```json
{
  "bookingId": "bk_12345",
  "userId": "auth0|123456789",
  "serviceType": "pilot_training",
  "bookingDate": "2023-08-15",
  "bookingTime": "14:30",
  "status": "confirmed",
  "details": {
    "duration": 120,
    "location": "Main Airport",
    "notes": "First-time training session"
  },
  "paymentInfo": {
    "amount": 299.99,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "paymentStatus": "paid"
  },
  "createdAt": "2023-07-10T09:15:00Z",
  "updatedAt": "2023-07-10T09:20:00Z"
}
```

### 3. Assets Table

**Table Name**: `PilotForce-Assets`

**Primary Key Structure**:
- Partition Key: `assetId` (String)

**Global Secondary Indexes**:
1. **AssetTypeIndex**:
   - Partition Key: `assetType` (String)
   - Sort Key: `createdAt` (String)

**Attributes**:
- `assetId` (String): Unique identifier for the asset
- `assetType` (String): Type of asset (image, document, video)
- `fileName` (String): Original name of the file
- `s3Key` (String): S3 object key
- `s3Url` (String): Public URL to access the asset
- `mimeType` (String): MIME type of the asset
- `size` (Number): Size in bytes
- `userId` (String): ID of the user who uploaded the asset
- `tags` (List): Array of tag strings for categorization
- `metadata` (Map): Additional metadata for the asset
- `createdAt` (String): ISO timestamp of asset creation
- `updatedAt` (String): ISO timestamp of last update

**Example Item**:
```json
{
  "assetId": "asset_12345",
  "assetType": "image",
  "fileName": "cessna_training.jpg",
  "s3Key": "training/cessna_training_12345.jpg",
  "s3Url": "https://pilotforce-user-assets.s3.amazonaws.com/training/cessna_training_12345.jpg",
  "mimeType": "image/jpeg",
  "size": 2048576,
  "userId": "auth0|123456789",
  "tags": ["training", "cessna", "aircraft"],
  "metadata": {
    "width": 1920,
    "height": 1080,
    "location": "Main Hangar"
  },
  "createdAt": "2023-06-20T11:30:00Z",
  "updatedAt": "2023-06-20T11:30:00Z"
}
```

## Access Patterns and Query Examples

### Users Table

1. **Get user by ID**:
```javascript
const params = {
  TableName: 'PilotForce-Users',
  Key: {
    userId: 'auth0|123456789'
  }
};
await dynamoDbClient.get(params).promise();
```

2. **Update user preferences**:
```javascript
const params = {
  TableName: 'PilotForce-Users',
  Key: {
    userId: 'auth0|123456789'
  },
  UpdateExpression: 'SET preferences = :preferences, updatedAt = :updatedAt',
  ExpressionAttributeValues: {
    ':preferences': { theme: 'light', notifications: false },
    ':updatedAt': new Date().toISOString()
  },
  ReturnValues: 'ALL_NEW'
};
await dynamoDbClient.update(params).promise();
```

### Bookings Table

1. **Get all bookings for a user**:
```javascript
const params = {
  TableName: 'PilotForce-Bookings',
  IndexName: 'UserBookingIndex',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: {
    ':userId': 'auth0|123456789'
  }
};
await dynamoDbClient.query(params).promise();
```

2. **Get bookings for a user on a specific date**:
```javascript
const params = {
  TableName: 'PilotForce-Bookings',
  IndexName: 'UserBookingIndex',
  KeyConditionExpression: 'userId = :userId AND bookingDate = :bookingDate',
  ExpressionAttributeValues: {
    ':userId': 'auth0|123456789',
    ':bookingDate': '2023-08-15'
  }
};
await dynamoDbClient.query(params).promise();
```

3. **Update booking status**:
```javascript
const params = {
  TableName: 'PilotForce-Bookings',
  Key: {
    bookingId: 'bk_12345'
  },
  UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
  ExpressionAttributeNames: {
    '#status': 'status'
  },
  ExpressionAttributeValues: {
    ':status': 'cancelled',
    ':updatedAt': new Date().toISOString()
  },
  ReturnValues: 'ALL_NEW'
};
await dynamoDbClient.update(params).promise();
```

### Assets Table

1. **Query assets by type**:
```javascript
const params = {
  TableName: 'PilotForce-Assets',
  IndexName: 'AssetTypeIndex',
  KeyConditionExpression: 'assetType = :assetType',
  ExpressionAttributeValues: {
    ':assetType': 'image'
  }
};
await dynamoDbClient.query(params).promise();
```

2. **Get user-specific assets**:
```javascript
const params = {
  TableName: 'PilotForce-Assets',
  FilterExpression: 'userId = :userId',
  ExpressionAttributeValues: {
    ':userId': 'auth0|123456789'
  }
};
await dynamoDbClient.scan(params).promise();
```

## Data Modeling Best Practices

1. **Denormalize when necessary**: Store related data together to reduce query complexity
2. **Use GSIs for flexible querying**: Create GSIs for common access patterns
3. **Use sparse indexes**: Design indexes that only include items with the indexed attribute
4. **Leverage composite sort keys**: Combine multiple attributes in the sort key for flexible querying
5. **Consider item collections**: Items sharing the same partition key are a collection with a 10GB limit

## Scaling Considerations

1. **Even distribution**: Design partition keys to distribute data evenly
2. **Avoid hot partitions**: Prevent excessive reads/writes to a single partition
3. **Use TTL for expiring data**: Automatically remove old data to manage table size
4. **Monitor capacity**: Use CloudWatch metrics to monitor and adjust capacity
5. **Consider on-demand capacity**: Use for unpredictable workloads

## Data Migration and Maintenance

1. **Backup strategy**: Regular backups using AWS Backup or on-demand backups
2. **Update strategies**: Batch updates for consistent data changes
3. **Version tracking**: Include version attributes to track changes
4. **Monitoring**: Set up alerts for table metrics

## Security Best Practices

1. **IAM policies**: Use fine-grained access control with IAM policies
2. **Encryption**: Enable encryption at rest for all tables
3. **Conditional expressions**: Use conditions in write operations to prevent data overwrites
4. **VPC endpoints**: Use VPC endpoints for enhanced security

## Resource Management

1. **Cost optimization**: Monitor and adjust capacity for cost efficiency
2. **Use auto-scaling**: Set up auto-scaling policies for predictable workloads
3. **Consider DAX**: Use DynamoDB Accelerator for caching frequently accessed data
4. **Global tables**: Use global tables for multi-region redundancy if needed
