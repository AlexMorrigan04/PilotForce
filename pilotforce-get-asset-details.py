import json
import boto3
import logging
import base64

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create service clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
assets_table = dynamodb.Table('Assets')
bookings_table = dynamodb.Table('Bookings')

def decode_token(token):
    """Decode the JWT token without verification to extract claims"""
    try:
        # For ID tokens, we can decode them without verification to extract user info
        # Split the token into parts
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Decode the payload (middle part)
        payload_base64 = parts[1]
        # Add padding if needed
        payload_base64 += '=' * ((4 - len(payload_base64) % 4) % 4)
        # Convert from url-safe base64 to standard base64
        payload_base64 = payload_base64.replace('-', '+').replace('_', '/')
        # Decode the base64 string
        payload_json = base64.b64decode(payload_base64)
        # Parse the JSON
        payload = json.loads(payload_json)
        return payload
    except Exception as e:
        logger.error(f"Error decoding token: {str(e)}")
        return None

def lambda_handler(event, context):
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET'
    }
    
    # Log the incoming event for debugging
    logger.info(f"Event received: {json.dumps(event)}")
    
    # Handle OPTIONS requests (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Extract authentication token
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        if not auth_header:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Authorization token required'})
            }
        
        token = auth_header.replace('Bearer ', '')
        
        # Decode the token to extract claims without verification
        token_claims = decode_token(token)
        
        if not token_claims:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Invalid token format'})
            }
        
        # Extract user info from token claims
        user_id = token_claims.get('sub')
        company_id = token_claims.get('custom:companyId')
        user_role = token_claims.get('custom:userRole', 'User')
        
        logger.info(f"User ID from token: {user_id}, Company ID: {company_id}, Role: {user_role}")
        
        # Get the asset ID from the path parameters
        path_parameters = event.get('pathParameters', {}) or {}
        query_parameters = event.get('queryStringParameters', {}) or {}
        
        # Try to get asset ID from different possible locations
        asset_id = None
        if path_parameters and 'id' in path_parameters:
            asset_id = path_parameters['id']
        elif path_parameters and 'proxy' in path_parameters:
            asset_id = path_parameters['proxy']
        elif query_parameters and 'AssetId' in query_parameters:
            asset_id = query_parameters['AssetId']
        
        if not asset_id:
            logger.error(f"Asset ID not found in request: {json.dumps(event)}")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Asset ID is required'})
            }
        
        logger.info(f"Looking up asset with ID: {asset_id}")
        
        # Get the asset from DynamoDB
        response = assets_table.get_item(
            Key={
                'AssetId': asset_id
            }
        )
        
        asset = response.get('Item')
        
        # Check if asset exists
        if not asset:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'message': 'Asset not found'})
            }
        
        # FIXED PERMISSION LOGIC: Allow access to any asset in the user's company
        # First, ensure the asset belongs to the user's company
        asset_company_id = asset.get('CompanyId') or asset.get('companyId')
        if asset_company_id != company_id and user_role not in ['Admin', 'AccountAdmin']:
            logger.warning(f"Company ID mismatch: User company: {company_id}, Asset company: {asset_company_id}")
            return {
                'statusCode': 403,
                'headers': headers,
                'body': json.dumps({'message': 'You do not have permission to access this asset'})
            }
        
        logger.info("Asset found, returning details")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'asset': asset
            }, default=str)  # default=str handles datetime serialization
        }
    
    except Exception as e:
        logger.error(f"Error getting asset details: {str(e)}", exc_info=True)
        
        status_code = 500
        message = 'Internal server error'
        
        if hasattr(e, 'response') and e.response.get('Error', {}).get('Code') == 'NotAuthorizedException':
            status_code = 401
            message = 'Invalid or expired token'
        
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps({
                'message': message,
                'error': str(e)
            })
        }
