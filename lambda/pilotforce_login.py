import json
import boto3
import os
import hmac
import hashlib
import base64
from datetime import datetime
from botocore.exceptions import ClientError

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

def update_user_status_in_dynamodb(user_id, username, email):
    """Update user status from UNCONFIRMED to CONFIRMED in DynamoDB"""
    try:
        # Get the DynamoDB table
        users_table = dynamodb.Table(USERS_TABLE)
        
        # First try to find the user by UserId
        if user_id:
            try:
                response = users_table.get_item(Key={'UserId': user_id})
                if 'Item' in response:
                    user_item = response['Item']
                    if user_item.get('Status') == 'UNCONFIRMED':
                        # Update the status to CONFIRMED
                        users_table.update_item(
                            Key={'UserId': user_id},
                            UpdateExpression="SET #status = :status, UpdatedAt = :updated",
                            ExpressionAttributeNames={'#status': 'Status'},
                            ExpressionAttributeValues={
                                ':status': 'CONFIRMED',
                                ':updated': datetime.now().isoformat()
                            }
                        )
                        print(f'Updated user status to CONFIRMED in DynamoDB for user ID: {user_id}')
                        return True
            except Exception as e:
                print(f'Error updating user status by UserId: {str(e)}')
        
        # If no user found by UserId, try to find by username
        try:
            # Query the secondary index for username
            response = users_table.query(
                IndexName='UsernameIndex',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('Username').eq(username)
            )
            
            if response.get('Items'):
                user_item = response['Items'][0]
                if user_item.get('Status') == 'UNCONFIRMED':
                    users_table.update_item(
                        Key={'UserId': user_item['UserId']},
                        UpdateExpression="SET #status = :status, UpdatedAt = :updated",
                        ExpressionAttributeNames={'#status': 'Status'},
                        ExpressionAttributeValues={
                            ':status': 'CONFIRMED',
                            ':updated': datetime.now().isoformat()
                        }
                    )
                    print(f'Updated user status to CONFIRMED in DynamoDB for username: {username}')
                    return True
        except Exception as e:
            print(f'Error updating user status by Username: {str(e)}')
        
        # If still not found, try by email
        if email:
            try:
                response = users_table.query(
                    IndexName='EmailIndex',
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('Email').eq(email)
                )
                
                if response.get('Items'):
                    user_item = response['Items'][0]
                    if user_item.get('Status') == 'UNCONFIRMED':
                        users_table.update_item(
                            Key={'UserId': user_item['UserId']},
                            UpdateExpression="SET #status = :status, UpdatedAt = :updated",
                            ExpressionAttributeNames={'#status': 'Status'},
                            ExpressionAttributeValues={
                                ':status': 'CONFIRMED',
                                ':updated': datetime.now().isoformat()
                            }
                        )
                        print(f'Updated user status to CONFIRMED in DynamoDB for email: {email}')
                        return True
            except Exception as e:
                print(f'Error updating user status by Email: {str(e)}')
                
        print(f'User not found in DynamoDB or status is already CONFIRMED')
        return False
    except Exception as e:
        print(f'Error in update_user_status_in_dynamodb: {str(e)}')
        return False

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
        
        # Extract username and password with proper debugging
        username = body.get('username', '')
        password = body.get('password', '')
        
        # Debug what we extracted
        print(f'Extracted login data: username="{username}", password={"*****" if password else "MISSING"}')
        print(f'Body data type: {type(body)}')
        print(f'Body contents: {json.dumps(body, default=str)}')
        
        # Validate required fields
        if not username or not password:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Username and password are required',
                    'receivedData': {
                        'username': username != '',
                        'password': password != '',
                        'bodyFormat': str(type(body)),
                        'eventFormat': str(type(event))
                    }
                })
            }
        
        print(f'Attempting authentication for user: {username}')
        
        # Get environment variables
        client_id = os.environ.get('USER_POOL_CLIENT_ID')
        client_secret = os.environ.get('USER_POOL_CLIENT_SECRET')
        
        # Prepare auth parameters
        auth_params = {
            'USERNAME': username,
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
            email = user_attributes.get('email')
            
            # Update user status in DynamoDB from UNCONFIRMED to CONFIRMED
            status_updated = update_user_status_in_dynamodb(user_id, username, email)
            if status_updated:
                print(f"User status updated in DynamoDB for user: {username}")
            
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
                        'id': user_attributes.get('sub'),
                        'username': user_info['Username'],
                        'email': user_attributes.get('email'),
                        'companyId': user_attributes.get('custom:companyId', ''),
                        'role': user_attributes.get('custom:userRole', 'User'),
                        'statusUpdated': status_updated
                    }
                })
            }
        except cognito.exceptions.UserNotConfirmedException:
            # Handle unconfirmed user - try to confirm them automatically
            print('User not confirmed - attempting auto-confirmation')
            user_pool_id = os.environ.get('USER_POOL_ID')
            
            if not user_pool_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'User is not confirmed. USER_POOL_ID environment variable is missing.',
                        'type': 'UserNotConfirmedException',
                        'needsConfirmation': True,
                        'username': username
                    })
                }
            
            try:
                # Attempt to auto-confirm the user
                cognito.admin_confirm_sign_up(
                    UserPoolId=user_pool_id,
                    Username=username
                )
                print(f'Successfully auto-confirmed user: {username}')
                
                # Also update status in DynamoDB
                update_user_status_in_dynamodb(None, username, None)
                
                # Try authentication again after confirmation
                auth_result = cognito.initiate_auth(
                    AuthFlow='USER_PASSWORD_AUTH',
                    ClientId=client_id,
                    AuthParameters=auth_params
                )
                
                print('Authentication successful after confirmation')
                
                # Get user details
                user_info = cognito.get_user(
                    AccessToken=auth_result['AuthenticationResult']['AccessToken']
                )
                
                # Extract attributes from user info
                user_attributes = {}
                for attr in user_info['UserAttributes']:
                    user_attributes[attr['Name']] = attr['Value']
                
                # Get user ID for DynamoDB update
                user_id = user_attributes.get('sub')
                email = user_attributes.get('email')
                
                # Ensure status is updated in DynamoDB
                status_updated = update_user_status_in_dynamodb(user_id, username, email)
                
                # Return success response
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Login successful (user was auto-confirmed)',
                        'tokens': {
                            'idToken': auth_result['AuthenticationResult']['IdToken'],
                            'accessToken': auth_result['AuthenticationResult']['AccessToken'],
                            'refreshToken': auth_result['AuthenticationResult']['RefreshToken'],
                            'expiresIn': auth_result['AuthenticationResult']['ExpiresIn']
                        },
                        'user': {
                            'id': user_attributes.get('sub'),
                            'username': user_info['Username'],
                            'email': user_attributes.get('email'),
                            'companyId': user_attributes.get('custom:companyId', ''),
                            'role': user_attributes.get('custom:userRole', 'User'),
                            'wasConfirmed': True,
                            'statusUpdated': status_updated
                        }
                    })
                }
            except Exception as confirm_error:
                print(f'Failed to auto-confirm user: {str(confirm_error)}')
                
                # Check if this is a permissions error
                if 'AccessDeniedException' in str(confirm_error):
                    print('Auto-confirmation failed due to permissions issue. Redirecting to confirmation page.')
                    return {
                        'statusCode': 403,  # Forbidden
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'Your account requires confirmation. Please use the confirmation code sent to your email.',
                            'type': 'UserNotConfirmedException',
                            'needsConfirmation': True,
                            'username': username,
                            'requiresManualConfirmation': True
                        })
                    }
                
                # Other errors
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'User is not confirmed and auto-confirmation failed.',
                        'type': 'UserNotConfirmedException',
                        'needsConfirmation': True,
                        'username': username,
                        'error': str(confirm_error)
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
            message = 'Incorrect username or password'
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

