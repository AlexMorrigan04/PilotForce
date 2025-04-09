import json
import boto3
import logging
from botocore.exceptions import ClientError
import traceback
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
assets_table = dynamodb.Table('Assets')

# Helper function to convert Decimal to float for JSON serialization
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    # Improved CORS headers - ensure these match in API Gateway settings too
    headers = {
        'Access-Control-Allow-Origin': '*',  # In production, restrict this to your domain
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET',
        'Access-Control-Max-Age': '86400'  # Cache preflight response for 24 hours
    }
    
    # Log the incoming event
    logger.info(f"Event received: {json.dumps(event, default=str)}")
    
    # Handle OPTIONS requests for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        logger.info("Handling OPTIONS preflight request")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Extract authentication token with improved logging
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        logger.info(f"Auth header present: {bool(auth_header)}")
        
        # For debugging, log token prefix (but don't log the entire token for security)
        if auth_header:
            logger.info(f"Auth header length: {len(auth_header)}")
            logger.info(f"Auth header prefix: {auth_header[:20]}...")
            logger.info(f"Auth header starts with Bearer: {auth_header.startswith('Bearer ')}")
        
        if not auth_header:
            logger.warning("No authorization header found")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Authorization token required'})
            }
        
        # Remove 'Bearer ' prefix if present
        token = auth_header.replace('Bearer ', '')
        logger.info(f"Token length after removing 'Bearer' prefix: {len(token)}")
        
        try:
            # Get user info from token
            logger.info("Attempting to get user info from token")
            user_info = cognito.get_user(AccessToken=token)
            logger.info(f"User info retrieved: {json.dumps(user_info, default=str)}")
            
            # Extract user attributes
            user_attributes = {}
            for attr in user_info.get('UserAttributes', []):
                user_attributes[attr['Name']] = attr['Value']
            
            user_id = user_attributes.get('sub')
            company_id = user_attributes.get('custom:companyId')
            user_role = user_attributes.get('custom:userRole', 'User')
            
            logger.info(f"User ID: {user_id}, Company ID: {company_id}, Role: {user_role}")
            
            # Initialize empty assets list
            assets = []
            
            # Fetch assets based on user role
            if user_role in ['Admin', 'AccountAdmin']:
                # Admins can see all company assets
                logger.info(f"Admin user - fetching all assets for company: {company_id}")
                
                # Check if there's a GSI for CompanyId
                try:
                    response = assets_table.query(
                        IndexName='CompanyIdIndex',
                        KeyConditionExpression='CompanyId = :companyId',
                        ExpressionAttributeValues={
                            ':companyId': company_id
                        }
                    )
                    assets = response.get('Items', [])
                    logger.info(f"Found {len(assets)} assets for company {company_id}")
                except ClientError as e:
                    # If there's no GSI, scan the table and filter (less efficient)
                    if e.response['Error']['Code'] == 'ValidationException' and 'IndexName' in str(e):
                        logger.warning("CompanyIdIndex not found, falling back to scan with filter")
                        response = assets_table.scan(
                            FilterExpression='CompanyId = :companyId',
                            ExpressionAttributeValues={
                                ':companyId': company_id
                            }
                        )
                        assets = response.get('Items', [])
                        logger.info(f"Scan found {len(assets)} assets for company {company_id}")
                    else:
                        raise
            else:
                # Regular users can only see assets they created
                logger.info(f"Regular user - fetching assets for user: {user_id}")
                
                # Try to use GSI for UserId
                try:
                    response = assets_table.query(
                        IndexName='UserIdIndex',
                        KeyConditionExpression='UserId = :userId',
                        ExpressionAttributeValues={
                            ':userId': user_id
                        }
                    )
                    assets = response.get('Items', [])
                    logger.info(f"Found {len(assets)} assets for user {user_id}")
                except ClientError as e:
                    # If there's no GSI, scan the table and filter (less efficient)
                    if e.response['Error']['Code'] == 'ValidationException' and 'IndexName' in str(e):
                        logger.warning("UserIdIndex not found, falling back to scan with filter")
                        response = assets_table.scan(
                            FilterExpression='UserId = :userId',
                            ExpressionAttributeValues={
                                ':userId': user_id
                            }
                        )
                        assets = response.get('Items', [])
                        logger.info(f"Scan found {len(assets)} assets for user {user_id}")
                    else:
                        raise
            
            # Return the assets
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'assets': assets
                }, cls=DecimalEncoder)
            }
            
        except cognito.exceptions.NotAuthorizedException:
            logger.error('Invalid or expired token')
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Invalid or expired token'
                })
            }
            
        except Exception as e:
            logger.error(f"Error getting user info: {str(e)}")
            raise
            
    except Exception as e:
        # Log full stack trace for any unhandled exceptions
        stack_trace = traceback.format_exc()
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(f"Stack trace: {stack_trace}")
        
        status_code = 500
        message = 'Internal server error'
        
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps({
                'message': message,
                'error': str(e)
            })
        }
