# PilotForce AWS Lambda & API Gateway Setup Guide

This guide provides comprehensive instructions for setting up the PilotForce application infrastructure in AWS, focusing on Lambda functions, API Gateway, and Cognito integration.

## System Architecture Overview

PilotForce uses the following AWS services:

1. **Amazon Cognito** - For user authentication and management
2. **AWS Lambda** - For serverless API functions
3. **Amazon API Gateway** - To expose Lambda functions as REST APIs
4. **Amazon DynamoDB** - For storing assets, bookings, and other application data
5. **Amazon S3** - For static website hosting (React frontend)

## Authentication Flow

The authentication flow works as follows:

1. User signs in with username/password via the React frontend
2. The frontend sends credentials to API Gateway endpoint `/login`
3. API Gateway triggers a Lambda function that authenticates with Cognito
4. Upon successful authentication, the Lambda returns tokens (ID, access, refresh)
5. The frontend stores these tokens in localStorage
6. For subsequent API calls, the frontend includes ID token in Authorization header
7. When tokens expire, the system uses the refresh token to obtain new tokens
8. If refresh fails, user is redirected to login

## Setup Instructions

### 1. Cognito Setup

#### Create User Pool

1. Go to AWS Console and navigate to Amazon Cognito
2. Click "Create user pool"
3. Configure sign-in experience:
   - Select "Email" and "Username" as sign-in options
   - Enable "User name" for Cognito user pool sign-in
   - Click "Next"

4. Configure security requirements:
   - Set password policy (minimum length: 8, require numbers, special characters, etc.)
   - Set MFA to "Optional" for development or "Required" for production
   - Click "Next"

5. Configure sign-up experience:
   - Enable self-registration
   - Select required attributes: email, name
   - Add custom attributes:
     - `custom:companyId` (String)
     - `custom:userRole` (String)
   - Click "Next"

6. Configure message delivery:
   - Select "Send email with Cognito" for development (can change to SES later)
   - Click "Next"

7. Integrate your app:
   - Choose app client name: "PilotForceAppClient"
   - Select "Generate a client secret"
   - Set token expiration: 
     - ID token: 1 day
     - Refresh token: 30 days
   - Enable all authentication flows
   - Click "Next"

8. Review all settings and click "Create user pool"
9. Note your User Pool ID and App Client ID for later use

### 2. DynamoDB Setup

#### Create Assets Table

1. Navigate to DynamoDB in AWS Console
2. Click "Create table"
3. Enter table details:
   - Table name: `Assets`
   - Partition key: `AssetId` (String)
   - Click "Create table"

4. After creation, add GSIs (Global Secondary Indexes):
   - Click on the Assets table
   - Go to "Indexes" tab
   - Click "Create index"
   - Create indexes:
     - `CompanyIdIndex` with partition key `CompanyId`
     - `UserIdIndex` with partition key `UserId`

#### Create Bookings Table

1. Click "Create table"
2. Enter table details:
   - Table name: `Bookings`
   - Partition key: `BookingId` (String)
   - Click "Create table"

3. After creation, add GSIs:
   - `AssetIdIndex` with partition key `AssetId`
   - `UserIdIndex` with partition key `UserId`

### 3. Lambda Function Setup

For each Lambda function, follow these steps:

#### Setup pilotforce-get-assets Lambda

1. Navigate to AWS Lambda console
2. Click "Create function"
3. Select "Author from scratch"
4. Configure basic information:
   - Function name: `pilotforce-get-assets`
   - Runtime: `Python 3.10`
   - Architecture: `x86_64`
   - Execution role: Create a new role with basic Lambda permissions

5. Click "Create function"
6. Upload the Python code:
   - In the "Code" tab, upload `pilotforce-get-assets.py`
   - Rename it to `lambda_function.py`
   - Set handler to `lambda_function.lambda_handler`
   - Click "Deploy"

7. Configure function settings:
   - Memory: 256 MB
   - Timeout: 30 seconds
   - Click "Save"

8. Add environment variables:
   - USER_POOL_ID: your-user-pool-id
   - APP_CLIENT_ID: your-app-client-id

9. Set IAM Permissions:
   - Navigate to the IAM role created for this Lambda
   - Add these policies:
     - `AmazonDynamoDBReadOnlyAccess`
     - `AmazonCognitoReadOnly`

#### Setup pilotforce-get-asset-details Lambda

1. Repeat steps 1-9 from above, using:
   - Function name: `pilotforce-get-asset-details`
   - Upload `pilotforce-get-asset-details.py`

#### Setup pilotforce-refresh-token Lambda

1. Repeat steps 1-9 from above, using:
   - Function name: `pilotforce-refresh-token`
   - Runtime: `Node.js 18.x`
   - Upload `pilotforce-refresh-token.mjs`
   - Set handler to `pilotforce-refresh-token.handler`
   - Add environment variable:
     - COGNITO_CLIENT_ID: your-app-client-id

### 4. API Gateway Setup

#### Create API

1. Navigate to API Gateway console
2. Click "Create API"
3. Choose "REST API" and click "Build"
4. Configure settings:
   - API name: `PilotForceAPI`
   - Description: `API for PilotForce application`
   - Endpoint Type: "Regional"
   - Click "Create API"

#### Configure /assets Endpoint

1. From the Actions dropdown, select "Create Resource"
2. Configure resource:
   - Resource Path: `/assets`
   - Resource Name: `assets`
   - Enable CORS: checked
   - Click "Create Resource"

3. With the /assets resource selected, from Actions dropdown select "Create Method"
4. Select `GET` and click the checkmark
5. Configure method:
   - Integration type: "Lambda Function"
   - Lambda Proxy integration: checked
   - Lambda Function: `pilotforce-get-assets`
   - Click "Save"

#### Configure /assets/{id} Endpoint

1. From the Actions dropdown, select "Create Resource"
2. Configure resource:
   - Parent Resource: `/assets`
   - Resource Path: `{id}`
   - Resource Name: `asset`
   - Enable CORS: checked
   - Click "Create Resource"

3. With the /assets/{id} resource selected, from Actions dropdown select "Create Method"
4. Select `GET` and click the checkmark
5. Configure method:
   - Integration type: "Lambda Function"
   - Lambda Proxy integration: checked
   - Lambda Function: `pilotforce-get-asset-details`
   - Click "Save"

#### Configure /refresh-token Endpoint

1. From the Actions dropdown, select "Create Resource"
2. Configure resource:
   - Resource Path: `/refresh-token`
   - Resource Name: `refresh-token`
   - Enable CORS: checked
   - Click "Create Resource"

3. With the /refresh-token resource selected, from Actions dropdown select "Create Method"
4. Select `POST` and click the checkmark
5. Configure method:
   - Integration type: "Lambda Function"
   - Lambda Proxy integration: checked
   - Lambda Function: `pilotforce-refresh-token`
   - Click "Save"

#### Deploy API

1. From Actions dropdown, select "Deploy API"
2. Configure deployment:
   - Deployment stage: create new stage called "prod"
   - Stage description: `Production environment`
   - Click "Deploy"

3. Note your API Gateway Invoke URL (should look like: `https://[api-id].execute-api.[region].amazonaws.com/prod`)

### 5. Frontend Configuration

Update your React frontend to use the correct endpoints:

1. Open `src/utils/cognitoUtils.ts` and update:
   ```typescript
   export const getApiEndpoint = () => {
     return process.env.REACT_APP_API_URL || 'https://[api-id].execute-api.[region].amazonaws.com/prod';
   };
   ```

2. Create `.env` file with:
   ```
   REACT_APP_API_URL=https://[api-id].execute-api.[region].amazonaws.com/prod
   REACT_APP_USER_POOL_ID=your-user-pool-id
   REACT_APP_USER_POOL_WEB_CLIENT_ID=your-app-client-id
   ```

## Testing Your Setup

### 1. Test Authentication Flow

1. Register a new user via your frontend
2. Confirm registration with verification code
3. Log in with the registered user
4. Check browser developer tools to verify tokens are stored in localStorage
5. Navigate to the Assets page to test authenticated API calls

### 2. Test Asset Retrieval

1. First, populate the Assets table with test data:
   - Navigate to DynamoDB console
   - Select the Assets table
   - Click "Create item" and add sample data with appropriate fields:
     - AssetId: (generate UUID)
     - Name: "Test Asset"
     - AssetType: "buildings"
     - CompanyId: (use the company ID of your test user)
     - UserId: (use the user ID of your test user)
     - CreatedAt: (current timestamp)

2. Navigate to the Assets page in your frontend application
3. Verify assets are loaded and displayed properly

## Troubleshooting

### Common Issues

1. **API Gateway CORS errors**:
   - Ensure CORS is enabled for all resources
   - Verify 'Access-Control-Allow-Origin' header is set to '*' or your frontend domain
   - Check OPTIONS method is properly configured for preflight requests

2. **Authentication failures**:
   - Verify tokens in localStorage using browser DevTools
   - Inspect token expiration using the debugAuthState() function in browser console
   - Check CloudWatch logs for Lambda function errors

3. **Lambda execution errors**:
   - Review CloudWatch log groups for each Lambda function
   - Ensure IAM permissions include access to Cognito and DynamoDB
   - Verify environment variables are correctly set

4. **DynamoDB access issues**:
   - Check IAM permissions for Lambda execution roles
   - Verify table names and index names match exactly what's in the code
   - Ensure data in tables follows the expected schema

## Security Considerations

1. **Token storage**: In production, consider more secure token storage than localStorage
2. **HTTPS**: Ensure all API endpoints use HTTPS
3. **Least privilege**: Refine IAM permissions to follow principle of least privilege
4. **Cognito settings**: Review Cognito security settings for production use
5. **API Gateway throttling**: Set appropriate request throttling to prevent abuse

## Next Steps

1. **CI/CD Pipeline**: Set up automated deployment using AWS CodePipeline
2. **Monitoring**: Add CloudWatch Alarms for Lambda errors and API Gateway 5xx responses
3. **User management**: Implement admin console for user management
4. **Performance optimization**: Tune Lambda memory settings and DynamoDB capacity

## Architecture Diagram

