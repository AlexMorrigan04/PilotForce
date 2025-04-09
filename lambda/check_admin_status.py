import json
import os
import boto3
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
cognito = boto3.client('cognito-idp')

# Get environment variables with fallbacks
USER_POOL_ID = os.environ.get('USER_POOL_ID', 'eu-north-1_gejWyB4ZB')

# Set up CORS headers
headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
}

def lambda_handler(event, context):
    # Log the incoming event
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }

    try:
        # Extract token from Authorization header
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        if not auth_header:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Authorization token required'})
            }

        # Remove 'Bearer ' if present
        token = auth_header.replace('Bearer ', '')
        
        # First try to get the user information from the token
        user_info = None
        try:
            # Try to get user from token
            user_info = cognito.get_user(
                AccessToken=token
            )
        except Exception as e:
            logger.error(f"Error getting user from token: {str(e)}")
            
            # If the token is an ID token instead of an access token
            # we can still extract the username from the event.requestContext if available
            request_context = event.get('requestContext', {})
            authorizer = request_context.get('authorizer', {})
            claims = authorizer.get('claims', {})
            
            if claims and claims.get('cognito:username'):
                username = claims.get('cognito:username')
                return check_admin_group_membership(username)
            
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Invalid or expired token',
                    'error': str(e)
                })
            }
        
        # If we got user info, get the username
        username = user_info['Username']
        
        # Check if the user is in the admin group
        return check_admin_group_membership(username)
        
    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Error checking admin status',
                'error': str(e)
            })
        }

def check_admin_group_membership(username):
    """
    Checks if a user is in the Administrators group
    
    Args:
        username (str): The Cognito username
        
    Returns:
        dict: API Gateway response
    """
    try:
        # Get the user's groups
        group_response = cognito.admin_list_groups_for_user(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        
        # Check if the user is in an admin group
        groups = group_response.get('Groups', [])
        group_names = [group.get('GroupName') for group in groups]
        is_admin = any(name in ['Administrators', 'Admins', 'Admin'] for name in group_names)
        
        logger.info(f"User {username} is admin: {is_admin}, Groups: {', '.join(group_names)}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'isAdmin': is_admin,
                'username': username,
                'groups': group_names
            })
        }
    except Exception as e:
        logger.error(f"Error checking group membership for {username}: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Error checking admin group membership',
                'error': str(e)
            })
        }

# For local testing
if __name__ == "__main__":
    # Test event that simulates API Gateway proxy integration
    test_event = {
        'httpMethod': 'GET',
        'headers': {
            'Authorization': 'Bearer YOUR_TEST_TOKEN'
        }
    }
    print(lambda_handler(test_event, None))
