import json
import boto3
import logging
from datetime import datetime
import os
import hmac
import hashlib
import base64

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients with proper configuration
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('Users')

# Get Cognito configuration from environment variables with hardcoded fallbacks
USER_POOL_ID = os.environ.get('USER_POOL_ID', 'eu-north-1_gejWyB4ZB')
CLIENT_ID = os.environ.get('CLIENT_ID', 're4qc69mpbck8uf69jd53oqpa')
CLIENT_SECRET = os.environ.get('CLIENT_SECRET', '1a798j6rng5ojs8u8r6sea9kjc93a0n937h6semd6ebhjg1i23dv')  # From cognitoUtils.ts

# Log the configuration for debugging
logger.info(f"Using USER_POOL_ID: {USER_POOL_ID}")
logger.info(f"Using CLIENT_ID: {CLIENT_ID}")
logger.info(f"Using CLIENT_SECRET: {'*' * 10}")  # Don't log actual secret

def calculate_secret_hash(username):
    """Calculate the SECRET_HASH required by Cognito for clients with secrets"""
    message = username + CLIENT_ID
    dig = hmac.new(
        key=CLIENT_SECRET.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

def lambda_handler(event, context):
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
    }
    
    # Log the event for troubleshooting (without sensitive data)
    logger.info(f"Received event type: {type(event)}")
    if isinstance(event, dict):
        safe_keys = [k for k in event.keys() if k != 'password']
        logger.info(f"Event keys: {safe_keys}")
        if 'headers' in event:
            logger.info(f"Headers: {list(event['headers'].keys())}")
    
    # Handle OPTIONS requests (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Check if we're receiving username/password for direct login during testing
        username = event.get('username')
        password = event.get('password')
        
        # If we have username and password, do direct login first to get a token
        if username and password:
            logger.info(f"Detected direct login test for: {username}")
            try:
                # Calculate SECRET_HASH required for the client
                secret_hash = calculate_secret_hash(username)
                logger.info("Calculated SECRET_HASH for authentication")
                
                # First authenticate the user to get tokens
                auth_response = cognito.admin_initiate_auth(
                    UserPoolId=USER_POOL_ID,
                    ClientId=CLIENT_ID,
                    AuthFlow='ADMIN_NO_SRP_AUTH',
                    AuthParameters={
                        'USERNAME': username,
                        'PASSWORD': password,
                        'SECRET_HASH': secret_hash
                    }
                )
                
                # Extract the access token for subsequent user data retrieval
                auth_result = auth_response.get('AuthenticationResult', {})
                access_token = auth_result.get('AccessToken')
                
                if not access_token:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'Authentication successful but no access token received'
                        })
                    }
                
                logger.info(f"Successfully authenticated user during testing: {username}")
                
                # Now we can proceed to get user data with the token
                event = {
                    'headers': {
                        'Authorization': f"Bearer {access_token}"
                    }
                }
            except Exception as auth_error:
                logger.error(f"Error authenticating during test: {str(auth_error)}")
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Authentication failed during testing',
                        'error': str(auth_error)
                    })
                }
        
        # Extract authentication token from headers
        auth_header = None
        
        # Look for the authorization header in different places
        if 'headers' in event:
            auth_header = event['headers'].get('Authorization') or event['headers'].get('authorization')
            logger.info(f"Headers found in event: {list(event['headers'].keys())}")
        
        # Try multiValueHeaders for older API Gateway versions
        if not auth_header and 'multiValueHeaders' in event:
            multi_headers = event.get('multiValueHeaders', {})
            auth_values = multi_headers.get('Authorization') or multi_headers.get('authorization')
            if auth_values and isinstance(auth_values, list) and len(auth_values) > 0:
                auth_header = auth_values[0]
                logger.info("Found token in multiValueHeaders")
        
        # Check if we found a token
        if not auth_header:
            logger.warning("No authorization header found")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Authorization token required'})
            }
        
        # Remove 'Bearer ' prefix if present
        token = auth_header.replace('Bearer ', '')
        logger.info(f"Found token: {token[:10]}...")
        
        # Get user info from Cognito using the token
        try:
            user_info = cognito.get_user(AccessToken=token)
            logger.info(f"Successfully retrieved Cognito user information")
        except Exception as e:
            logger.error(f"Error getting user from Cognito: {str(e)}")
            if 'NotAuthorizedException' in str(e):
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'message': 'Invalid or expired token', 'error': str(e)})
                }
            raise
        
        # Extract user attributes from Cognito response
        user_attributes = {}
        for attr in user_info.get('UserAttributes', []):
            user_attributes[attr['Name']] = attr['Value']
        
        # Get user ID (sub)
        user_id = user_attributes.get('sub')
        if not user_id:
            logger.error("User ID (sub) not found in user attributes")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'User ID not found in token'})
            }
        
        # Get additional user information from DynamoDB
        try:
            db_response = users_table.get_item(Key={'UserId': user_id})
            user_data = db_response.get('Item', {})
            logger.info(f"Retrieved user data from DynamoDB: {user_id}")
        except Exception as e:
            logger.error(f"Error retrieving user data from DynamoDB: {str(e)}")
            user_data = {}
        
        # Combine data from Cognito and DynamoDB
        response_user = {
            'id': user_id,
            'username': user_info.get('Username'),
            'email': user_attributes.get('email', ''),
            'companyId': user_data.get('CompanyId') or user_attributes.get('custom:companyId', ''),
            'role': user_data.get('UserRole') or user_attributes.get('custom:userRole', 'User'),
            'phoneNumber': user_data.get('PhoneNumber') or user_attributes.get('phone_number', ''),
            'status': 'Active' if user_data.get('UserAccess') else 'Pending',
            'createdAt': user_data.get('CreatedAt') or datetime.now().isoformat(),
            'name': user_attributes.get('name', ''),
            'given_name': user_attributes.get('given_name', ''),
            'family_name': user_attributes.get('family_name', '')
        }
        
        # Return successful response
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'user': response_user})
        }
        
    except Exception as e:
        # Log and handle any unexpected errors
        logger.error(f"Unexpected error getting user data: {str(e)}")
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }

# For local testing
if __name__ == "__main__":
    # Test event with authorization header
    test_event = {
        "httpMethod": "GET",
        "headers": {
            "Authorization": "Bearer YOUR_TEST_TOKEN"
        }
    }
    
    # Test event with username/password for direct testing
    test_event_with_creds = {
        "username": "test@example.com",
        "password": "YourPassword123!"
    }
    
    # For debugging:
    # print(lambda_handler(test_event_with_creds, None))
