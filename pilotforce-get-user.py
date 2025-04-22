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

def get_users_by_company_id_dynamo_only(company_id):
    """
    Get users for a company using ONLY DynamoDB - no Cognito lookups
    This is the simplest and fastest implementation
    """
    logger.info(f"Fetching users for company (DynamoDB-only): {company_id}")
    
    try:
        # Try using Global Secondary Index first for performance if it exists
        try:
            logger.info(f"Attempting to query CompanyIdIndex for company {company_id}")
            response = users_table.query(
                IndexName='CompanyIdIndex',
                KeyConditionExpression=Key('CompanyId').eq(company_id)
            )
            
            users = response.get('Items', [])
            
            # Handle pagination if there are more results
            while 'LastEvaluatedKey' in response:
                response = users_table.query(
                    IndexName='CompanyIdIndex',
                    KeyConditionExpression=Key('CompanyId').eq(company_id),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                users.extend(response.get('Items', []))
            
            if users:
                logger.info(f"Successfully retrieved {len(users)} users via GSI")
                return users
        except Exception as e:
            logger.warning(f"GSI query failed, falling back to scan: {str(e)}")
        
        # Fallback to scan if GSI doesn't exist or query fails
        filter_expression = Attr('CompanyId').eq(company_id)
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
        
        logger.info(f"Found {len(users)} users for company {company_id} using scan")
        return users
    except Exception as e:
        logger.error(f"Error in DynamoDB-only company users fetch: {str(e)}")
        return []

def update_user_approval_status(user_id, company_id, approval_action):
    """
    Update a user's approval status
    approval_action: 'approve' or 'deny'
    
    Returns True on success, False on failure
    """
    logger.info(f"Updating approval status for user {user_id} to {approval_action}")
    
    try:
        # First, verify that the user belongs to the specified company
        response = users_table.get_item(Key={'UserId': user_id})
        
        if 'Item' not in response:
            logger.warning(f"User {user_id} not found in DynamoDB")
            return False
        
        user_data = response['Item']
        
        if user_data.get('CompanyId') != company_id:
            logger.warning(f"User {user_id} does not belong to company {company_id}")
            return False
        
        # If the user is a CompanyAdmin, they are already approved
        if user_data.get('UserRole') == 'CompanyAdmin':
            logger.info(f"User {user_id} is a CompanyAdmin, already approved")
            return True
        
        # Set the approval status based on the action
        current_time = datetime.now().isoformat()
        
        if approval_action.lower() == 'approve':
            logger.info(f"Approving user {user_id}")
            
            # Direct update without using expression attributes to avoid naming conflicts
            update_response = users_table.update_item(
                Key={'UserId': user_id},
                UpdateExpression='SET UserAccess = :access, ApprovalStatus = :status, #user_status = :user_status, UpdatedAt = :updated',
                ExpressionAttributeNames={
                    '#user_status': 'Status'  # Status is a reserved word
                },
                ExpressionAttributeValues={
                    ':access': True,
                    ':status': 'APPROVED',
                    ':user_status': 'CONFIRMED',
                    ':updated': current_time
                },
                ReturnValues='ALL_NEW'  # Return the updated item
            )
            
            # Log the actual update to verify it's working
            logger.info(f"DynamoDB update result: {update_response}")
            
            if 'Attributes' in update_response:
                updated_user = update_response['Attributes']
                logger.info(f"Updated user attributes: UserAccess={updated_user.get('UserAccess')}, ApprovalStatus={updated_user.get('ApprovalStatus')}")
                
                # Double-check that the update was successful
                if updated_user.get('UserAccess') != True or updated_user.get('ApprovalStatus') != 'APPROVED':
                    logger.warning(f"Update may not have applied correctly: {updated_user}")
            
        elif approval_action.lower() == 'deny':
            logger.info(f"Denying user {user_id}")
            
            # Direct update without using expression attributes to avoid naming conflicts
            update_response = users_table.update_item(
                Key={'UserId': user_id},
                UpdateExpression='SET UserAccess = :access, ApprovalStatus = :status, #user_status = :user_status, UpdatedAt = :updated',
                ExpressionAttributeNames={
                    '#user_status': 'Status'  # Status is a reserved word
                },
                ExpressionAttributeValues={
                    ':access': False,
                    ':status': 'DENIED',
                    ':user_status': 'DISABLED',
                    ':updated': current_time
                },
                ReturnValues='ALL_NEW'  # Return the updated item
            )
            
            # Log the actual update to verify it's working
            logger.info(f"DynamoDB update result: {update_response}")
            
        else:
            logger.warning(f"Invalid approval action: {approval_action}")
            return False
        
        # Verify the changes by reading back from the database
        verify_response = users_table.get_item(Key={'UserId': user_id})
        if 'Item' in verify_response:
            verified_user = verify_response['Item']
            logger.info(f"Verified user state after update: UserAccess={verified_user.get('UserAccess')}, ApprovalStatus={verified_user.get('ApprovalStatus')}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error updating user approval status: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def delete_user_completely(user_id, company_id):
    """
    Delete a user completely from both DynamoDB and Cognito
    Returns True on success, False on failure
    """
    logger.info(f"Deleting user {user_id} from company {company_id} completely")
    
    try:
        # First, verify that the user belongs to the specified company
        response = users_table.get_item(Key={'UserId': user_id})
        
        if 'Item' not in response:
            logger.warning(f"User {user_id} not found in DynamoDB")
            return False
        
        user_data = response['Item']
        
        if user_data.get('CompanyId') != company_id:
            logger.warning(f"User {user_id} does not belong to company {company_id}")
            return False
        
        # Check if the user is a CompanyAdmin
        if user_data.get('UserRole') == 'CompanyAdmin':
            logger.warning(f"Cannot delete CompanyAdmin user {user_id} from company {company_id}")
            return False
        
        # Get the user's username/email from the DynamoDB record
        username = user_data.get('Email') or user_data.get('email') or user_data.get('Username')
        
        if not username:
            logger.warning(f"No username/email found for user {user_id}, cannot delete from Cognito")
        else:
            # 1. First try to delete user from Cognito
            try:
                logger.info(f"Attempting to delete user {username} from Cognito")
                cognito.admin_delete_user(
                    UserPoolId=USER_POOL_ID,
                    Username=username
                )
                logger.info(f"Successfully deleted user {username} from Cognito")
            except Exception as cognito_error:
                logger.error(f"Error deleting user from Cognito: {str(cognito_error)}")
                # Continue with DynamoDB deletion even if Cognito deletion fails
        
        # 2. Then delete user record from DynamoDB
        try:
            delete_response = users_table.delete_item(
                Key={'UserId': user_id},
                ReturnValues="ALL_OLD"  # Return the deleted item
            )
            
            # Check if the item was deleted (it will have Attributes if it was found and deleted)
            if 'Attributes' in delete_response:
                logger.info(f"Successfully deleted user {user_id} from DynamoDB")
                return True
            else:
                logger.warning(f"User {user_id} not found in DynamoDB during deletion")
                return False
            
        except Exception as dynamo_error:
            logger.error(f"Error deleting user from DynamoDB: {str(dynamo_error)}")
            return False
    
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        return False

# Keep the original function for backward compatibility
def remove_user_from_company(user_id, company_id):
    """
    Remove a user from a company by clearing their CompanyId attribute
    Returns True on success, False on failure
    
    DEPRECATED: Use delete_user_completely instead for complete deletion
    """
    logger.info(f"DEPRECATION WARNING: Using old remove_user_from_company function")
    return delete_user_completely(user_id, company_id)

def lambda_handler(event, context):
    # Standard CORS headers - ensure these are properly set for all responses
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
    }
    
    # Log the received event (sanitized)
    logger.info(f"Received event type: {type(event)}")
    if isinstance(event, dict):
        safe_keys = [k for k in event.keys() if k != 'password']
        logger.info(f"Event keys: {safe_keys}")
    
    # Handle OPTIONS request (CORS preflight) - ALWAYS return 200 with CORS headers
    if event.get('httpMethod') == 'OPTIONS':
        logger.info("Handling OPTIONS preflight request")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Extract path and query parameters
        path = event.get('path', '')
        path_parts = path.split('/')
        query_params = event.get('queryStringParameters', {}) or {}
        body = event.get('body', {})
        if isinstance(body, str) and body:
            try:
                body = json.loads(body)
            except:
                body = {}
                
        http_method = event.get('httpMethod', 'GET')
        
        # Extract path parameters if available
        path_params = event.get('pathParameters') or {}
        
        # Handle PUT request for /companies/{companyId}/users/{userId}/access
        if http_method == 'PUT' and '/companies/' in path and '/users/' in path and '/access' in path:
            # Extract company ID and user ID from path parameters or URL
            company_id = path_params.get('companyId')
            user_id = path_params.get('userId') or path_params.get('id')
            
            if not company_id or not user_id:
                # Try to extract from path if path parameters are not available
                try:
                    parts = path.split('/')
                    companies_index = parts.index('companies')
                    if companies_index + 1 < len(parts):
                        company_id = parts[companies_index + 1]
                    
                    users_index = parts.index('users')
                    if users_index + 1 < len(parts):
                        user_id = parts[users_index + 1]
                except (ValueError, IndexError):
                    logger.error("Failed to extract company_id or user_id from path")
            
            logger.info(f"PUT request for user {user_id} access in company {company_id}")
            
            if not company_id or not user_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'message': 'Company ID and User ID are required'})
                }
            
            # Parse request body for approval action
            approval_action = None
            if isinstance(body, dict):
                # Check for action field directly
                approval_action = body.get('action')
                
                # If no action field, infer from other fields
                if not approval_action:
                    user_access = body.get('UserAccess')
                    approval_status = body.get('ApprovalStatus', '')
                    
                    if user_access is True or approval_status.upper() == 'APPROVED':
                        approval_action = 'approve'
                    elif user_access is False or approval_status.upper() == 'DENIED':
                        approval_action = 'deny'
            
            if not approval_action or approval_action.lower() not in ['approve', 'deny']:
                logger.warning(f"Invalid or missing approval action in request body: {body}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'message': 'Valid action (approve or deny) is required'})
                }
            
            # Get auth header for authentication
            auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
            
            if not auth_header:
                logger.warning("No Authentication token provided")
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'message': 'Authorization token required'})
                }
            
            # Remove Bearer prefix if present
            if auth_header.startswith('Bearer '):
                access_token = auth_header.replace('Bearer ', '')
                
                # Authenticate and verify permissions
                try:
                    user_info = cognito.get_user(AccessToken=access_token)
                    
                    # Extract user attributes
                    user_attributes = {}
                    for attr in user_info.get('UserAttributes', []):
                        user_attributes[attr['Name']] = attr['Value']
                    
                    # Get the user's ID (sub)
                    requester_id = user_attributes.get('sub')
                    
                    # Get additional DB info for the requester
                    db_response = users_table.get_item(Key={'UserId': requester_id})
                    requester_data = db_response.get('Item', {})
                    
                    # Check if the requester is a CompanyAdmin and belongs to the same company
                    requester_role = requester_data.get('UserRole') or user_attributes.get('custom:userRole', '').lower()
                    requester_company = requester_data.get('CompanyId') or user_attributes.get('custom:companyId')
                    
                    is_company_admin = requester_role.lower() == 'companyadmin'
                    is_system_admin = requester_role.lower() == 'admin' or requester_role.lower() == 'systemadmin'
                    is_same_company = requester_company == company_id
                    
                    logger.info(f"Requester: {requester_id}, Role: {requester_role}, Company: {requester_company}")
                    logger.info(f"Is CompanyAdmin: {is_company_admin}, Same company: {is_same_company}")
                    
                    if not (is_company_admin and is_same_company) and not is_system_admin:
                        logger.warning(f"User {requester_id} not authorized to approve/deny users in company {company_id}")
                        return {
                            'statusCode': 403,
                            'headers': headers,
                            'body': json.dumps({'message': 'Insufficient permissions. Only CompanyAdmin can approve/deny users.'})
                        }
                    
                    # Update the user's approval status
                    success = update_user_approval_status(user_id, company_id, approval_action)
                    
                    if success:
                        return {
                            'statusCode': 200,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'User {user_id} successfully {approval_action}d',
                                'success': True,
                                'userId': user_id,
                                'companyId': company_id,
                                'action': approval_action
                            })
                        }
                    else:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'Failed to {approval_action} user {user_id}',
                                'success': False
                            })
                        }
                
                except cognito.exceptions.NotAuthorizedException:
                    logger.warning("Invalid or expired token")
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'message': 'Invalid or expired token'})
                    }
                except Exception as auth_error:
                    logger.error(f"Error verifying token: {str(auth_error)}")
                    return {
                        'statusCode': 500,
                        'headers': headers,
                        'body': json.dumps({'message': 'Error verifying authentication token'})
                    }
            else:
                # Basic auth handling for approving/denying users is not implemented
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'message': 'Bearer token required for approval/denial operations'})
                }
        
        # Handle POST request for updating user approval status
        if http_method == 'POST' and '/companies/' in path and '/users/' in path:
            # Extract company ID and user ID from path parameters
            company_id = path_params.get('companyId')
            user_id = path_params.get('userId') or path_params.get('id')
            
            if not company_id or not user_id:
                # Try to extract from path if path parameters are not available
                try:
                    parts = path.split('/')
                    companies_index = parts.index('companies')
                    if companies_index + 1 < len(parts):
                        company_id = parts[companies_index + 1]
                    
                    users_index = parts.index('users')
                    if users_index + 1 < len(parts):
                        user_id = parts[users_index + 1]
                except (ValueError, IndexError):
                    logger.error("Failed to extract company_id or user_id from path")
            
            logger.info(f"POST request for user {user_id} in company {company_id}")
            
            if not company_id or not user_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'message': 'Company ID and User ID are required'})
                }
            
            # Parse request body for approval action
            approval_action = None
            if isinstance(body, dict):
                # Check for action field directly
                approval_action = body.get('action')
                
                # If no action field, infer from other fields
                if not approval_action:
                    user_access = body.get('UserAccess')
                    approval_status = body.get('ApprovalStatus', '')
                    
                    if user_access is True or approval_status.upper() == 'APPROVED':
                        approval_action = 'approve'
                    elif user_access is False or approval_status.upper() == 'DENIED':
                        approval_action = 'deny'
            
            if not approval_action or approval_action.lower() not in ['approve', 'deny']:
                logger.warning(f"Invalid or missing approval action in request body: {body}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'message': 'Valid action (approve or deny) is required'})
                }
            
            # Get auth header for authentication
            auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
            
            if not auth_header:
                logger.warning("No Authentication token provided")
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'message': 'Authorization token required'})
                }
            
            # Remove Bearer prefix if present
            if auth_header.startswith('Bearer '):
                access_token = auth_header.replace('Bearer ', '')
                
                # Authenticate and verify permissions
                try:
                    user_info = cognito.get_user(AccessToken=access_token)
                    
                    # Extract user attributes
                    user_attributes = {}
                    for attr in user_info.get('UserAttributes', []):
                        user_attributes[attr['Name']] = attr['Value']
                    
                    # Get the user's ID (sub)
                    requester_id = user_attributes.get('sub')
                    
                    # Get additional DB info for the requester
                    db_response = users_table.get_item(Key={'UserId': requester_id})
                    requester_data = db_response.get('Item', {})
                    
                    # Check if the requester is a CompanyAdmin and belongs to the same company
                    requester_role = requester_data.get('UserRole') or user_attributes.get('custom:userRole', '').lower()
                    requester_company = requester_data.get('CompanyId') or user_attributes.get('custom:companyId')
                    
                    is_company_admin = requester_role.lower() == 'companyadmin'
                    is_system_admin = requester_role.lower() == 'admin' or requester_role.lower() == 'systemadmin'
                    is_same_company = requester_company == company_id
                    
                    logger.info(f"Requester: {requester_id}, Role: {requester_role}, Company: {requester_company}")
                    logger.info(f"Is CompanyAdmin: {is_company_admin}, Same company: {is_same_company}")
                    
                    if not (is_company_admin and is_same_company) and not is_system_admin:
                        logger.warning(f"User {requester_id} not authorized to approve/deny users in company {company_id}")
                        return {
                            'statusCode': 403,
                            'headers': headers,
                            'body': json.dumps({'message': 'Insufficient permissions. Only CompanyAdmin can approve/deny users.'})
                        }
                    
                    # Update the user's approval status
                    success = update_user_approval_status(user_id, company_id, approval_action)
                    
                    if success:
                        return {
                            'statusCode': 200,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'User {user_id} successfully {approval_action}d',
                                'success': True,
                                'userId': user_id,
                                'companyId': company_id,
                                'action': approval_action
                            })
                        }
                    else:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'Failed to {approval_action} user {user_id}',
                                'success': False
                            })
                        }
                
                except cognito.exceptions.NotAuthorizedException:
                    logger.warning("Invalid or expired token")
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'message': 'Invalid or expired token'})
                    }
                except Exception as auth_error:
                    logger.error(f"Error verifying token: {str(auth_error)}")
                    return {
                        'statusCode': 500,
                        'headers': headers,
                        'body': json.dumps({'message': 'Error verifying authentication token'})
                    }
            else:
                # Basic auth handling for approving/denying users is not implemented
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'message': 'Bearer token required for approval/denial operations'})
                }
                
        # Handle DELETE request for removing users
        if http_method == 'DELETE' and '/companies/' in path and '/users/' in path:
            # Extract company ID and user ID from path parameters
            company_id = path_params.get('companyId')
            user_id = path_params.get('userId') or path_params.get('id')
            
            if not company_id or not user_id:
                # Try to extract from path if path parameters are not available
                try:
                    parts = path.split('/')
                    companies_index = parts.index('companies')
                    if companies_index + 1 < len(parts):
                        company_id = parts[companies_index + 1]
                    
                    users_index = parts.index('users')
                    if users_index + 1 < len(parts):
                        user_id = parts[users_index + 1]
                except (ValueError, IndexError):
                    logger.error("Failed to extract company_id or user_id from path")
            
            logger.info(f"DELETE request for user {user_id} from company {company_id}")
            
            if not company_id or not user_id:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'message': 'Company ID and User ID are required'})
                }
            
            # Get auth header for authentication
            auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
            
            if not auth_header:
                logger.warning("No Authentication token provided")
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'message': 'Authorization token required'})
                }
            
            # Remove Bearer prefix if present
            if auth_header.startswith('Bearer '):
                access_token = auth_header.replace('Bearer ', '')
                
                # Authenticate and verify permissions
                try:
                    user_info = cognito.get_user(AccessToken=access_token)
                    
                    # Extract user attributes
                    user_attributes = {}
                    for attr in user_info.get('UserAttributes', []):
                        user_attributes[attr['Name']] = attr['Value']
                    
                    # Get the user's ID (sub)
                    requester_id = user_attributes.get('sub')
                    
                    # Get additional DB info for the requester
                    db_response = users_table.get_item(Key={'UserId': requester_id})
                    requester_data = db_response.get('Item', {})
                    
                    # Check if the requester is a CompanyAdmin and belongs to the same company
                    requester_role = requester_data.get('UserRole') or user_attributes.get('custom:userRole', '').lower()
                    requester_company = requester_data.get('CompanyId') or user_attributes.get('custom:companyId')
                    
                    is_company_admin = requester_role.lower() == 'companyadmin'
                    is_same_company = requester_company == company_id
                    
                    logger.info(f"Requester: {requester_id}, Role: {requester_role}, Company: {requester_company}")
                    logger.info(f"Is CompanyAdmin: {is_company_admin}, Same company: {is_same_company}")
                    
                    if not is_company_admin or not is_same_company:
                        logger.warning(f"User {requester_id} not authorized to remove users from company {company_id}")
                        return {
                            'statusCode': 403,
                            'headers': headers,
                            'body': json.dumps({'message': 'Insufficient permissions to remove users from this company'})
                        }
                    
                    # Delete the user completely
                    success = delete_user_completely(user_id, company_id)
                    
                    if success:
                        return {
                            'statusCode': 200,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'User {user_id} successfully deleted from company {company_id}',
                                'deleted': True
                            })
                        }
                    else:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'Failed to delete user {user_id} from company {company_id}',
                                'deleted': False
                            })
                        }
                
                except cognito.exceptions.NotAuthorizedException:
                    logger.warning("Invalid or expired token")
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'message': 'Invalid or expired token'})
                    }
                except Exception as auth_error:
                    logger.error(f"Error verifying token: {str(auth_error)}")
                    return {
                        'statusCode': 500,
                        'headers': headers,
                        'body': json.dumps({'message': 'Error verifying authentication token'})
                    }
            else:
                # Basic auth handling
                try:
                    encoded_credentials = auth_header.replace('Basic ', '')
                    decoded_credentials = base64.b64decode(encoded_credentials).decode('utf-8')
                    username, password = decoded_credentials.split(':')
                    
                    # Authenticate the user
                    secret_hash = calculate_secret_hash(username)
                    
                    try:
                        # Try regular auth
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
                        # Fallback to admin auth
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
                    
                    # Get the user's info
                    access_token = auth_response.get('AuthenticationResult', {}).get('AccessToken')
                    if not access_token:
                        logger.error("Authentication succeeded but no access token was returned")
                        return {
                            'statusCode': 500,
                            'headers': headers,
                            'body': json.dumps({'message': 'Authentication succeeded but no access token was returned'})
                        }
                        
                    user_info = cognito.get_user(AccessToken=access_token)
                    
                    # Extract user attributes
                    user_attributes = {}
                    for attr in user_info.get('UserAttributes', []):
                        user_attributes[attr['Name']] = attr['Value']
                    
                    # Get the user's ID (sub)
                    requester_id = user_attributes.get('sub')
                    
                    # Get additional DB info for the requester
                    db_response = users_table.get_item(Key={'UserId': requester_id})
                    requester_data = db_response.get('Item', {})
                    
                    # Check if the requester is a CompanyAdmin and belongs to the same company
                    requester_role = requester_data.get('UserRole') or user_attributes.get('custom:userRole', '').lower()
                    requester_company = requester_data.get('CompanyId') or user_attributes.get('custom:companyId')
                    
                    is_company_admin = requester_role.lower() == 'companyadmin'
                    is_same_company = requester_company == company_id
                    
                    if not is_company_admin or not is_same_company:
                        logger.warning(f"User {requester_id} not authorized to remove users from company {company_id}")
                        return {
                            'statusCode': 403,
                            'headers': headers,
                            'body': json.dumps({'message': 'Insufficient permissions to remove users from this company'})
                        }
                    
                    # Delete the user completely
                    success = delete_user_completely(user_id, company_id)
                    
                    if success:
                        return {
                            'statusCode': 200,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'User {user_id} successfully deleted from company {company_id}',
                                'deleted': True
                            })
                        }
                    else:
                        return {
                            'statusCode': 400,
                            'headers': headers,
                            'body': json.dumps({
                                'message': f'Failed to delete user {user_id} from company {company_id}',
                                'deleted': False
                            })
                        }
                    
                except Exception as auth_error:
                    logger.error(f"Authentication error: {str(auth_error)}")
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'Authentication failed',
                            'error': str(auth_error)
                        })
                    }
        
        # COMPLETELY PUBLIC ENDPOINT - NO AUTH REQUIRED
        # Use this for fetching all users by company ID
        if http_method == 'GET' and '/companies/' in path and '/users' in path:
            # Extract company ID from path
            try:
                # Handle both /public/companies/{id}/users and /companies/{id}/users formats
                if '/public/companies/' in path:
                    company_id = path.split('/public/companies/')[1].split('/')[0]
                else:
                    company_id = path.split('/companies/')[1].split('/')[0]
                
                logger.info(f"PUBLIC - fetching users for company {company_id}")
                
                if not company_id:
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'message': 'Company ID is required'})
                    }
                
                # Use DynamoDB-only function to get company users - NO COGNITO
                company_users = get_users_by_company_id_dynamo_only(company_id)
                
                return {
                    'statusCode': 200,
                    'headers': headers,  # Include CORS headers
                    'body': json.dumps({
                        'companyId': company_id,
                        'users': company_users,
                        'count': len(company_users)
                    })
                }
            except Exception as path_error:
                logger.error(f"Error extracting company ID from path: {str(path_error)}")
                
                # As fallback, check if the company ID is in the query parameters
                company_id = query_params.get('companyId')
                if company_id:
                    # Still use DynamoDB-only function - NO COGNITO
                    company_users = get_users_by_company_id_dynamo_only(company_id)
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,  # Include CORS headers
                        'body': json.dumps({
                            'companyId': company_id,
                            'users': company_users,
                            'count': len(company_users)
                        })
                    }
                
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'message': 'Company ID could not be determined'})
                }
        
        # Handle all the authenticated endpoints below this line
        # Regular authenticated path continues below
        
        # Check if path parameters are in the expected format from API Gateway
        path_params = event.get('pathParameters') or {}
        if path_params and path_params.get('companyId'):
            # If the company ID is provided via path parameters, use that
            company_id = path_params.get('companyId')
            fetch_company_users = True
            logger.info(f"Company ID {company_id} found in path parameters")
        else:
            # Otherwise check query parameters
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
                    logger.info(f"Calling get_users_by_company_id_dynamo_only for company {company_id}")
                    company_users = get_users_by_company_id_dynamo_only(company_id)
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
            
            # Add the new getCompanyUsers endpoint that checks for the parameter
            if http_method == 'GET' and query_params.get('getCompanyUsers') == 'true':
                logger.info("Request to get all company users for current user")
                
                # First determine the user's company ID (this still requires auth)
                db_response = users_table.get_item(Key={'UserId': user_id})
                user_data = db_response.get('Item', {})
                company_id = user_data.get('CompanyId') or user_attributes.get('custom:companyId')
                
                if not company_id:
                    logger.warning(f"No company ID found for user {user_id}")
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'message': 'No company associated with this user'})
                    }
                
                # Once we have the company ID, use the DynamoDB-only function
                company_users = get_users_by_company_id_dynamo_only(company_id)
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company users retrieved successfully',
                        'companyId': company_id,
                        'users': company_users,
                        'count': len(company_users)
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
            'headers': headers,  # Include CORS headers even in error responses
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
