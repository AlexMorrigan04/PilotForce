# Lambda Function Debugging Guide

This document provides troubleshooting steps to resolve issues with the `get-booking-details` Lambda function.

## Common Issues and Solutions

### 1. API Gateway Configuration Issues

Check if your API Gateway is properly configured:

1. **Resource paths**: Ensure the API Gateway has a resource path configured as `/get-booking-details/{id}` where `{id}` is a path parameter.

2. **Method configuration**: Verify that the GET method is properly integrated with the Lambda function.

3. **Lambda proxy integration**: Confirm that Lambda proxy integration is enabled (this passes the full HTTP request to your Lambda).

### 2. Lambda IAM Permissions

Ensure your Lambda function has proper permissions:

1. **DynamoDB permissions**: The Lambda execution role should have the following permissions:
   - `dynamodb:GetItem`
   - `dynamodb:Query`
   - `dynamodb:Scan`

2. **Logs permissions**: For proper logging, ensure these permissions:
   - `logs:CreateLogGroup`
   - `logs:CreateLogStream`
   - `logs:PutLogEvents`

### 3. Testing the Lambda Function Directly

You can test the Lambda function directly in the AWS Console:

1. Go to the Lambda function in AWS Console
2. Click "Test" and create a new test event
3. Use this template (adjust as needed):

```json
{
  "httpMethod": "GET",
  "path": "/get-booking-details/YOUR_BOOKING_ID",
  "resource": "/get-booking-details/{id}",
  "pathParameters": {
    "id": "YOUR_BOOKING_ID"
  },
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN_HERE"
  }
}
```

### 4. CloudWatch Logs

The most valuable debugging tool is CloudWatch Logs:

1. Go to CloudWatch > Log groups > `/aws/lambda/pilotforce-get-booking-details`
2. Look for recent log streams when your function was invoked
3. Check for error messages or issues with DynamoDB queries

### 5. API Gateway Testing

Test your API directly from the API Gateway console:

1. Go to API Gateway > Your API > Resources
2. Select the GET method on `/get-booking-details/{id}` 
3. Click "Test" and enter a booking ID in the path parameter field
4. Add an Authorization header with your token
5. Click "Test" and check the response

### 6. Network Issues

If testing from local development:

1. CORS issues: Check that CORS is enabled in API Gateway
2. Local firewall: Make sure outbound connections to AWS services are allowed
3. VPN: Some VPNs might interfere with AWS API calls

## Frontend Debugging

Check the browser console for:

1. Network errors: Look for failed requests in the Network tab
2. Console errors: JavaScript errors might prevent proper API calls
3. Authentication: Verify the token exists in localStorage and is valid
