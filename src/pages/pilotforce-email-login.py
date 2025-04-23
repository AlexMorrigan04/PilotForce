import json
import boto3
import os
import hmac
import hashlib
import base64
from datetime import datetime
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

# Initialize AWS clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

# Get Users table name from environment variable or use default
USERS_TABLE = os.environ.get('USERS_TABLE', 'Users')

def get_secret_hash(username, client_id, client_secret):
    """Calculate the SECRET_HASH required by Cognito when client secret is configured"""
    message = username + client_id
    dig = hmac.new(
        str(client_secret).encode('utf-8'),
        msg=str(message).encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

def check_user_access(user_id=None, username=None, email=None):
    """
    Check if the user has been approved for access by admin
    Returns a tuple: (has_access, user_data, message)
    """
    try:
        users_table = dynamodb.Table(USERS_TABLE)
        user_item = None
        
        # First try by UserID
        if user_id:
            response = users_table.get_item(Key={'UserId': user_id})
            if 'Item' in response:
                user_item = response['Item']
        
        # If not found, try by email (for email-login)
        if not user_item and email:
            try:
                response = users_table.query(
                    IndexName='EmailIndex',
                    KeyConditionExpression=Key('Email').eq(email)
                )
                if response.get('Items'):
                    user_item = response['Items'][0]
            except Exception as e:
                print(f"Error querying by email: {str(e)}")
        
        # If still not found, try by username
        if not user_item and username:
            try:
                response = users_table.query(
                    IndexName='UsernameIndex',
                    KeyConditionExpression=Key('Username').eq(username)
                )
                if response.get('Items'):
                    user_item = response['Items'][0]
            except Exception as e:
                print(f"Error querying by username: {str(e)}")
        
        # If user found, check approval status
        if user_item:
            print(f"Found user record: {json.dumps(user_item, default=str)}")
            
            # Check if user has access
            user_access = user_item.get('UserAccess', False)
            approval_status = user_item.get('ApprovalStatus', 'PENDING')
            
            if user_access:
                return True, user_item, "User is approved for access"
            elif approval_status == 'REJECTED':
                return False, user_item, "Your account access has been rejected. Please contact your administrator."
            else:
                return False, user_item, "Your account is pending approval. Please wait for an administrator to approve your access."
        
        return False, None, "User not found in database."
    except Exception as e:
        print(f"Error checking user access: {str(e)}")
        return False, None, "Error checking user access."

def get_username_from_email(email):
    """
    Look up the username for a given email in the Cognito user pool or DynamoDB
    """
    try:
        # First try using DynamoDB (more reliable)
        users_table = dynamodb.Table(USERS_TABLE)
        try:
            response = users_table.query(
                IndexName='EmailIndex',
                KeyConditionExpression=Key('Email').eq(email)
            )
            if response.get('Items'):
                user_item = response['Items'][0]
                username = user_item.get('Username') or user_item.get('username')
                if username:
                    print(f"Found username '{username}' for email '{email}' in DynamoDB")
                    return username
        except Exception as e:
            print(f"Error querying DynamoDB by email: {str(e)}")
        
        # If not found in DynamoDB, try using Cognito admin search
        user_pool_id = os.environ.get('USER_POOL_ID')
        if not user_pool_id:
            print("USER_POOL_ID not configured")
            return None
        
        # Try to use list_users with a filter to find the user by email
        try:
            response = cognito.list_users(
                UserPoolId=user_pool_id,
                Filter=f'email = "{email}"'
            )
            
            if response['Users']:
                username = response['Users'][0]['Username']
                print(f"Found username '{username}' for email '{email}' in Cognito")
                return username
        except Exception as e:
            print(f"Error searching Cognito for email: {str(e)}")
        
        return None
    except Exception as e:
        print(f"Error in get_username_from_email: {str(e)}")
        return None

def lambda_handler(event, context):
    # Set up CORS headers for all responses
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }
    
    # Debug the raw incoming event
    print("Raw event received:", json.dumps(event, default=str))
    
    # Handle OPTIONS requests for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Handle different ways the body might be passed
        body = None
        
        # Parse the request body carefully
        if 'body' in event:
            # API Gateway format - body is a string that needs to be parsed
            try:
                if isinstance(event['body'], str):
                    body = json.loads(event['body'])
                else:
                    body = event['body']
            except Exception as e:
                print(f"Error parsing event body: {str(e)}")
                print("Event body received:", event['body'])
                # Return helpful error response
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Unable to parse request body',
                        'error': str(e),
                        'receivedEventType': str(type(event['body']))
                    })
                }
        else:
            # Direct Lambda invocation might have values directly in the event
            body = event
        
        # Extract email and password from the request body
        email = body.get('email')
        password = body.get('password')
        
        # Debug what we extracted
        print(f'Extracted login data: email="{email}", password={"*****" if password else "MISSING"}')
        
        # Validate required fields
        if not email or not password:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Email and password are required',
                    'receivedData': {
                        'email': email != '',
                        'password': password != '',
                        'bodyFormat': str(type(body)),
                        'eventFormat': str(type(event))
                    }
                })
            }
        
        print(f'Attempting authentication for email: {email}')
        
        # First we need to find the associated username for this email
        username = get_username_from_email(email)
        
        if not username:
            print(f"No username found for email: {email}")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Incorrect email or password',
                    'error': 'User not found'
                })
            }
        
        print(f"Found username '{username}' for email '{email}', proceeding with auth")
        
        # Get environment variables
        client_id = os.environ.get('USER_POOL_CLIENT_ID')
        client_secret = os.environ.get('USER_POOL_CLIENT_SECRET')
        
        # Prepare auth parameters
        auth_params = {
            'USERNAME': username,  # Important: Use the username, not the email
            'PASSWORD': password
        }
        
        # Add SECRET_HASH if client secret is configured
        if client_secret:
            print('Client secret detected, adding SECRET_HASH')
            secret_hash = get_secret_hash(username, client_id, client_secret)
            auth_params['SECRET_HASH'] = secret_hash
        
        # Attempt to authenticate the user
        try:
            auth_result = cognito.initiate_auth(
                AuthFlow='USER_PASSWORD_AUTH',
                ClientId=client_id,
                AuthParameters=auth_params
            )
            
            print('Authentication successful')
            
            # Get user details to include in the response
            user_info = cognito.get_user(
                AccessToken=auth_result['AuthenticationResult']['AccessToken']
            )
            
            print('User details retrieved')
            
            # Extract attributes from user info
            user_attributes = {}
            for attr in user_info['UserAttributes']:
                user_attributes[attr['Name']] = attr['Value']
            
            # Get the user ID (sub) from attributes
            user_id = user_attributes.get('sub')
            
            # Check if user has been approved for access
            has_access, user_db_data, access_message = check_user_access(user_id, username, email)
            
            if not has_access:
                print(f"User access check failed: {access_message}")
                
                # Get additional user data for the response
                is_new_domain = False
                company_name = ""
                approval_status = "PENDING"
                
                if user_db_data:
                    company_id = user_db_data.get('CompanyId')
                    approval_status = user_db_data.get('ApprovalStatus', 'PENDING')
                    
                    # Check if this is a new domain by checking if user is first CompanyAdmin
                    if user_db_data.get('UserRole') == 'CompanyAdmin':
                        is_new_domain = True
                    
                    # Get company name if available
                    company_name = user_db_data.get('CompanyName', '')
                
                return {
                    'statusCode': 403,  # Forbidden
                    'headers': headers,
                    'body': json.dumps({
                        'message': access_message,
                        'type': 'AccessDeniedException',
                        'requiresApproval': True,
                        'username': username,
                        'email': email,
                        'isNewDomain': is_new_domain,
                        'companyName': company_name,
                        'approvalStatus': approval_status
                    })
                }
            
            # Extract user role and other info from DynamoDB if available
            role = user_attributes.get('custom:userRole', 'User')
            company_id = user_attributes.get('custom:companyId', '')
            
            if user_db_data:
                # Use more accurate data from DynamoDB if available
                role = user_db_data.get('UserRole', role)
                company_id = user_db_data.get('CompanyId', company_id)
            
            # Return success with tokens and user info
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Login successful',
                    'tokens': {
                        'idToken': auth_result['AuthenticationResult']['IdToken'],
                        'accessToken': auth_result['AuthenticationResult']['AccessToken'],
                        'refreshToken': auth_result['AuthenticationResult']['RefreshToken'],
                        'expiresIn': auth_result['AuthenticationResult']['ExpiresIn']
                    },
                    'user': {
                        'id': user_id,
                        'email': email,
                        'username': username,
                        'companyId': company_id,
                        'role': role,
                        'userAccess': True
                    },
                    'success': True
                })
            }
        except cognito.exceptions.UserNotConfirmedException:
            # Handle unconfirmed user
            print('User not confirmed')
            return {
                'statusCode': 403,
                'headers': headers,
                'body': json.dumps({
                    'message': 'User is not confirmed. Please check your email for the confirmation code.',
                    'type': 'UserNotConfirmedException',
                    'needsConfirmation': True,
                    'username': username,
                    'email': email
                })
            }
        except cognito.exceptions.NotAuthorizedException as e:
            error_message = str(e)
            
            # Check if this specific error relates to a disabled user
            if "User is disabled" in error_message:
                print(f"User {username} is disabled in Cognito")
                
                # Check user details in DynamoDB to provide more specific information
                _, user_db_data, access_message = check_user_access(None, username, email)
                
                is_new_domain = False
                company_name = ""
                approval_status = "PENDING"
                
                if user_db_data:
                    company_id = user_db_data.get('CompanyId')
                    approval_status = user_db_data.get('ApprovalStatus', 'PENDING')
                    
                    # Check if this is a new domain by checking if user is first CompanyAdmin
                    if user_db_data.get('UserRole') == 'CompanyAdmin':
                        is_new_domain = True
                    
                    # Get company name if available
                    company_name = user_db_data.get('CompanyName', '')
                
                return {
                    'statusCode': 403,
                    'headers': headers,
                    'body': json.dumps({
                        'message': "Your account is waiting for administrator approval.",
                        'type': 'UserDisabledException',
                        'requiresApproval': True,
                        'username': username,
                        'email': email,
                        'isNewDomain': is_new_domain,
                        'companyName': company_name,
                        'approvalStatus': approval_status
                    })
                }
            else:
                # Standard username/password error
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Incorrect email or password',
                        'error': error_message
                    })
                }
        
    except ClientError as e:
        print(f'Cognito error during login: {str(e)}')
        
        # Return appropriate error messages
        status_code = 500
        message = 'Internal server error'
        
        error_code = e.response.get('Error', {}).get('Code')
        if error_code == 'NotAuthorizedException':
            status_code = 401
            message = 'Incorrect email or password'
        elif error_code == 'UserNotFoundException':
            status_code = 404
            message = 'User not found'
        
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps({
                'message': message,
                'error': str(e)
            })
        }
    
    except Exception as e:
        print(f'Unexpected error during login: {str(e)}')
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e),
                'eventReceived': json.dumps(event, default=str)
            })
        }
