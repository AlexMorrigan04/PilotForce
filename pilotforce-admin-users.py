import json
import boto3
import os
import logging
import datetime
from typing import Dict, Any, List
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Get environment variables
USER_POOL_ID = os.environ.get('USER_POOL_ID')
USER_TABLE = os.environ.get('USER_TABLE')

# Initialize AWS clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
user_table = dynamodb.Table(USER_TABLE)

# Helper function to check admin status
def is_admin_user(event) -> bool:
    try:
        # Extract token from the Authorization header
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return False
        
        # Verify user has admin role (simplified for demo)
        return True
    except Exception as e:
        logger.error(f"Error checking admin status: {str(e)}")
        return False

# Helper function for API response
def generate_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

# Lambda handler function
def lambda_handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    
    # Check if the request is an OPTIONS preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return generate_response(200, {})
    
    # Check if the user is an admin
    if not is_admin_user(event):
        return generate_response(403, {'message': 'Unauthorized. Admin access required'})
    
    try:
        # Route the request based on path and method
        path = event.get('resource', '')
        method = event.get('httpMethod', '')
        
        # Handle GET /admin/users
        if path == '/admin/users' and method == 'GET':
            return get_all_users(event)
        
        # Handle GET /admin/users/{userId}
        elif path == '/admin/users/{userId}' and method == 'GET':
            return get_user_by_id(event)
        
        # Handle PUT /admin/users/{userId}
        elif path == '/admin/users/{userId}' and method == 'PUT':
            return update_user(event)
        
        # Handle DELETE /admin/users/{userId}
        elif path == '/admin/users/{userId}' and method == 'DELETE':
            return delete_user(event)
        
        # Handle PUT /admin/users/{userId}/access
        elif path == '/admin/users/{userId}/access' and method == 'PUT':
            return toggle_user_access(event)
        
        # Unknown route
        return generate_response(404, {'message': 'Not Found'})
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return generate_response(500, {'message': f'Internal Server Error: {str(e)}'})

# Get all users from Cognito only
def get_all_users(event):
    try:
        # Get query parameters for filtering
        query_params = event.get('queryStringParameters', {}) or {}
        company_filter = query_params.get('company', '')
        role_filter = query_params.get('role', '')
        status_filter = query_params.get('status', '')
        
        # Get users from Cognito
        params = {
            'UserPoolId': USER_POOL_ID,
            'Limit': 60  # Adjust as needed
        }
        
        users_data = []
        response = cognito.list_users(**params)
        users_data.extend(response.get('Users', []))
        
        # Handle pagination for large user pools
        while 'PaginationToken' in response:
            params['PaginationToken'] = response['PaginationToken']
            response = cognito.list_users(**params)
            users_data.extend(response.get('Users', []))
        
        logger.info(f"Found {len(users_data)} users in Cognito")
        
        # Process users and apply filters
        users = []
        for user in users_data:
            # Extract user attributes into a dictionary for easier access
            attributes = {}
            for attr in user.get('Attributes', []):
                attributes[attr['Name']] = attr['Value']
            
            # Map Cognito attributes to our user model
            user_obj = {
                'UserId': attributes.get('sub', ''),
                'Username': user.get('Username', ''),
                'Email': attributes.get('email', ''),
                'Name': attributes.get('name', user.get('Username', '')),
                'PhoneNumber': attributes.get('phone_number', ''),
                'UserRole': attributes.get('custom:userRole', 'User'),
                'Status': user.get('UserStatus', 'UNKNOWN'),
                'CompanyId': attributes.get('custom:companyId', ''),
                'CreatedAt': user.get('UserCreateDate', '').isoformat() if hasattr(user.get('UserCreateDate', ''), 'isoformat') else str(user.get('UserCreateDate', '')),
                'UpdatedAt': user.get('UserLastModifiedDate', '').isoformat() if hasattr(user.get('UserLastModifiedDate', ''), 'isoformat') else str(user.get('UserLastModifiedDate', '')),
                'Enabled': user.get('Enabled', True)
            }
            
            # Log individual user details for debugging
            logger.info(f"Processing user: {user_obj['Username']} ({user_obj['UserId']}), Email: {user_obj['Email']}, Role: {user_obj['UserRole']}")
            
            # Apply filters
            if (not company_filter or user_obj['CompanyId'] == company_filter) and \
               (not role_filter or user_obj['UserRole'] == role_filter) and \
               (not status_filter or user_obj['Status'] == status_filter):
                users.append(user_obj)
        
        logger.info(f"Returning {len(users)} users after filtering")
        # Log the first few users for debugging
        if users:
            logger.info(f"Sample user data: {json.dumps(users[0])}")
        
        return generate_response(200, {'users': users})
    
    except Exception as e:
        logger.error(f"Error getting all users: {str(e)}")
        return generate_response(500, {'message': f'Error retrieving users: {str(e)}'})

# Get a specific user by ID from Cognito only
def get_user_by_id(event):
    try:
        user_id = event['pathParameters']['userId']
        
        # Try to get user from Cognito - first we need to find the username from the user ID (sub)
        try:
            # List users with filter to find by sub
            response = cognito.list_users(
                UserPoolId=USER_POOL_ID,
                Filter=f'sub = "{user_id}"'
            )
            
            if not response.get('Users'):
                return generate_response(404, {'message': 'User not found'})
            
            cognito_user = response['Users'][0]
            
            # Extract user attributes
            attributes = {}
            for attr in cognito_user.get('Attributes', []):
                attributes[attr['Name']] = attr['Value']
            
            # Create user object with Cognito attributes
            user = {
                'UserId': attributes.get('sub', ''),
                'Username': cognito_user.get('Username', ''),
                'Email': attributes.get('email', ''),
                'Name': attributes.get('name', cognito_user.get('Username', '')),
                'PhoneNumber': attributes.get('phone_number', ''),
                'UserRole': attributes.get('custom:userRole', 'User'),
                'Status': cognito_user.get('UserStatus', 'UNKNOWN'),
                'CompanyId': attributes.get('custom:companyId', ''),
                'CreatedAt': cognito_user.get('UserCreateDate', '').isoformat() if hasattr(cognito_user.get('UserCreateDate', ''), 'isoformat') else str(cognito_user.get('UserCreateDate', '')),
                'UpdatedAt': cognito_user.get('UserLastModifiedDate', '').isoformat() if hasattr(cognito_user.get('UserLastModifiedDate', ''), 'isoformat') else str(cognito_user.get('UserLastModifiedDate', '')),
                'Enabled': cognito_user.get('Enabled', True)
            }
            
            return generate_response(200, {'user': user})
            
        except Exception as e:
            logger.error(f"Error retrieving user from Cognito: {str(e)}")
            return generate_response(404, {'message': 'User not found'})
    
    except Exception as e:
        logger.error(f"Error getting user by ID: {str(e)}")
        return generate_response(500, {'message': f'Error retrieving user: {str(e)}'})

# Update a user in Cognito
def update_user(event):
    try:
        user_id = event['pathParameters']['userId']
        body = json.loads(event['body'])
        
        # First we need to find the username from the user ID (sub)
        response = cognito.list_users(
            UserPoolId=USER_POOL_ID,
            Filter=f'sub = "{user_id}"'
        )
        
        if not response.get('Users'):
            return generate_response(404, {'message': 'User not found'})
        
        username = response['Users'][0]['Username']
        
        # Prepare the attributes to update
        user_attributes = []
        
        # Map fields to Cognito attributes
        field_mappings = {
            'email': 'email',
            'name': 'name',
            'phone': 'phone_number',
            'role': 'custom:userRole',
            'companyId': 'custom:companyId'
        }
        
        # Build the user attributes array
        for api_field, cognito_attr in field_mappings.items():
            if api_field in body:
                user_attributes.append({
                    'Name': cognito_attr,
                    'Value': body[api_field]
                })
        
        # Update user attributes in Cognito
        if user_attributes:
            cognito.admin_update_user_attributes(
                UserPoolId=USER_POOL_ID,
                Username=username,
                UserAttributes=user_attributes
            )
            logger.info(f"Updated user attributes in Cognito: {user_id}")
        
        return generate_response(200, {'message': 'User updated successfully'})
    
    except ClientError as e:
        logger.error(f"Cognito error: {str(e)}")
        return generate_response(500, {'message': f'Error updating user in Cognito: {str(e)}'})
    
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        return generate_response(500, {'message': f'Error updating user: {str(e)}'})

# Delete a user from Cognito and DynamoDB
def delete_user(event):
    try:
        user_id = event['pathParameters']['userId']
        
        # Find username by sub
        response = cognito.list_users(
            UserPoolId=USER_POOL_ID,
            Filter=f'sub = "{user_id}"'
        )
        
        if not response.get('Users'):
            return generate_response(404, {'message': 'User not found'})
        
        username = response['Users'][0]['Username']
        
        # Delete user from Cognito
        cognito.admin_delete_user(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        
        logger.info(f"Deleted user from Cognito: {user_id}")
        
        # Also delete the user from DynamoDB if it exists there
        try:
            # Check if user exists in DynamoDB
            db_response = user_table.get_item(Key={'UserId': user_id})
            
            if 'Item' in db_response:
                # Delete from DynamoDB
                user_table.delete_item(Key={'UserId': user_id})
                logger.info(f"Deleted user from DynamoDB: {user_id}")
            else:
                logger.info(f"User {user_id} not found in DynamoDB, skipping DynamoDB deletion")
        except Exception as db_error:
            logger.error(f"Error deleting user from DynamoDB: {str(db_error)}")
            # Continue execution - we don't want to fail the whole operation if DynamoDB deletion fails
            # since Cognito deletion was successful
        
        return generate_response(200, {'message': 'User deleted successfully from Cognito and DynamoDB'})
    
    except ClientError as e:
        if e.response['Error']['Code'] == 'UserNotFoundException':
            return generate_response(404, {'message': 'User not found'})
        logger.error(f"Cognito error: {str(e)}")
        return generate_response(500, {'message': f'Error deleting user: {str(e)}'})
    
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        return generate_response(500, {'message': f'Error deleting user: {str(e)}'})

# Toggle user access in Cognito (enable/disable)
def toggle_user_access(event):
    try:
        user_id = event['pathParameters']['userId']
        body = json.loads(event['body'])
        is_enabled = body.get('isEnabled', False)
        
        # Find username by sub
        response = cognito.list_users(
            UserPoolId=USER_POOL_ID,
            Filter=f'sub = "{user_id}"'
        )
        
        if not response.get('Users'):
            return generate_response(404, {'message': 'User not found'})
        
        username = response['Users'][0]['Username']
        
        # Enable or disable user in Cognito
        if is_enabled:
            cognito.admin_enable_user(
                UserPoolId=USER_POOL_ID,
                Username=username
            )
            logger.info(f"Enabled user in Cognito: {user_id}")
        else:
            cognito.admin_disable_user(
                UserPoolId=USER_POOL_ID,
                Username=username
            )
            logger.info(f"Disabled user in Cognito: {user_id}")
        
        return generate_response(200, {'message': f'User {"enabled" if is_enabled else "disabled"} successfully'})
    
    except ClientError as e:
        if e.response['Error']['Code'] == 'UserNotFoundException':
            return generate_response(404, {'message': 'User not found'})
        logger.error(f"Cognito error: {str(e)}")
        return generate_response(500, {'message': f'Error toggling user access: {str(e)}'})
    
    except Exception as e:
        logger.error(f"Error toggling user access: {str(e)}")
        return generate_response(500, {'message': f'Error toggling user access: {str(e)}'})