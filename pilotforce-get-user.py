import json
import boto3
import logging
import hmac
import hashlib
import base64
import os
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('Users')

# Configuration from environment variables with fallbacks
USER_POOL_ID = os.environ.get('USER_POOL_ID', 'eu-north-1_gejWyB4ZB')
CLIENT_ID = os.environ.get('CLIENT_ID', 're4qc69mpbck8uf69jd53oqpa')
CLIENT_SECRET = os.environ.get('CLIENT_SECRET', '1a798j6rng5ojs8u8r6sea9kjc93a0n937h6semd6ebhjg1i23dv')

logger.info(f"Using USER_POOL_ID: {USER_POOL_ID}")
logger.info(f"Using CLIENT_ID: {CLIENT_ID}")

def calculate_secret_hash(username):
    """Calculate the SECRET_HASH required by Cognito"""
    message = username + CLIENT_ID
    dig = hmac.new(
        key=CLIENT_SECRET.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

def get_users_by_company_id(company_id, user_role=None):
    """Get all users for a specific company from DynamoDB"""
    logger.info(f"Fetching users for company: {company_id}")
    
    try:
        # Query Users table by CompanyId
        filter_expression = Key('CompanyId').eq(company_id)
        
        # Add role filter if specified
        if user_role:
            filter_expression = filter_expression & Key('UserRole').eq(user_role)
        
        response = users_table.scan(
            FilterExpression=filter_expression
        )
        
        users = response.get('Items', [])
        
        # Handle pagination if there are more results
        while 'LastEvaluatedKey' in response:
            response = users_table.scan(
                FilterExpression=filter_expression,
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            users.extend(response.get('Items', []))
        
        logger.info(f"Found {len(users)} users for company {company_id}")
        
        # Fetch additional user attributes from Cognito for each user
        enhanced_users = []
        for user in users:
            user_id = user.get('UserId')
            try:
                # Get user from Cognito by username
                cognito_user = cognito.admin_get_user(
                    UserPoolId=USER_POOL_ID,
                    Username=user_id
                )
                
                # Extract Cognito attributes
                cognito_attributes = {}
                for attr in cognito_user.get('UserAttributes', []):
                    cognito_attributes[attr['Name']] = attr['Value']
                
                # Merge DynamoDB and Cognito data
                enhanced_user = {
                    **user,
                    'Email': cognito_attributes.get('email', user.get('Email', '')),
                    'Status': cognito_user.get('UserStatus', user.get('Status', 'UNKNOWN')),
                    'Enabled': cognito_user.get('Enabled', True),
                    'CognitoAttributes': cognito_attributes
                }
                
                enhanced_users.append(enhanced_user)
            except Exception as e:
                logger.warning(f"Error fetching Cognito details for user {user_id}: {str(e)}")
                enhanced_users.append(user)  # Still include the DynamoDB user data
        
        return enhanced_users
    except Exception as e:
        logger.error(f"Error fetching users for company {company_id}: {str(e)}")
        raise

def lambda_handler(event, context):
    # Standard CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
    }
    
    # Log the received event (sanitized)
    logger.info(f"Received event type: {type(event)}")
    if isinstance(event, dict):
        safe_keys = [k for k in event.keys() if k != 'password']
        logger.info(f"Event keys: {safe_keys}")
    
    # Handle OPTIONS request (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Check if user is requesting company users (new functionality)
        query_params = event.get('queryStringParameters', {}) or {}
        company_id = query_params.get('companyId')
        fetch_company_users = bool(company_id)
        
        username = event.get('username')
        password = event.get('password')
        
        access_token = None
        
        # If username and password are provided, authenticate directly
        if username and password:
            logger.info(f"Direct authentication attempt for user: {username}")
            
            try:
                # Calculate the SECRET_HASH required by Cognito
                secret_hash = calculate_secret_hash(username)
                
                # Try to use alternative authentication flow (USER_PASSWORD_AUTH)
                # instead of ADMIN_NO_SRP_AUTH which is not enabled for your client
                try:
                    # First try with InitiateAuth (regular user auth)
                    logger.info("Trying InitiateAuth with USER_PASSWORD_AUTH flow")
                    auth_response = cognito.initiate_auth(
                        ClientId=CLIENT_ID,
                        AuthFlow='USER_PASSWORD_AUTH',
                        AuthParameters={
                            'USERNAME': username,
                            'PASSWORD': password,
                            'SECRET_HASH': secret_hash
                        }
                    )
                except Exception as regular_auth_error:
                    logger.warning(f"Regular auth failed, trying admin auth: {str(regular_auth_error)}")
                    
                    # Fallback to admin auth with supported flow
                    logger.info("Trying AdminInitiateAuth with USER_PASSWORD_AUTH flow")
                    auth_response = cognito.admin_initiate_auth(
                        UserPoolId=USER_POOL_ID,
                        ClientId=CLIENT_ID,
                        AuthFlow='USER_PASSWORD_AUTH',
                        AuthParameters={
                            'USERNAME': username,
                            'PASSWORD': password,
                            'SECRET_HASH': secret_hash
                        }
                    )
                
                # Extract the access token from the authentication result
                auth_result = auth_response.get('AuthenticationResult', {})
                access_token = auth_result.get('AccessToken')
                id_token = auth_result.get('IdToken')
                refresh_token = auth_result.get('RefreshToken')
                
                if not access_token:
                    logger.error("Authentication succeeded but no access token was returned")
                    return {
                        'statusCode': 500,
                        'headers': headers,
                        'body': json.dumps({'message': 'Authentication succeeded but no access token was returned'})
                    }
                
                logger.info(f"Successfully authenticated user: {username}")
                
                # If this is just an authentication request (not a user data request),
                # return the tokens immediately
                if event.get('authOnly'):
                    user_info = cognito.get_user(AccessToken=access_token)
                    user_attributes = {}
                    for attr in user_info.get('UserAttributes', []):
                        user_attributes[attr['Name']] = attr['Value']
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'Authentication successful',
                            'tokens': {
                                'accessToken': access_token,
                                'idToken': id_token,
                                'refreshToken': refresh_token
                            },
                            'user': {
                                'id': user_attributes.get('sub'),
                                'username': user_info.get('Username'),
                                'email': user_attributes.get('email')
                            }
                        })
                    }
                
            except Exception as auth_error:
                logger.error(f"Authentication error: {str(auth_error)}")
                
                # Check for specific Cognito error for helpful error message
                error_message = str(auth_error)
                if "Auth flow not enabled for this client" in error_message:
                    error_message = "Authentication flow not enabled for this client. Please enable USER_PASSWORD_AUTH in your Cognito client settings."
                
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Authentication failed',
                        'error': error_message,
                        'solution': 'Go to AWS Cognito User Pool, select your client, and enable USER_PASSWORD_AUTH flow'
                    })
                }
        
        # If we didn't authenticate with username/password, extract token from header
        if not access_token:
            auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
            
            if not auth_header:
                logger.warning("No Authentication token provided (neither username/password nor Authorization header)")
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'message': 'Authorization token required'})
                }
            
            # Remove Bearer prefix if present
            access_token = auth_header.replace('Bearer ', '')
        
        logger.info(f"Using access token: {access_token[:10]}...")
        
        # Get the current user's information from Cognito
        try:
            user_info = cognito.get_user(AccessToken=access_token)
            logger.info(f"Successfully retrieved user from Cognito")
            
            # Extract user attributes
            user_attributes = {}
            for attr in user_info.get('UserAttributes', []):
                user_attributes[attr['Name']] = attr['Value']
            
            # Get the user's ID (sub)
            user_id = user_attributes.get('sub')
            
            # Check if fetching company users is requested
            if fetch_company_users:
                # Log detailed information about the request
                logger.info(f"Company users request info: companyId={company_id}, authenticated user_id={user_id}")
                
                # Check if the current user has admin permissions to fetch company users
                user_role = user_attributes.get('custom:userRole', '').lower()
                is_admin = user_role in ['admin', 'accountadmin', 'companyadmin']
                logger.info(f"User role: {user_role}, is_admin: {is_admin}")
                
                # Get additional DB info for the current user
                db_response = users_table.get_item(Key={'UserId': user_id})
                user_data = db_response.get('Item', {})
                
                # Check if the company ID matches the user's company
                user_company_id = user_data.get('CompanyId') or user_attributes.get('custom:companyId')
                logger.info(f"User's CompanyId: {user_company_id}, requested companyId: {company_id}")
                
                if not is_admin and company_id != user_company_id:
                    logger.warning(f"User {user_id} attempted to access company {company_id} without permission")
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'message': 'Insufficient permissions to access company data'})
                    }
                
                # Fetch all users for the company
                try:
                    logger.info(f"Calling get_users_by_company_id for company {company_id}")
                    company_users = get_users_by_company_id(company_id)
                    logger.info(f"Successfully fetched {len(company_users)} users for company {company_id}")
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps({
                            'companyId': company_id,
                            'users': company_users
                        })
                    }
                except Exception as e:
                    logger.error(f"Error in company users fetch: {str(e)}")
                    return {
                        'statusCode': 500,
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'Error fetching company users',
                            'error': str(e)
                        })
                    }
            
            # Handle specific user request from here
            specific_user_id = query_params.get('userId')
            
            # If a specific user is requested, check permissions
            if specific_user_id and specific_user_id != user_id:
                # Check if the current user has admin permissions
                user_role = user_attributes.get('custom:userRole', '').lower()
                
                if user_role not in ['admin', 'accountadmin', 'companyadmin']:
                    logger.warning(f"User {user_id} attempted to access data for {specific_user_id} without permission")
                    return {
                        'statusCode': 403,
                        'headers': headers,
                        'body': json.dumps({'message': 'Insufficient permissions to access other user data'})
                    }
                
                # Use the requested user ID instead
                logger.info(f"Admin {user_id} accessing data for user {specific_user_id}")
                user_id = specific_user_id
                
                # Get the specific user's information
                try:
                    admin_user_info = cognito.admin_get_user(
                        UserPoolId=USER_POOL_ID,
                        Username=specific_user_id
                    )
                    
                    # Update user attributes with requested user's attributes
                    user_attributes = {}
                    for attr in admin_user_info.get('UserAttributes', []):
                        user_attributes[attr['Name']] = attr['Value']
                        
                    # Update username with requested user's username
                    user_info['Username'] = admin_user_info.get('Username')
                except Exception as e:
                    logger.error(f"Error getting specific user: {str(e)}")
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'message': f'User not found: {specific_user_id}'})
                    }
            
            # Get additional user information from DynamoDB
            db_response = None
            try:
                db_response = users_table.get_item(Key={'UserId': user_id})
                user_data = db_response.get('Item', {})
                logger.info(f"Retrieved user data from DynamoDB for user {user_id}")
            except Exception as db_error:
                logger.error(f"DynamoDB error: {str(db_error)}")
                user_data = {}
            
            # Combine user information from Cognito and DynamoDB
            user_response = {
                'id': user_id,
                'username': user_info.get('Username'),
                'email': user_attributes.get('email', ''),
                'name': user_attributes.get('name', ''),
                'given_name': user_attributes.get('given_name', ''),
                'family_name': user_attributes.get('family_name', ''),
                'phoneNumber': user_attributes.get('phone_number', ''),
                'companyId': user_data.get('CompanyId') or user_attributes.get('custom:companyId', ''),
                'role': user_data.get('UserRole') or user_attributes.get('custom:userRole', 'User'),
                'status': 'Active' if user_data.get('UserAccess') else 'Pending',
                'createdAt': user_data.get('CreatedAt') or datetime.now().isoformat()
            }
            
            # Add any custom attributes
            for attr_name, attr_value in user_attributes.items():
                if attr_name.startswith('custom:') and attr_name not in ['custom:companyId', 'custom:userRole']:
                    # Extract the name without the 'custom:' prefix
                    custom_key = attr_name.replace('custom:', '')
                    user_response[custom_key] = attr_value
            
            # Return the user information
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'user': user_response})
            }
        
        except cognito.exceptions.NotAuthorizedException as e:
            logger.warning(f"Invalid or expired token: {str(e)}")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Invalid or expired token', 'error': str(e)})
            }
        
        except Exception as token_error:
            logger.error(f"Error processing token: {str(token_error)}")
            raise
    
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}")
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
    # Test event with username/password
    test_event_auth = {
        'username': 'test@example.com',
        'password': 'Password123!'
    }
    
    # Test event with access token
    test_event_token = {
        'httpMethod': 'GET',
        'headers': {
            'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
        }
    }
    
    # Test event for authentication only
    test_event_auth_only = {
        'username': 'test@example.com',
        'password': 'Password123!',
        'authOnly': True
    }
    
    # Uncomment to test
    # result = lambda_handler(test_event_auth, None)
    # print(json.dumps(json.loads(result['body']), indent=2))
