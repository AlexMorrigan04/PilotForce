# PilotForce Company Assignment Functionality

This document outlines the implementation of company assignment logic in the PilotForce application.

## Overview

When a user signs up with their email address, the system will:

1. Extract the domain from their email (e.g., "company.co.uk" from "user@company.co.uk")
2. Check if any existing users are associated with this domain
3. If there are users with the same domain, assign the new user to the same company
4. If this is the first user with this domain, create a new company and assign the user to it

## Architecture

The solution uses AWS services:

- **DynamoDB** - Two tables: `Users` and `Companies`
- **Lambda** - Functions to handle signup and company assignment
- **Cognito** - For user authentication and storing user attributes
- **API Gateway** - For exposing company management endpoints

## Implementation Steps

### 1. Update DynamoDB Tables

#### Companies Table
- Primary Key: `CompanyId` (string)
- Global Secondary Index (GSI): `EmailDomainIndex` on `EmailDomain` attribute
- Additional attributes:
  - `CompanyName` (string)
  - `CreatedAt` (string - ISO date)
  - `UpdatedAt` (string - ISO date)
  - `Status` (string - "ACTIVE", "INACTIVE", etc.)
  - `OwnerUserId` (string - first user who created the company)

#### Users Table
- Primary Key: `UserId` (string)
- Global Secondary Indexes (GSIs):
  - `CompanyIdIndex` on `CompanyId` attribute
  - `EmailIndex` on `Email` attribute
  - `UsernameIndex` on `Username` attribute

### 2. Company Assignment Logic

During signup:

1. Extract email domain from user's email
2. Query Companies table using EmailDomainIndex to find matching companies
3. If a match exists, use that CompanyId for the new user
4. If no match exists, create a new Company entry and assign the new user as owner

### 3. Lambda Function Modifications

The signup Lambda function needs to be updated to include company assignment logic.

### 4. User Roles within Companies

- `CompanyAdmin` - First user to sign up with a domain or explicitly assigned
- `User` - Regular users within a company

## Code Modifications

### 1. Update pilotforce_signup.py
- Add email domain extraction
- Add company lookup and creation logic
- Update user creation to include company assignment

### 2. Add company management functions
- Create new Lambda for company management (optional at this stage)
- Add functions to get company details, list users in a company, etc.

### 3. Frontend changes
- Update UI to display company information
- Add company settings for company admins

## Detailed Implementation

### Signup Process Flow

1. User submits signup form with email, username, password, etc.
2. Lambda processes signup request:
   - Validates user input
   - Extracts email domain
   - Looks up domain in Companies table
   - Creates new company if needed or uses existing company ID
   - Creates user in Cognito
   - Stores user data in DynamoDB with company relationship
3. User confirmed and associated with their company

### Company Management Flow

For future implementation:
1. Company admins can invite new users (bypassing domain check)
2. Company settings management
3. User role management within companies

## API Gateway Setup

### 1. Create New API Resources

Add the following resources to your existing API Gateway:

1. **Resource: `/companies`**
   - Methods: GET (list all companies)

2. **Resource: `/companies/{companyId}`**
   - Path Parameter: `companyId`
   - Methods: 
     - GET (get company details)
     - PUT (update company)
     - DELETE (delete/deactivate a company)

3. **Resource: `/companies/{companyId}/users`**
   - Path Parameter: `companyId`
   - Methods: GET (list users for a company)

### 2. Integration with Lambda

For each endpoint, set up Lambda integrations:

1. **Lambda Integration for Company Endpoints**
   - Lambda Function: `pilotforce-company-management`
   - Integration Type: Lambda Proxy Integration
   - Mapping: Pass all request parameters to Lambda

2. **Configure Request/Response Mappings**
   - Set Content-Type to `application/json`
   - Configure CORS headers for all responses

### 3. API Gateway Method Configurations

For each method, configure:

1. **Method Request**
   - Authorization: `AWS_IAM` or Cognito Authorizer
   - Required Path Parameters: `companyId` (where applicable)
   - Request Validator: Validate body, parameters, and headers

2. **Integration Request**
   - Integration Type: Lambda Proxy
   - Lambda Function: `pilotforce-company-management`

3. **Method Response**
   - Status Codes: 200, 400, 401, 403, 404, 500
   - Response Models: application/json
   - Response Headers: CORS headers

4. **Integration Response**
   - Handle different response codes from Lambda

### 4. CORS Configuration

Enable CORS for all endpoints:

1. Configure allowed origins (e.g., `*` for development, your domain for production)
2. Allow methods: `OPTIONS`, `GET`, `PUT`, `POST`, `DELETE`
3. Allow headers: `Content-Type`, `Authorization`, `X-Api-Key`, etc.
4. Create OPTIONS method for each resource to handle preflight requests

### 5. API Deployment

1. Create a new deployment stage (e.g., `dev`, `prod`)
2. Deploy the API to the stage
3. Note the API URL for use in the frontend

### 6. API Gateway Policy

Example Lambda permission policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:[REGION]:[ACCOUNT_ID]:function:pilotforce-company-management",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:execute-api:[REGION]:[ACCOUNT_ID]:[API_ID]/*"
        }
      }
    }
  ]
}
```

### 7. Update OpenAPI/Swagger Definition

Update your OpenAPI/Swagger definition with the new endpoints:

```yaml
openapi: 3.0.1
info:
  title: PilotForce API
  description: API for PilotForce application with company management
  version: "2.0.0"
paths:
  /companies/{companyId}:
    get:
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: "Company retrieved successfully"
      security:
        - cognito: []
    put:
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        200:
          description: "Company updated successfully"
      security:
        - cognito: []
  /companies/{companyId}/users:
    get:
      parameters:
        - name: companyId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: "Users retrieved successfully"
      security:
        - cognito: []
```

## Testing Strategy

1. Test signup with new email domain (should create new company)
2. Test signup with existing email domain (should assign to existing company)
3. Test edge cases:
   - Personal email domains (gmail.com, outlook.com)
   - Subdomains (team.company.com)
   - Invalid or malformed emails

## Security Considerations

1. Ensure only company admins can modify company settings
2. Consider verification of domain ownership for sensitive operations
3. Handle personal email domains appropriately

## Migration & Deployment

1. Update Lambda functions
2. Deploy changes to the dev environment
3. Test thoroughly before promoting to production
4. Consider handling existing users during migration

## Troubleshooting API Gateway Issues

Common issues and solutions when setting up API Gateway:

1. **CORS errors in browser**
   - Ensure OPTIONS method is configured for each resource
   - Verify CORS headers are properly set in API Gateway responses
   - Check that `Access-Control-Allow-Origin` includes your frontend domain

2. **Lambda integration errors**
   - Verify Lambda function ARN is correct
   - Check Lambda execution permissions
   - Review CloudWatch logs for Lambda function errors

3. **Authentication issues**
   - Ensure proper Cognito user pool or IAM authentication is configured
   - Verify JWT token validation settings
   - Check scopes and claims required for authorization

4. **Deployment issues**
   - Always create a new deployment after making changes
   - Invalidate CloudFront cache if using CloudFront
   - Check API Gateway stage variables if used

---

This implementation will create a seamless user experience where users from the same organization are automatically grouped together, while maintaining security and flexibility for diverse use cases.
