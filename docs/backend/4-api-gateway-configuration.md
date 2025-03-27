# API Gateway Configuration Guide for Beginners

## Introduction

This guide will help you set up API Gateway, which acts as the "front door" for your app's backend functionality. You'll learn how to create endpoints that your frontend can call to perform actions like creating bookings, getting user data, and uploading files.

## What is API Gateway?

API Gateway is an AWS service that allows you to create, publish, and manage APIs. Think of it as the switchboard that routes requests from your frontend to the right backend function.

## Why We're Using API Gateway

1. **Security**: It helps authenticate and authorize API requests
2. **Simplicity**: It connects your frontend to Lambda functions
3. **Scalability**: It can handle many requests at once
4. **Features**: It offers features like request validation and throttling

## Understanding Our API Structure

We'll create a RESTful API with this structure:

```
/api/v1
  /users             # User management
  /bookings          # Booking management 
  /assets            # File/image management
  /auth              # Authentication endpoints
```

Each section will have standard operations (GET, POST, PUT, DELETE) that match your application's needs.

## Step 1: Creating a Simple API

Let's start by creating the basic API structure:

```bash
# Create a new REST API if you haven't already
aws apigateway create-rest-api \
  --name "PilotForce API" \
  --description "API for PilotForce application" \
  --endpoint-configuration "{ \"types\": [\"REGIONAL\"] }"

# Save the API ID for future commands
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='PilotForce API'].id" --output text)
echo "API ID: $API_ID"

# For Windows Command Prompt, use this instead:
# for /f "tokens=*" %i in ('aws apigateway get-rest-apis --query "items[?name=='PilotForce API'].id" --output text') do set API_ID=%i

# For Windows PowerShell, use this instead:
# $env:API_ID = aws apigateway get-rest-apis --query "items[?name=='PilotForce API'].id" --output text

# Get the root resource ID (we'll build our API under this)
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text)
echo "Root Resource ID: $ROOT_RESOURCE_ID"
```

## Step 2: Creating API Resources

Now let's create the structure of our API:

```bash
# Create the /api resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "api"

# Get the ID of the /api resource
API_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api'].id" --output text)

# Create the /api/v1 resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $API_RESOURCE_ID \
  --path-part "v1"

# Get the ID of the /api/v1 resource
V1_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1'].id" --output text)

# Create resources for users, bookings, and assets
for DOMAIN in "users" "bookings" "assets" "auth"; do
  # Create the domain resource (e.g., /api/v1/users)
  aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $V1_RESOURCE_ID \
    --path-part $DOMAIN
  
  echo "Created resource for /$DOMAIN"
done
```

This sets up the structure of your API with four main sections: users, bookings, assets, and auth.

## Step 3: Creating a Simple Endpoint

Let's create a GET method for the /api/v1/users endpoint:

```bash
# Get the ID of the /api/v1/users resource
USERS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/users'].id" --output text)

# Create a GET method for the /api/v1/users endpoint
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --authorization-type "NONE" \
  --no-api-key-required

# Create a mock integration for testing
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --type MOCK \
  --request-templates '{"application/json": "{\"statusCode\": 200}"}'

# Set up the mock response
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-templates '{"application/json": "{\"users\": [{\"id\": \"123\", \"name\": \"Example User\"}]}"}'

# Add a method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-models '{"application/json": "Empty"}'
```

This creates a simple GET endpoint at /api/v1/users that returns a list with one example user.

## Step 4: Enabling CORS

CORS (Cross-Origin Resource Sharing) allows your frontend to call your API from a different domain. Without this, your browser will block API calls from your frontend.

```bash
# Function to enable CORS for a resource
enable_cors() {
  local RESOURCE_ID=$1
  echo "Enabling CORS for resource $RESOURCE_ID"
  
  # Add OPTIONS method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --no-api-key-required
  
  # Add integration for OPTIONS
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}'
  
  # Add method response for OPTIONS
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Headers": true
    }'
  
  # Add integration response for OPTIONS
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Origin": "'"'*'"'",
      "method.response.header.Access-Control-Allow-Methods": "'"'GET,POST,PUT,DELETE,OPTIONS'"'",
      "method.response.header.Access-Control-Allow-Headers": "'"'Content-Type,Authorization,X-Amz-Date,X-Api-Key'"'"
    }'
}

# Enable CORS for each resource
RESOURCES=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?starts_with(path, '/api/v1/')].id" --output text)
for RESOURCE_ID in $RESOURCES; do
  enable_cors $RESOURCE_ID
done
```

This adds the necessary CORS headers to allow requests from any origin. In a production environment, you might want to restrict this to specific domains.

## Step 5: Deploying Your API

Once you've set up your API, you need to deploy it to make it accessible:

```bash
# Create a deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name dev \
  --description "Development deployment"

# Get the invoke URL
INVOKE_URL="https://$API_ID.execute-api.$(aws configure get region).amazonaws.com/dev"
echo "API Invoke URL: $INVOKE_URL"
```

This deploys your API to a "dev" stage and gives you the URL where your API is accessible.

## Step 6: Testing Your API

You can test your API using curl:

```bash
# Test the GET /api/v1/users endpoint
curl -X GET "$INVOKE_URL/api/v1/users"
```

You should see a response like:
```json
{"users": [{"id": "123", "name": "Example User"}]}
```

## Step 7: Connecting to Your Lambda Functions

To make your API useful, you'll need to connect it to your Lambda functions:

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)

# Update the users GET method to use a Lambda function
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:PilotForce-UserManagement/invocations"

# Give API Gateway permission to invoke your Lambda function
aws lambda add-permission \
  --function-name PilotForce-UserManagement \
  --statement-id apigateway-get-users \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/GET/api/v1/users"
```

This connects the GET /api/v1/users endpoint to your PilotForce-UserManagement Lambda function.

## Step 8: Setting Up Authentication

To protect your API endpoints, you'll need to set up authentication using your Cognito User Pool:

```bash
# Get your User Pool ID
USER_POOL_ID=your-user-pool-id

# Create a Cognito authorizer
aws apigateway create-authorizer \
  --rest-api-id $API_ID \
  --name PilotForceCognitoAuthorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns "arn:aws:cognito-idp:$REGION:$ACCOUNT_ID:userpool/$USER_POOL_ID" \
  --identity-source "method.request.header.Authorization"

# Save the authorizer ID
AUTHORIZER_ID=$(aws apigateway get-authorizers \
  --rest-api-id $API_ID \
  --query "items[?name=='PilotForceCognitoAuthorizer'].id" \
  --output text)

# Create a new method with authentication
# Get the bookings resource ID
BOOKINGS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/bookings'].id" --output text)

# Create a GET method for bookings that requires authentication
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $BOOKINGS_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --request-parameters "method.request.header.Authorization=true"

# Set up the integration with your Lambda function
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $BOOKINGS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:PilotForce-BookingManagement/invocations"

# Add method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $BOOKINGS_RESOURCE_ID \
  --http-method GET \
  --status-code 200

# Add permission for API Gateway to invoke Lambda
aws lambda add-permission \
  --function-name PilotForce-BookingManagement \
  --statement-id apigateway-get-bookings \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/GET/api/v1/bookings"
```

This creates a GET /api/v1/bookings endpoint that requires users to be logged in.

## Step 9: Redeploying Your API

After making changes, you need to redeploy your API:

```bash
# Create a new deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name dev \
  --description "Updated deployment with authentication"
```

## Step 10: Updating Your Frontend Code

Now you can update your frontend code to call your new API. Here's an example:

```javascript
// In your frontend code (e.g., src/services/bookingService.js)
import { API } from 'aws-amplify';

// Function to get all bookings
export async function getBookings() {
  try {
    const response = await API.get('PilotForceAPI', '/api/v1/bookings');
    return response;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }
}

// Function to create a booking
export async function createBooking(bookingData) {
  try {
    const response = await API.post('PilotForceAPI', '/api/v1/bookings', {
      body: bookingData
    });
    return response;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}
```

Also update your Amplify configuration to include your API:

```javascript
// In src/aws-config.js
const awsConfig = {
  Auth: {
    // ... existing auth config
  },
  API: {
    endpoints: [
      {
        name: 'PilotForceAPI',
        endpoint: 'https://your-api-id.execute-api.your-region.amazonaws.com/dev',
        region: 'your-region'
      }
    ]
  }
};

export default awsConfig;
```

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "CORS error" | Make sure your API has CORS enabled and you've redeployed after making changes. |
| "Authorization header is missing" | Ensure you're logged in and Amplify is attaching the auth token. |
| "Method not found" | Verify the HTTP method and path are exactly right (case-sensitive). |
| "Internal server error" | Check your Lambda function logs in CloudWatch for errors. |

## Next Steps

Now that you have your API set up:

1. Add more endpoints for specific functionality
2. Set up request validation to ensure data is in the correct format
3. Create custom error responses for better user experience
4. Proceed to [S3 Setup](/Users/alexh/Documents/Internship/PilotForce/docs/backend/s3-setup.md) to handle file uploads and storage

## Resources for Further Learning

- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html)
- [AWS Amplify API Documentation](https://docs.amplify.aws/lib/restapi/getting-started/q/platform/js/)
- [RESTful API Design Best Practices](https://restfulapi.net/)
