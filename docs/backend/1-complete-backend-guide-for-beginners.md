# Complete AWS Backend Guide for Beginners

## Introduction

This guide provides a step-by-step approach to building a complete backend system for your PilotForce application using AWS services. It's designed for developers who are new to AWS but have some experience with web development.

## What Is a Backend System?

A backend system handles all the behind-the-scenes functionality of your application:
- Storing and retrieving data
- User authentication and authorization
- Business logic processing
- File storage and management

## Overview of the AWS Services We'll Use

![AWS Backend Architecture](/Users/alexh/Documents/Internship/PilotForce/docs/assets/aws-backend-architecture.png)

1. **AWS Cognito**: Handles user signup, login, and authentication
2. **API Gateway**: Creates secure API endpoints your frontend can call
3. **Lambda**: Runs your backend code when API endpoints are called
4. **DynamoDB**: Stores structured data (users, bookings, etc.)
5. **S3**: Stores files and images

## The Implementation Path

We'll build our backend in this order:

1. Set up AWS account and CLI
2. Set up authentication with Cognito
3. Create database tables with DynamoDB
4. Create business logic with Lambda functions
5. Create API endpoints with API Gateway
6. Configure file storage with S3
7. Connect everything to your React frontend

## Prerequisites

Before starting, you'll need:

- An AWS account (free tier is sufficient for development)
- AWS CLI installed on your computer
- Node.js and npm installed
- Basic knowledge of JavaScript/React
- Your React frontend application

## Step 1: Setting Up Your AWS Account and CLI

1. Create an AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Install the AWS CLI:
   - For Windows: Download the installer from [AWS CLI](https://aws.amazon.com/cli/)
   - For Mac: `brew install awscli`
   - For Linux: `sudo apt-get install awscli`

3. Configure AWS CLI:
```bash
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, default region (e.g., us-east-1), and output format (json).

## Step 2: Authentication with Cognito

Follow the detailed steps in [Authentication Setup](/Users/alexh/Documents/Internship/PilotForce/docs/backend/authentication-setup.md).

This will:
- Create a user pool to store user accounts
- Set up authentication flows
- Integrate login/signup with your React frontend

## Step 3: Creating Database Tables with DynamoDB

DynamoDB is a NoSQL database that scales automatically. Here's how to set up your main tables:

### Users Table

```bash
aws dynamodb create-table \
  --table-name PilotForce-Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Bookings Table

```bash
aws dynamodb create-table \
  --table-name PilotForce-Bookings \
  --attribute-definitions \
      AttributeName=bookingId,AttributeType=S \
      AttributeName=userId,AttributeType=S \
      AttributeName=bookingDate,AttributeType=S \
  --key-schema AttributeName=bookingId,KeyType=HASH \
  --global-secondary-indexes \
      "[
        {
          \"IndexName\": \"UserBookingIndex\",
          \"KeySchema\": [{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}, {\"AttributeName\":\"bookingDate\",\"KeyType\":\"RANGE\"}],
          \"Projection\": {\"ProjectionType\":\"ALL\"}
        }
      ]" \
  --billing-mode PAY_PER_REQUEST
```

## Step 4: Creating Lambda Functions

Lambda functions run your code in response to events. Let's create a simple function to get user data:

1. Create a file called `get-user.js`:

```javascript
// get-user.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    // Get user ID from the event
    const userId = event.pathParameters.userId;
    
    // Get the user from DynamoDB
    const params = {
      TableName: 'PilotForce-Users',
      Key: { userId }
    };
    
    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }
    
    // Return the user data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get user' })
    };
  }
};
```

2. Create a deployment package:

```bash
# Install dependencies
npm install aws-sdk

# Create a zip file
zip -r get-user.zip get-user.js node_modules/
```

3. Create the Lambda function:

```bash
aws lambda create-function \
  --function-name PilotForce-GetUser \
  --runtime nodejs18.x \
  --handler get-user.handler \
  --role arn:aws:iam::your-account-id:role/lambda-execution-role \
  --zip-file fileb://get-user.zip
```

See [Lambda Implementation](/Users/alexh/Documents/Internship/PilotForce/docs/backend/lambda-implementation.md) for more detailed examples.

## Step 5: Creating API Endpoints with API Gateway

API Gateway creates HTTP endpoints that trigger your Lambda functions:

1. Create an API:

```bash
aws apigateway create-rest-api \
  --name "PilotForce API" \
  --description "API for PilotForce application"
```

2. Set up resources and methods to connect to your Lambda functions

3. Deploy your API:

```bash
aws apigateway create-deployment \
  --rest-api-id your-api-id \
  --stage-name dev
```

Follow the detailed guide in [API Gateway Configuration](/Users/alexh/Documents/Internship/PilotForce/docs/backend/api-gateway-configuration.md).

## Step 6: Setting Up File Storage with S3

S3 provides secure and scalable file storage:

1. Create buckets for your application assets and user uploads
2. Configure bucket policies and permissions
3. Set up direct uploads from your frontend

Follow the steps in [S3 Setup](/Users/alexh/Documents/Internship/PilotForce/docs/backend/s3-setup.md).

## Step 7: Connecting to Your React Frontend

Now it's time to connect everything to your React frontend:

1. Install the AWS Amplify library:

```bash
npm install aws-amplify @aws-amplify/ui-react
```

2. Configure Amplify in your app:

```javascript
// src/index.js
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'us-east-1',                               // Replace with your region
    userPoolId: 'us-east-1_xxxxxxxxx',                 // Replace with your User Pool ID
    userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxx',  // Replace with your App Client ID
  },
  API: {
    endpoints: [
      {
        name: 'PilotForceAPI',
        endpoint: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev',
        region: 'us-east-1'
      }
    ]
  },
  Storage: {
    AWSS3: {
      bucket: 'your-uploads-bucket-name',
      region: 'us-east-1'
    }
  }
});
```

3. Use Amplify in your components:

```javascript
// Example API call
import { API } from 'aws-amplify';

async function getUser(userId) {
  try {
    const user = await API.get('PilotForceAPI', `/api/v1/users/${userId}`);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}
```

For detailed frontend integration instructions, see [Frontend Integration](/Users/alexh/Documents/Internship/PilotForce/docs/backend/frontend-integration.md).

## Common Issues and Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access denied" errors | Check IAM permissions for your Lambda functions and API Gateway |
| CORS errors in browser | Make sure CORS is enabled in API Gateway |
| Authentication errors | Verify Cognito configuration and token handling |
| Lambda function fails | Check CloudWatch logs for detailed error messages |

## Best Practices

1. **Security**:
   - Use the principle of least privilege for IAM roles
   - Never store AWS credentials in your frontend code
   - Use Cognito for authentication
   - Validate all user input

2. **Performance**:
   - Design DynamoDB tables for your access patterns
   - Use pagination for large data sets
   - Implement caching where appropriate

3. **Cost Management**:
   - Use AWS Free Tier resources during development
   - Set up AWS Budgets to monitor costs
   - Use on-demand pricing for development workloads

## Next Steps

After implementing your basic backend:

1. Add more advanced features like notifications or payment processing
2. Implement automated testing for your backend
3. Set up CI/CD pipelines for deployment
4. Consider monitoring and logging solutions

## Resources for Learning More

- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Serverless Framework](https://www.serverless.com/) - A tool that can simplify AWS deployment
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) - Best practices for AWS
