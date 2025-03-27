# AWS Resources Setup Guide for Beginners

## Introduction

This guide will help you set up the core AWS services needed for the PilotForce application. Even if you're new to AWS, following these step-by-step instructions will get your backend infrastructure running.

## Prerequisites

- An AWS account (you can create one at [aws.amazon.com](https://aws.amazon.com))
- AWS CLI installed on your computer 
  - [Installation guide for AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Your AWS credentials configured (access key and secret key)
  - After installing AWS CLI, run `aws configure` and follow the prompts

## What We're Building

We're setting up four main AWS services:
1. **API Gateway**: This creates an HTTP API that your frontend can call
2. **Lambda**: These are small functions that run your business logic code
3. **DynamoDB**: A database to store your application data
4. **S3**: Storage for files and images
5. **Cognito**: For user login and authentication

## Step 1: Setting Up Your API Gateway

API Gateway will be the entry point for all requests from your frontend.

```bash
# Create a new REST API
aws apigateway create-rest-api --name PilotForceAPI --description "API for PilotForce application"

# The command above will output an API ID - copy it and set it as a variable
# Replace "your_api_id_here" with the actual ID from the output
export API_ID=your_api_id_here

# For Windows Command Prompt, use this instead:
# set API_ID=your_api_id_here

# For Windows PowerShell, use this instead:
# $env:API_ID="your_api_id_here"
```

After running this command, you'll have created the basic API that will receive requests from your frontend.

## Step 2: Setting Up Lambda Functions

Lambda functions will contain your business logic. We'll create three separate functions for different parts of your application:

```bash
# First, create a simple Node.js file for user management
echo 'exports.handler = async (event) => { 
  return { 
    statusCode: 200, 
    body: JSON.stringify({ message: "User management function" }) 
  }; 
};' > user-management.js

# Zip the file for upload
zip user-management.zip user-management.js

# Create the Lambda function (replace your-account-id with your actual AWS account ID)
aws lambda create-function \
  --function-name PilotForce-UserManagement \
  --runtime nodejs18.x \
  --handler user-management.handler \
  --role arn:aws:iam::your-account-id:role/lambda-execution-role \
  --zip-file fileb://user-management.zip
```

> **Note**: You'll need to create an IAM role before running this command. See the "Creating an IAM Role" section below.

Repeat similar steps for booking and asset management functions.

## Step 3: Creating DynamoDB Tables

DynamoDB will store your application data:

```bash
# Create a table for storing user information
aws dynamodb create-table \
  --table-name PilotForce-Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create a table for storing bookings
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

These commands create two tables - one for users and one for bookings. The "billing-mode PAY_PER_REQUEST" means you only pay for what you use.

## Step 4: Setting Up S3 Buckets

S3 buckets will store your application's files and images:

```bash
# Create a bucket for user uploads (replace pilotforce-user-assets with a globally unique name)
aws s3 mb s3://pilotforce-user-assets --region us-east-1

# Create a simple CORS configuration file
echo '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}' > cors-config.json

# Apply the CORS configuration
aws s3api put-bucket-cors --bucket pilotforce-user-assets --cors-configuration file://cors-config.json
```

This creates an S3 bucket where your application can store files, and configures it to accept uploads from your frontend running at localhost:3000.

## Step 5: Setting Up Authentication with Cognito

Cognito will handle user registration and login:

```bash
# Create a user pool policy file
echo '{
  "PasswordPolicy": {
    "MinimumLength": 8,
    "RequireUppercase": true,
    "RequireLowercase": true,
    "RequireNumbers": true,
    "RequireSymbols": false
  }
}' > user-pool-policies.json

# Create a user pool
aws cognito-idp create-user-pool \
  --pool-name PilotForceUserPool \
  --auto-verify-attributes email \
  --schema Name=email,Required=true Name=name,Required=true \
  --policies file://user-pool-policies.json

# Note the User Pool ID from the output and use it in the next command
USER_POOL_ID=your-user-pool-id

# Create a user pool client
aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name PilotForceClient \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --supported-identity-providers COGNITO
```

This sets up Cognito to handle your user authentication with email verification.

## Creating an IAM Role

Before creating Lambda functions, you need an IAM role that gives them the necessary permissions:

```bash
# Create a trust policy document for Lambda
echo '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}' > lambda-trust-policy.json

# Create an IAM role for Lambda
aws iam create-role \
  --role-name lambda-execution-role \
  --assume-role-policy-document file://lambda-trust-policy.json

# Create a policy document with permissions for Lambda
echo '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/PilotForce-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::pilotforce-user-assets/*"
    }
  ]
}' > lambda-policy.json

# Attach the policy to the role
aws iam put-role-policy \
  --role-name lambda-execution-role \
  --policy-name lambda-permissions \
  --policy-document file://lambda-policy.json
```

This creates a role that Lambda functions can use to access DynamoDB, S3, and create logs.

## Connecting Everything Together

After setting up the individual components, you need to connect them:

1. Connect API Gateway to Lambda
2. Set up Cognito to authenticate requests
3. Configure Lambda to access DynamoDB

These connections will be covered in the next guides:
- Authentication Setup
- API Gateway Configuration
- Lambda Implementation

## Next Steps

Now that you've set up the basic AWS resources, proceed to:

1. [Authentication Setup](/Users/alexh/Documents/Internship/PilotForce/docs/backend/authentication-setup.md)
2. [API Gateway Configuration](/Users/alexh/Documents/Internship/PilotForce/docs/backend/api-gateway-configuration.md)
3. [S3 Setup](/Users/alexh/Documents/Internship/PilotForce/docs/backend/s3-setup.md)
4. [Frontend Integration](/Users/alexh/Documents/Internship/PilotForce/docs/backend/frontend-integration.md)

## Troubleshooting Common Issues

- **"An error occurred (AccessDenied) when calling..."**: Check that your AWS credentials are set up correctly with `aws configure`
- **"An error occurred (ResourceInUseException) when calling..."**: The resource (e.g., a table) already exists with that name
- **"An error occurred (InvalidParameterValueException) when calling..."**: Check your command syntax, especially JSON formatting

## Checking Your Setup

After completing the setup, verify that everything is working:

```bash
# List your API Gateway APIs
aws apigateway get-rest-apis

# List your Lambda functions
aws lambda list-functions

# List your DynamoDB tables
aws dynamodb list-tables

# List your S3 buckets
aws s3 ls
```
