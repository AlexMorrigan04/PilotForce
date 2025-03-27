# AWS Resources Setup Guide

## Prerequisites

- AWS Account with administrative access
- AWS CLI installed and configured
- Basic knowledge of AWS services

## Setting Up Core AWS Services

### 1. API Gateway Setup

```bash
# Create a new REST API
aws apigateway create-rest-api --name PilotForceAPI --description "API for PilotForce application"

# Note the API ID returned from the command above and use it in subsequent commands
export API_ID=your_api_id_here
```

#### API Gateway Configuration Best Practices

- Use resource-based routing (e.g., `/users`, `/bookings`)
- Set up proper CORS configuration for browser access
- Implement request validation
- Configure appropriate throttling and usage plans

### 2. Lambda Functions Setup

Create separate Lambda functions for different business domains:

```bash
# Create a Lambda function for user management
aws lambda create-function \
  --function-name PilotForce-UserManagement \
  --runtime nodejs18.x \
  --handler index.handler \
  --role arn:aws:iam::your-account-id:role/lambda-execution-role \
  --zip-file fileb://user-management.zip

# Create a Lambda function for booking management
aws lambda create-function \
  --function-name PilotForce-BookingManagement \
  --runtime nodejs18.x \
  --handler index.handler \
  --role arn:aws:iam::your-account-id:role/lambda-execution-role \
  --zip-file fileb://booking-management.zip

# Create a Lambda function for asset management
aws lambda create-function \
  --function-name PilotForce-AssetManagement \
  --runtime nodejs18.x \
  --handler index.handler \
  --role arn:aws:iam::your-account-id:role/lambda-execution-role \
  --zip-file fileb://asset-management.zip
```

### 3. DynamoDB Tables Setup

```bash
# Create Users table
aws dynamodb create-table \
  --table-name PilotForce-Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create Bookings table
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

# Create Assets table
aws dynamodb create-table \
  --table-name PilotForce-Assets \
  --attribute-definitions AttributeName=assetId,AttributeType=S \
  --key-schema AttributeName=assetId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 4. S3 Bucket Setup for Assets and Images

```bash
# Create S3 bucket for user uploads
aws s3 mb s3://pilotforce-user-assets

# Set CORS configuration for the bucket
aws s3api put-bucket-cors --bucket pilotforce-user-assets --cors-configuration file://cors-config.json

# Apply bucket policy to restrict access
aws s3api put-bucket-policy --bucket pilotforce-user-assets --policy file://bucket-policy.json
```

Example `cors-config.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-frontend-domain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 5. Cognito Setup for Authentication

```bash
# Create a User Pool
aws cognito-idp create-user-pool \
  --pool-name PilotForceUserPool \
  --auto-verify-attributes email \
  --schema Name=email,Required=true Name=name,Required=true \
  --policies file://user-pool-policies.json

# Create a User Pool Client
aws cognito-idp create-user-pool-client \
  --user-pool-id your-user-pool-id \
  --client-name PilotForceClient \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --supported-identity-providers COGNITO
```

### 6. CloudFront Distribution for Frontend

```bash
# Create CloudFront distribution for the frontend
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

## IAM Setup

Set up appropriate IAM roles and policies for Lambda functions to access DynamoDB, S3, and other necessary resources:

```bash
# Create IAM policy document for Lambda execution
cat > lambda-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
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
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create IAM role for Lambda
aws iam create-role \
  --role-name lambda-execution-role \
  --assume-role-policy-document file://lambda-trust-policy.json

# Attach policy to role
aws iam put-role-policy \
  --role-name lambda-execution-role \
  --policy-name lambda-permissions \
  --policy-document file://lambda-policy.json
```

## Creating a Deployment Pipeline

For automating the deployment process, consider setting up AWS CodePipeline:

```bash
# Create a CodePipeline for CI/CD
aws codepipeline create-pipeline --cli-input-json file://codepipeline-config.json
```

Example `codepipeline-config.json` (simplified):
```json
{
  "pipeline": {
    "name": "PilotForce-Pipeline",
    "roleArn": "arn:aws:iam::your-account-id:role/AWSCodePipelineServiceRole",
    "artifactStore": {
      "type": "S3",
      "location": "pilotforce-pipeline-artifacts"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "Source",
            "actionTypeId": {
              "category": "Source",
              "owner": "AWS",
              "provider": "CodeStarSourceConnection",
              "version": "1"
            },
            "configuration": {
              "ConnectionArn": "arn:aws:codestar-connections:region:account-id:connection/connection-id",
              "FullRepositoryId": "your-github-username/your-repo-name",
              "BranchName": "main"
            },
            "outputArtifacts": [
              {
                "name": "SourceCode"
              }
            ]
          }
        ]
      },
      {
        "name": "Build",
        "actions": [
          {
            "name": "BuildLambdaFunctions",
            "actionTypeId": {
              "category": "Build",
              "owner": "AWS",
              "provider": "CodeBuild",
              "version": "1"
            },
            "configuration": {
              "ProjectName": "PilotForce-Lambda-Build"
            },
            "inputArtifacts": [
              {
                "name": "SourceCode"
              }
            ],
            "outputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ]
          }
        ]
      },
      {
        "name": "Deploy",
        "actions": [
          {
            "name": "DeployLambdaFunctions",
            "actionTypeId": {
              "category": "Deploy",
              "owner": "AWS",
              "provider": "CloudFormation",
              "version": "1"
            },
            "configuration": {
              "ActionMode": "CREATE_UPDATE",
              "StackName": "PilotForce-Lambda-Stack",
              "TemplatePath": "BuildOutput::packaged.yaml",
              "Capabilities": "CAPABILITY_IAM"
            },
            "inputArtifacts": [
              {
                "name": "BuildOutput"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Setting Up CloudWatch for Monitoring

```bash
# Create a CloudWatch Dashboard for monitoring
aws cloudwatch put-dashboard --dashboard-name PilotForce-Dashboard --dashboard-body file://dashboard-config.json

# Create an alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name PilotForce-Lambda-Errors \
  --alarm-description "Alarm when Lambda errors exceed threshold" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=PilotForce-UserManagement \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:region:account-id:PilotForce-Alerts
```

## Next Steps

After setting up these AWS resources, proceed to:

1. Configure API endpoints in API Gateway (see api-gateway-configuration.md)
2. Implement Lambda functions (see lambda-implementation.md)
3. Design your DynamoDB schema (see dynamodb-schema-design.md)
4. Set up authentication flow (see authentication-setup.md)

## Cost Optimization Tips

1. **Use Pay-Per-Request billing** for DynamoDB tables in development
2. **Enable auto-scaling** for production workloads
3. **Set up lifecycle policies** for S3 to transition infrequently accessed data
4. **Use provisioned concurrency** only for Lambda functions that need it
5. **Monitor costs** using AWS Cost Explorer and set up budgets

## Security Best Practices

1. **Follow the principle of least privilege** when creating IAM roles
2. **Enable encryption** for all data at rest and in transit
3. **Set up CloudTrail** for auditing and compliance
4. **Implement WAF** to protect API Gateway from common attacks
5. **Regularly update** dependencies and scan for vulnerabilities

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| Lambda function times out | Increase timeout setting or optimize code |
| API Gateway CORS errors | Verify CORS configuration in API Gateway |
| DynamoDB throughput exceeded | Enable auto-scaling or increase capacity |
| S3 access denied | Check bucket policy and IAM permissions |
| Cognito authentication fails | Verify client configuration and auth flow |
