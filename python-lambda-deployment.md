# Python Lambda Deployment Instructions for PilotForce API

## Why Convert to Python?

Converting the Lambda functions from JavaScript to Python solves several issues:

1. **No ES Module Import Issues**: Python doesn't have the same module system complexities that were causing problems with the AWS SDK in your JavaScript files.
2. **Built-in AWS SDK**: The boto3 library comes pre-installed in Lambda's Python runtime, so there's no need to include it in your deployment package.
3. **Simpler Serialization**: Python's JSON handling is more straightforward, especially for DynamoDB responses.
4. **Improved Error Handling**: The Python code includes comprehensive error handling and logging.

## Deployment Steps

### 1. Update Lambda Functions in AWS Console

1. Go to the AWS Lambda console
2. Select your function (e.g., `pilotforce-get-assets`)
3. Change the runtime from Node.js to **Python 3.10** or **Python 3.11**
4. Upload the Python file:
   - Click on "Upload from" > ".zip file"
   - Create a zip file containing just the Python file
   - Upload the zip file
5. Update the handler:
   - For `pilotforce-get-assets`: Change to `pilotforce-get-assets.lambda_handler`
   - For `pilotforce-get-asset-details`: Change to `pilotforce-get-asset-details.lambda_handler`
6. Increase timeout to at least 30 seconds
7. Click "Save"

### 2. Verify API Gateway Configuration

1. Go to API Gateway console
2. Select your API ("PilotForceAPI")
3. For both endpoints (`/assets` and `/assets/{id}`), ensure:
   - The integration type is "Lambda Function"
   - The Lambda Proxy integration is enabled (checked)
   - The Lambda function is properly selected
   - No mapping templates are in use (they're not needed with proxy integration)

### 3. Deploy API Changes

1. In API Gateway, click "Actions" > "Deploy API"
2. Select "prod" as the deployment stage
3. Click "Deploy"
4. Note the API URL, which should remain the same

## Required Permissions

Make sure your Lambda execution role has these permissions:

1. **AWSLambdaBasicExecutionRole** - For CloudWatch Logs
2. **AmazonDynamoDBReadOnlyAccess** - For reading from DynamoDB
3. **AmazonCognitoReadOnly** - For querying Cognito user pools

## Testing the Deployed Functions

Test your Lambda functions with appropriate API Gateway test events:

```json
{
  "httpMethod": "GET",
  "headers": {
    "Authorization": "Bearer YOUR_ID_TOKEN"
  },
  "queryStringParameters": {
    "companyId": "YOUR_COMPANY_ID"
  }
}
```

For the asset details endpoint, include the pathParameters:

```json
{
  "httpMethod": "GET",
  "headers": {
    "Authorization": "Bearer YOUR_ID_TOKEN"
  },
  "pathParameters": {
    "id": "ASSET_ID"
  }
}
```

## Advantages of Python for AWS Lambda

1. **Performance**: Python typically has fast cold start times in Lambda
2. **Built-in Libraries**: Many AWS services have well-supported Python SDKs
3. **Simple Syntax**: Python's clean syntax makes maintenance easier
4. **JSON Handling**: Better handling of DynamoDB responses with automatic type conversion
5. **Error Handling**: Comprehensive try/except blocks are more readable

## Troubleshooting

If you encounter issues:

1. **Check CloudWatch Logs** - Python Lambda functions log detailed information
2. **Verify IAM Permissions** - Make sure the execution role has proper permissions
3. **Test Locally** - You can test Python Lambda functions locally using the AWS SAM CLI
4. **Check API Gateway Logs** - Enable access logging in API Gateway to debug request issues

No changes to your frontend code are needed, as the API interface remains identical.
