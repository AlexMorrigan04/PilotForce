# API Gateway Configuration Guide

## Introduction

API Gateway serves as the front door for your backend services, allowing you to create, publish, maintain, monitor, and secure your API at any scale. This guide provides detailed instructions for setting up API Gateway to work with your Lambda functions, creating a robust API for your PilotForce application.

## API Design Principles

1. **RESTful Design**: Use resource-based URLs and appropriate HTTP methods
2. **Consistent Response Format**: Standardize response structures
3. **Versioning**: Prepare for future API changes with versioning
4. **Security**: Implement proper authentication and authorization
5. **Documentation**: Create clear API documentation for frontend developers

## API Structure

The PilotForce API will follow this structure:

```
/api/v1
  /users
    GET /                  # List users (admin only)
    POST /                 # Create user
    GET /{userId}          # Get user by ID
    PUT /{userId}          # Update user
    DELETE /{userId}       # Delete user
    
  /bookings
    GET /                  # List all bookings (admin only)
    POST /                 # Create booking
    GET /{bookingId}       # Get booking by ID
    PUT /{bookingId}       # Update booking
    DELETE /{bookingId}    # Cancel booking
    GET /user/{userId}     # Get bookings by user ID
    
  /assets
    GET /                  # List assets
    POST /                 # Create asset (returns presigned URL)
    GET /{assetId}         # Get asset metadata
    PUT /{assetId}         # Update asset metadata
    DELETE /{assetId}      # Delete asset
    GET /user/{userId}     # Get assets by user ID
    
  /auth
    POST /login            # Login
    POST /register         # Register
    POST /refresh-token    # Refresh token
    POST /forgot-password  # Forgot password
    POST /reset-password   # Reset password
```

## Step-by-Step API Gateway Setup

### 1. Creating the API

```bash
# Create a new REST API
aws apigateway create-rest-api \
  --name "PilotForce API" \
  --description "API for PilotForce application" \
  --endpoint-configuration "{ \"types\": [\"REGIONAL\"] }"

# Store the API ID for future commands
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='PilotForce API'].id" --output text)

# Get the root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text)
```

### 2. Creating Resources

```bash
# Create /api resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "api"

API_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api'].id" --output text)

# Create /api/v1 resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $API_RESOURCE_ID \
  --path-part "v1"

V1_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1'].id" --output text)

# Create domain resources
for DOMAIN in "users" "bookings" "assets" "auth"; do
  aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $V1_RESOURCE_ID \
    --path-part $DOMAIN
    
  DOMAIN_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/$DOMAIN'].id" --output text)
  
  # For resources that need user-specific endpoints
  if [[ $DOMAIN == "bookings" || $DOMAIN == "assets" ]]; then
    # Create /user resource
    aws apigateway create-resource \
      --rest-api-id $API_ID \
      --parent-id $DOMAIN_RESOURCE_ID \
      --path-part "user"
      
    USER_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/$DOMAIN/user'].id" --output text)
    
    # Create /user/{userId} resource
    aws apigateway create-resource \
      --rest-api-id $API_ID \
      --parent-id $USER_RESOURCE_ID \
      --path-part "{userId}"
  fi
  
  # Create /{resourceId} path parameter for each domain
  aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $DOMAIN_RESOURCE_ID \
    --path-part "{${DOMAIN}Id}"
done
```

### 3. Setting Up Methods and Integrations

Below is an example for the Users domain:

```bash
# Get the users resource ID
USERS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/users'].id" --output text)

# Create GET method to list users
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $COGNITO_AUTHORIZER_ID \
  --request-parameters "method.request.header.Authorization=true"

# Create Lambda integration for GET users
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:PilotForce-users-listUsers/invocations \
  --credentials arn:aws:iam::$ACCOUNT_ID:role/apigateway-lambda-role

# Method response for GET users
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-models '{"application/json":"Empty"}'

# Integration response for GET users
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-templates '{"application/json":""}'

# Create POST method to create user
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $COGNITO_AUTHORIZER_ID \
  --request-parameters "method.request.header.Authorization=true"

# Create Lambda integration for POST user
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:PilotForce-users-createUser/invocations \
  --credentials arn:aws:iam::$ACCOUNT_ID:role/apigateway-lambda-role

# Add similar configurations for other endpoints
```

### 4. Adding a Cognito Authorizer

```bash
# Create Cognito authorizer
aws apigateway create-authorizer \
  --rest-api-id $API_ID \
  --name PilotForceCognitoAuthorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns arn:aws:cognito-idp:$REGION:$ACCOUNT_ID:userpool/$USER_POOL_ID \
  --identity-source method.request.header.Authorization

COGNITO_AUTHORIZER_ID=$(aws apigateway get-authorizers --rest-api-id $API_ID --query "items[?name=='PilotForceCognitoAuthorizer'].id" --output text)
```

### 5. Setting Up Models for Request Validation

```bash
# Create a user model for request validation
aws apigateway create-model \
  --rest-api-id $API_ID \
  --name UserModel \
  --content-type "application/json" \
  --schema '{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "UserModel",
    "type": "object",
    "properties": {
      "email": {"type": "string", "format": "email"},
      "name": {"type": "string", "minLength": 2, "maxLength": 100},
      "phoneNumber": {"type": "string", "pattern": "^\\+?[0-9]{10,15}$"}
    },
    "required": ["email", "name"]
  }'

# Create a booking model
aws apigateway create-model \
  --rest-api-id $API_ID \
  --name BookingModel \
  --content-type "application/json" \
  --schema '{
    "$schema": "http://json-schema.org/draft-04/schema#",
    "title": "BookingModel",
    "type": "object",
    "properties": {
      "serviceType": {"type": "string"},
      "bookingDate": {"type": "string", "format": "date"},
      "bookingTime": {"type": "string", "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"},
      "details": {"type": "object"}
    },
    "required": ["serviceType", "bookingDate", "bookingTime"]
  }'
```

### 6. Enable CORS

```bash
# Function to enable CORS for a resource
enable_cors() {
  RESOURCE_ID=$1
  
  # Add OPTIONS method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE
    
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

# Get all resources and enable CORS
RESOURCES=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[*].id" --output text)
for RESOURCE_ID in $RESOURCES; do
  enable_cors $RESOURCE_ID
done
```

### 7. Deploy the API

```bash
# Create a deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name dev \
  --description "Development deployment"

# Get the invoke URL
INVOKE_URL=$(aws apigateway get-stage --rest-api-id $API_ID --stage-name dev --query "invokeUrl" --output text)
echo "API Invoke URL: $INVOKE_URL"
```

## API Gateway Configuration Best Practices

### 1. Request Validation

Configure API Gateway to validate requests before they reach your Lambda functions:

```bash
# Create a request validator
aws apigateway create-request-validator \
  --rest-api-id $API_ID \
  --name "PilotForce-Validator" \
  --validate-request-body \
  --validate-request-parameters

VALIDATOR_ID=$(aws apigateway get-request-validators \
  --rest-api-id $API_ID \
  --query "items[?name=='PilotForce-Validator'].id" \
  --output text)

# Update method to enable request validation
aws apigateway update-method \
  --rest-api-id $API_ID \
  --resource-id $USERS_RESOURCE_ID \
  --http-method POST \
  --patch-operations '[
    {
      "op": "replace",
      "path": "/requestValidatorId",
      "value": "'$VALIDATOR_ID'"
    },
    {
      "op": "replace",
      "path": "/requestModels/application~1json",
      "value": "UserModel"
    }
  ]'
```

### 2. API Caching

Enable caching to improve performance and reduce load on your backend:

```bash
# Enable caching for the API stage
aws apigateway update-stage \
  --rest-api-id $API_ID \
  --stage-name dev \
  --patch-operations '[
    {
      "op": "replace",
      "path": "/cacheClusterEnabled",
      "value": "true"
    },
    {
      "op": "replace",
      "path": "/cacheClusterSize",
      "value": "0.5"
    }
  ]'
```

### 3. Usage Plans and API Keys

Set up usage plans to control and monitor API usage:

```bash
# Create an API key
aws apigateway create-api-key \
  --name "PilotForce-ApiKey" \
  --enabled

API_KEY_ID=$(aws apigateway get-api-keys --query "items[?name=='PilotForce-ApiKey'].id" --output text)

# Create a usage plan
aws apigateway create-usage-plan \
  --name "PilotForce-UsagePlan" \
  --description "Usage plan for PilotForce API" \
  --throttle "rateLimit=10,burstLimit=20" \
  --quota "limit=1000,period=MONTH"

USAGE_PLAN_ID=$(aws apigateway get-usage-plans --query "items[?name=='PilotForce-UsagePlan'].id" --output text)

# Add API stage to usage plan
aws apigateway update-usage-plan \
  --usage-plan-id $USAGE_PLAN_ID \
  --patch-operations '[
    {
      "op": "add",
      "path": "/apiStages",
      "value": "{'$API_ID':'dev'}"
    }
  ]'

# Add API key to usage plan
aws apigateway create-usage-plan-key \
  --usage-plan-id $USAGE_PLAN_ID \
  --key-id $API_KEY_ID \
  --key-type "API_KEY"
```

### 4. Custom Domain Name

Set up a custom domain name for your API:

```bash
# Create a custom domain name (requires an SSL certificate in ACM)
aws apigateway create-domain-name \
  --domain-name "api.pilotforce.example.com" \
  --regional-certificate-arn $ACM_CERTIFICATE_ARN \
  --endpoint-configuration "types=REGIONAL"

# Create a base path mapping
aws apigateway create-base-path-mapping \
  --domain-name "api.pilotforce.example.com" \
  --rest-api-id $API_ID \
  --stage "dev"
```

### 5. WAF Integration

Integrate with AWS WAF to protect your API:

```bash
# Create a WAF WebACL (simplified - actual creation requires more steps)
aws wafv2 create-web-acl \
  --name "PilotForceAPIProtection" \
  --scope "REGIONAL" \
  --default-action "Allow={}" \
  --visibility-config "SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=PilotForceAPIProtection"

# Associate the WebACL with the API Gateway stage
aws wafv2 associate-web-acl \
  --web-acl-arn $WAF_WEB_ACL_ARN \
  --resource-arn arn:aws:apigateway:$REGION::/restapis/$API_ID/stages/dev
```

## Testing the API

### 1. Using Postman

1. Import the API definition into Postman
2. Set up an environment with variables:
   - `apiUrl`: Your API Gateway endpoint
   - `idToken`: Cognito ID token for authentication

3. Example request:
```
GET {{apiUrl}}/api/v1/users/{{userId}}
Authorization: {{idToken}}
```

### 2. Using curl

```bash
# Get user by ID
curl -X GET "https://api.pilotforce.example.com/api/v1/users/user123" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"

# Create booking
curl -X POST "https://api.pilotforce.example.com/api/v1/bookings" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "pilot_training",
    "bookingDate": "2023-08-15",
    "bookingTime": "14:30",
    "details": {
      "duration": 120,
      "notes": "First-time training session"
    }
  }'

# List user bookings
curl -X GET "https://api.pilotforce.example.com/api/v1/bookings/user/user123" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"

# Get presigned URL for file upload
curl -X POST "https://api.pilotforce.example.com/api/v1/assets/upload-url" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "pilot-certificate.pdf",
    "fileType": "application/pdf",
    "directory": "documents"
  }'
```

## Monitoring and Logging

### 1. Enable CloudWatch Logs

```bash
# Enable execution logging
aws apigateway update-stage \
  --rest-api-id $API_ID \
  --stage-name dev \
  --patch-operations '[
    {
      "op": "replace",
      "path": "/accessLogSettings/destinationArn",
      "value": "arn:aws:logs:REGION:ACCOUNT_ID:log-group:API-Gateway-Execution-Logs_'$API_ID'/dev"
    },
    {
      "op": "replace",
      "path": "/accessLogSettings/format",
      "value": "$context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime] \"$context.httpMethod $context.resourcePath $context.protocol\" $context.status $context.responseLength $context.requestId $context.extendedRequestId"
    }
  ]'
```

### 2. Set Up CloudWatch Alarms

```bash
# Create an alarm for 5XX errors
aws cloudwatch put-metric-alarm \
  --alarm-name PilotForce-API-5XX-Errors \
  --alarm-description "Alarm when 5XX errors exceed threshold" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ApiName,Value="PilotForce API" Name=Stage,Value=dev \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT_ID:PilotForce-Alerts
```

## Documentation

### 1. Generate API Documentation

```bash
# Create documentation parts
aws apigateway create-documentation-part \
  --rest-api-id $API_ID \
  --location "type=API" \
  --properties '{"description":"API for PilotForce application","version":"1.0.0"}'

# Create a documentation version
aws apigateway create-documentation-version \
  --rest-api-id $API_ID \
  --documentation-version "1.0.0" \
  --stage-name "dev"

# Export API documentation
aws apigateway get-export \
  --rest-api-id $API_ID \
  --stage-name dev \
  --export-type swagger \
  --accepts application/json \
  api-swagger.json
```

## Advanced Configuration

### 1. Request Throttling

```bash
# Set API-level throttling
aws apigateway update-stage \
  --rest-api-id $API_ID \
  --stage-name dev \
  --patch-operations '[
    {
      "op": "replace",
      "path": "/throttling/rateLimit",
      "value": "1000"
    },
    {
      "op": "replace",
      "path": "/throttling/burstLimit",
      "value": "2000"
    }
  ]'

# Set method-level throttling
aws apigateway update-stage \
  --rest-api-id $API_ID \
  --stage-name dev \
  --patch-operations '[
    {
      "op": "replace",
      "path": "/~1api~1v1~1bookings/POST/throttling/rateLimit",
      "value": "100"
    },
    {
      "op": "replace",
      "path": "/~1api~1v1~1bookings/POST/throttling/burstLimit",
      "value": "200"
    }
  ]'
```

### 2. Response Mapping Templates

Create response mappings for non-proxy integrations:

```bash
# Example for a custom response mapping template
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-templates '{
    "application/json": "#set($inputRoot = $input.path(\"$\"))\n{\n  \"responseData\": {\n    \"items\": [\n      #foreach($item in $inputRoot.Items)\n      {\n        \"id\": \"$item.id\",\n        \"name\": \"$item.name\"\n      }#if($foreach.hasNext),#end\n      #end\n    ]\n  }\n}"
  }'
```

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Verify OPTIONS methods are configured properly with correct headers |
| Authentication failures | Check Cognito authorizer configuration and token validity |
| 5XX errors | Check Lambda function execution and permissions |
| 403 Forbidden | Verify IAM roles and policies for API Gateway and Lambda |
| 429 Too Many Requests | Adjust throttling settings or implement client-side retry logic |

## Best Practices Summary

1. **Security**:
   - Use Cognito User Pools for authentication
   - Implement fine-grained authorizers
   - Enable AWS WAF for API protection
   - Use API keys for non-user requests

2. **Performance**:
   - Enable caching for read-heavy endpoints
   - Implement request validation to reduce invalid Lambda executions
   - Use stage variables for environment-specific configuration
   - Set appropriate throttling limits

3. **Organization**:
   - Use consistent URL structure and HTTP methods
   - Organize endpoints by domain
   - Implement API versioning from the start
   - Create models for request/response validation

4. **Monitoring**:
   - Enable detailed logging
   - Set up alarms for error rates
   - Configure usage plans for monitoring
   - Use X-Ray for tracing requests

## Next Steps

1. Set up CI/CD for API Gateway using AWS CloudFormation or Terraform
2. Implement more advanced authorization patterns
3. Create a developer portal using API Gateway's Developer Portal feature
4. Set up automated testing for API endpoints
5. Integrate with other AWS services like SQS for asynchronous operations