# Lambda Functions Implementation Guide

## Introduction

AWS Lambda functions will serve as the backbone of your backend business logic. This guide provides detailed instructions on how to implement, organize, and deploy Lambda functions for the PilotForce application.

## Lambda Functions Architecture

### Domain-Based Organization

Organize Lambda functions based on business domains:

1. **User Management**
   - User registration
   - User profile updates
   - User preferences management

2. **Booking Management**
   - Create bookings
   - Update bookings
   - Cancel bookings
   - List bookings

3. **Asset Management**
   - Upload assets
   - Retrieve assets
   - Delete assets
   - Update asset metadata

### Shared Code Structure

```
/lambda
  /layers
    /common           # Shared utilities, DB connections, etc.
  /functions
    /users            # User management functions
    /bookings         # Booking management functions
    /assets           # Asset management functions
    /auth             # Authentication-related functions
```

## Implementation Guidelines

### 1. Setting Up Lambda Development Environment

```bash
# Initialize a new project
mkdir -p lambda/functions
cd lambda
npm init -y

# Install necessary dependencies
npm install --save aws-sdk uuid joi @middy/core @middy/http-json-body-parser @middy/http-error-handler

# Create a layer for common utilities
mkdir -p layers/common/nodejs
cd layers/common/nodejs
npm init -y
npm install --save aws-sdk uuid
```

### 2. Creating a Lambda Layer for Common Code

The common layer should include:

```javascript
// layers/common/nodejs/db.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports = {
  // Generic query function
  async query(params) {
    try {
      return await dynamoDB.query(params).promise();
    } catch (error) {
      console.error('DynamoDB query error:', error);
      throw error;
    }
  },
  
  // Generic get function
  async get(params) {
    try {
      return await dynamoDB.get(params).promise();
    } catch (error) {
      console.error('DynamoDB get error:', error);
      throw error;
    }
  },
  
  // Generic put function
  async put(params) {
    try {
      return await dynamoDB.put(params).promise();
    } catch (error) {
      console.error('DynamoDB put error:', error);
      throw error;
    }
  },
  
  // Generic update function
  async update(params) {
    try {
      return await dynamoDB.update(params).promise();
    } catch (error) {
      console.error('DynamoDB update error:', error);
      throw error;
    }
  },
  
  // Generic delete function
  async delete(params) {
    try {
      return await dynamoDB.delete(params).promise();
    } catch (error) {
      console.error('DynamoDB delete error:', error);
      throw error;
    }
  }
};

// layers/common/nodejs/response.js
module.exports = {
  success(body, statusCode = 200) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify(body)
    };
  },
  
  error(errorMessage, statusCode = 500) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        error: errorMessage
      })
    };
  }
};

// layers/common/nodejs/validator.js
const Joi = require('joi');

module.exports = {
  validateUser(user) {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().min(2).max(100).required(),
      phoneNumber: Joi.string().pattern(/^\+?[0-9]{10,15}$/).required(),
      // Add more validation as needed
    });
    
    return schema.validate(user);
  },
  
  validateBooking(booking) {
    const schema = Joi.object({
      userId: Joi.string().required(),
      serviceType: Joi.string().required(),
      bookingDate: Joi.string().isoDate().required(),
      bookingTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      // Add more validation as needed
    });
    
    return schema.validate(booking);
  }
  
  // Add more validation functions as needed
};
```

### 3. Creating Lambda Functions

#### 3.1 User Management Functions

**Get User Profile Function**:

```javascript
// functions/users/getUser.js
const { get } = require('/opt/nodejs/db');
const { success, error } = require('/opt/nodejs/response');

exports.handler = async (event) => {
  try {
    const userId = event.pathParameters.userId;
    
    // Validate user has permission to access this profile
    const requestContext = event.requestContext;
    const requestUserId = requestContext.authorizer?.claims?.sub;
    
    if (requestUserId !== userId && !isAdmin(requestContext)) {
      return error('Unauthorized access', 403);
    }
    
    const params = {
      TableName: 'PilotForce-Users',
      Key: { userId }
    };
    
    const result = await get(params);
    
    if (!result.Item) {
      return error('User not found', 404);
    }
    
    return success(result.Item);
  } catch (err) {
    console.error('Error retrieving user:', err);
    return error('Error retrieving user profile');
  }
};

function isAdmin(requestContext) {
  // Check if user has admin role
  const groups = requestContext.authorizer?.claims?.['cognito:groups'] || [];
  return groups.includes('admin');
}
```

**Create/Update User Function**:

```javascript
// functions/users/updateUser.js
const { update } = require('/opt/nodejs/db');
const { validateUser } = require('/opt/nodejs/validator');
const { success, error } = require('/opt/nodejs/response');

exports.handler = async (event) => {
  try {
    const userId = event.pathParameters.userId;
    const userData = JSON.parse(event.body);
    
    // Verify permissions
    const requestContext = event.requestContext;
    const requestUserId = requestContext.authorizer?.claims?.sub;
    
    if (requestUserId !== userId && !isAdmin(requestContext)) {
      return error('Unauthorized access', 403);
    }
    
    // Validate input
    const { error: validationError } = validateUser(userData);
    if (validationError) {
      return error(validationError.details[0].message, 400);
    }
    
    // Create update expression dynamically
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    Object.entries(userData).forEach(([key, value]) => {
      if (key !== 'userId') { // Don't update primary key
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });
    
    // Add updatedAt timestamp
    updateExpressions.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames[`#updatedAt`] = 'updatedAt';
    expressionAttributeValues[`:updatedAt`] = new Date().toISOString();
    
    const params = {
      TableName: 'PilotForce-Users',
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await update(params);
    
    return success(result.Attributes);
  } catch (err) {
    console.error('Error updating user:', err);
    return error('Error updating user profile');
  }
};

function isAdmin(requestContext) {
  const groups = requestContext.authorizer?.claims?.['cognito:groups'] || [];
  return groups.includes('admin');
}
```

#### 3.2 Booking Management Functions

**Create Booking Function**:

```javascript
// functions/bookings/createBooking.js
const { put } = require('/opt/nodejs/db');
const { validateBooking } = require('/opt/nodejs/validator');
const { success, error } = require('/opt/nodejs/response');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  try {
    const bookingData = JSON.parse(event.body);
    
    // Get user ID from authentication context
    const userId = event.requestContext.authorizer?.claims?.sub;
    bookingData.userId = userId;
    
    // Validate booking data
    const { error: validationError } = validateBooking(bookingData);
    if (validationError) {
      return error(validationError.details[0].message, 400);
    }
    
    // Create a unique booking ID
    const bookingId = `bk_${uuidv4()}`;
    const timestamp = new Date().toISOString();
    
    const booking = {
      bookingId,
      userId,
      ...bookingData,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    const params = {
      TableName: 'PilotForce-Bookings',
      Item: booking
    };
    
    await put(params);
    
    return success({ 
      message: 'Booking created successfully',
      booking
    }, 201);
  } catch (err) {
    console.error('Error creating booking:', err);
    return error('Error creating booking');
  }
};
```

**List User Bookings Function**:

```javascript
// functions/bookings/listUserBookings.js
const { query } = require('/opt/nodejs/db');
const { success, error } = require('/opt/nodejs/response');

exports.handler = async (event) => {
  try {
    // Get user ID from path or from auth context
    let userId = event.pathParameters?.userId;
    const requestUserId = event.requestContext.authorizer?.claims?.sub;
    
    // If no userId provided in path, use the authenticated user's ID
    if (!userId) {
      userId = requestUserId;
    }
    
    // Check permissions
    if (userId !== requestUserId && !isAdmin(event.requestContext)) {
      return error('Unauthorized access', 403);
    }
    
    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    
    let keyConditionExpression = 'userId = :userId';
    const expressionAttributeValues = {
      ':userId': userId
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      keyConditionExpression += ' AND bookingDate BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      keyConditionExpression += ' AND bookingDate >= :startDate';
      expressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      keyConditionExpression += ' AND bookingDate <= :endDate';
      expressionAttributeValues[':endDate'] = endDate;
    }
    
    const params = {
      TableName: 'PilotForce-Bookings',
      IndexName: 'UserBookingIndex',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues
    };
    
    const result = await query(params);
    
    return success(result.Items);
  } catch (err) {
    console.error('Error listing bookings:', err);
    return error('Error retrieving bookings');
  }
};

function isAdmin(requestContext) {
  const groups = requestContext.authorizer?.claims?.['cognito:groups'] || [];
  return groups.includes('admin');
}
```

#### 3.3 Asset Management Functions

**Upload Asset Metadata Function**:

```javascript
// functions/assets/createAsset.js
const { put } = require('/opt/nodejs/db');
const { success, error } = require('/opt/nodejs/response');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  try {
    const assetData = JSON.parse(event.body);
    const userId = event.requestContext.authorizer?.claims?.sub;
    
    // Generate asset ID
    const assetId = `asset_${uuidv4()}`;
    const timestamp = new Date().toISOString();
    
    // Create asset record
    const asset = {
      assetId,
      userId,
      ...assetData,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    const params = {
      TableName: 'PilotForce-Assets',
      Item: asset
    };
    
    await put(params);
    
    // Generate presigned URL for S3 upload
    const s3 = new AWS.S3();
    const s3Key = `${assetData.assetType}/${userId}/${assetId}_${assetData.fileName}`;
    
    const presignedUrl = s3.getSignedUrl('putObject', {
      Bucket: 'pilotforce-user-assets',
      Key: s3Key,
      ContentType: assetData.mimeType,
      Expires: 300 // URL expires in 5 minutes
    });
    
    // Update the asset record with S3 key
    const updateParams = {
      TableName: 'PilotForce-Assets',
      Key: { assetId },
      UpdateExpression: 'SET s3Key = :s3Key',
      ExpressionAttributeValues: {
        ':s3Key': s3Key
      }
    };
    
    await update(updateParams);
    
    return success({
      message: 'Asset created successfully',
      asset,
      uploadUrl: presignedUrl
    }, 201);
  } catch (err) {
    console.error('Error creating asset:', err);
    return error('Error creating asset');
  }
};
```

### 4. Middleware Implementation

Using the `middy` framework to add middleware to Lambda functions:

```javascript
// functions/middleware.js
const middy = require('@middy/core');
const httpJsonBodyParser = require('@middy/http-json-body-parser');
const httpErrorHandler = require('@middy/http-error-handler');

const loggerMiddleware = () => {
  return {
    before: (handler) => {
      console.log('Request:', JSON.stringify(handler.event));
    },
    after: (handler) => {
      console.log('Response:', JSON.stringify(handler.response));
    },
    onError: (handler) => {
      console.error('Error:', handler.error);
    }
  };
};

// Middleware to verify JWT tokens
const authMiddleware = () => {
  return {
    before: (handler) => {
      const event = handler.event;
      
      // Skip auth for OPTIONS requests (CORS preflight)
      if (event.httpMethod === 'OPTIONS') {
        return;
      }
      
      // Check for authorization
      if (!event.requestContext.authorizer) {
        throw new Error('Unauthorized - No valid token provided');
      }
    }
  };
};

// Apply middleware to Lambda function
const applyMiddleware = (handler, options = {}) => {
  return middy(handler)
    .use(httpJsonBodyParser())
    .use(httpErrorHandler())
    .use(loggerMiddleware())
    .use(options.skipAuth ? {} : authMiddleware());
};

module.exports = { applyMiddleware };
```

### 5. Deployment Script

Create a deployment script to package and deploy Lambda functions:

```bash
#!/bin/bash
# deploy.sh

# Set your AWS profile and region
PROFILE="default"
REGION="us-east-1"

# Create and deploy layer first
echo "Packaging common layer..."
cd lambda/layers/common
zip -r common-layer.zip nodejs
aws lambda publish-layer-version \
  --layer-name pilotforce-common-layer \
  --zip-file fileb://common-layer.zip \
  --compatible-runtimes nodejs18.x \
  --profile $PROFILE \
  --region $REGION

LAYER_VERSION=$(aws lambda list-layer-versions --layer-name pilotforce-common-layer --query 'LayerVersions[0].Version' --output text --profile $PROFILE --region $REGION)
LAYER_ARN="arn:aws:lambda:$REGION:$(aws sts get-caller-identity --query 'Account' --output text --profile $PROFILE):layer:pilotforce-common-layer:$LAYER_VERSION"

echo "Layer ARN: $LAYER_ARN"

# Array of functions to deploy
FUNCTIONS=(
  "users/getUser"
  "users/updateUser"
  "bookings/createBooking"
  "bookings/listUserBookings"
  "assets/createAsset"
)

# Deploy each function
for FUNC in "${FUNCTIONS[@]}"; do
  FUNC_NAME=$(echo $FUNC | tr '/' '-')
  FUNC_PATH="lambda/functions/$FUNC.js"
  
  echo "Packaging function: $FUNC_NAME"
  cd lambda/functions
  zip -j "$FUNC_NAME.zip" "$FUNC.js" "../middleware.js"
  
  echo "Deploying function: $FUNC_NAME"
  aws lambda update-function-code \
    --function-name "PilotForce-$FUNC_NAME" \
    --zip-file "fileb://$FUNC_NAME.zip" \
    --profile $PROFILE \
    --region $REGION
    
  aws lambda update-function-configuration \
    --function-name "PilotForce-$FUNC_NAME" \
    --layers $LAYER_ARN \
    --profile $PROFILE \
    --region $REGION
    
  rm "$FUNC_NAME.zip"
done

echo "Deployment completed!"
```

## Testing Lambda Functions

### 1. Local Testing with AWS SAM

Set up AWS SAM for local testing:

```bash
# Install AWS SAM CLI
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html

# Create a test event file
mkdir -p events
cat > events/getUser.json << EOF
{
  "pathParameters": {
    "userId": "test-user-123"
  },
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123",
        "cognito:groups": ["user"]
      }
    }
  }
}
EOF

# Test locally
sam local invoke "PilotForce-users-getUser" -e events/getUser.json
```

### 2. Unit Testing with Jest

```bash
# Install Jest
npm install --save-dev jest
```

Example test file:

```javascript
// functions/users/__tests__/getUser.test.js
const { handler } = require('../getUser');
const db = require('/opt/nodejs/db');

// Mock the dependencies
jest.mock('/opt/nodejs/db');

describe('getUser Lambda', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  it('should return a user when user exists', async () => {
    // Setup
    const event = {
      pathParameters: { userId: 'test-user-123' },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'test-user-123',
            'cognito:groups': ['user']
          }
        }
      }
    };
    
    db.get.mockResolvedValue({
      Item: {
        userId: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com'
      }
    });
    
    // Execute
    const response = await handler(event);
    
    // Verify
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.userId).toBe('test-user-123');
    expect(body.name).toBe('Test User');
    expect(db.get).toHaveBeenCalledWith({
      TableName: 'PilotForce-Users',
      Key: { userId: 'test-user-123' }
    });
  });
  
  it('should return 404 when user does not exist', async () => {
    // Setup
    const event = {
      pathParameters: { userId: 'non-existent-user' },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'non-existent-user',
            'cognito:groups': ['user']
          }
        }
      }
    };
    
    db.get.mockResolvedValue({ Item: null });
    
    // Execute
    const response = await handler(event);
    
    // Verify
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('User not found');
  });
});
```

## Monitoring and Debugging

1. **CloudWatch Logs**:
   - Enable detailed logging in Lambda functions
   - Set up Log Insights queries for common patterns

2. **X-Ray Tracing**:
   - Enable X-Ray tracing for end-to-end request visibility
   - Instrument SDK calls with X-Ray

3. **CloudWatch Alarms**:
   - Set up alarms for error rates, duration, and throttling
   - Configure Lambda Insights for enhanced monitoring

4. **Dead Letter Queues**:
   - Configure SQS dead letter queues for failed invocations
   - Implement retry logic for transient failures

## Security Best Practices

1. **Use IAM roles with least privilege**:
   - Create specific IAM roles for each Lambda function
   - Grant only necessary permissions

2. **Secure environment variables**:
   - Use AWS Systems Manager Parameter Store for sensitive values
   - Enable encryption of environment variables

3. **Validate all inputs**:
   - Use validation libraries like Joi
   - Implement proper error handling

4. **Use VPC for enhanced security**:
   - Place Lambda functions in a VPC for network isolation
   - Use private subnets with NAT gateway for internet access

5. **API Gateway authorization**:
   - Implement Cognito or custom authorizers
   - Use API keys for non-user requests

## Lambda Function Deployment Options

1. **CloudFormation/SAM**:
   - Define Lambda functions and related resources in template
   - Use nested stacks for modular organization

2. **CI/CD Pipeline**:
   - Use AWS CodePipeline for automated deployments
   - Implement testing stages before production deployment

3. **Canary deployments**:
   - Use Lambda aliases and traffic shifting
   - Gradually roll out new versions

4. **Version management**:
   - Use Lambda versions for immutable deployments
   - Implement proper version tagging

## Advanced Lambda Patterns

1. **Step Functions for workflows**:
   - Orchestrate multiple Lambda functions
   - Handle complex business processes

2. **Fan-out pattern**:
   - Process batch events in parallel
   - Use SNS to trigger multiple Lambdas

3. **Event-driven architecture**:
   - Use EventBridge for decoupled communication
   - Implement pub/sub pattern

4. **Database triggers**:
   - Use DynamoDB Streams to trigger Lambda
   - Process database changes in real-time

## Next Steps

After implementing Lambda functions:

1. Connect them to API Gateway endpoints
2. Implement authentication with Cognito
3. Test end-to-end flows
4. Set up monitoring and alerting
5. Document API interfaces for frontend integration
