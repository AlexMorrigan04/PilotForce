import json
import boto3
import uuid
from datetime import datetime
import logging
from botocore.exceptions import ClientError
import traceback
from decimal import Decimal

# Configure logging for better CloudWatch output
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')
assets_table = dynamodb.Table('Assets')

# Helper function to convert floats to Decimal for DynamoDB
def float_to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [float_to_decimal(i) for i in obj]
    else:
        return obj

def lambda_handler(event, context):
    # Detailed logging of incoming event
    logger.info(f"Event received: {json.dumps(event)}")
    
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }
    
    # Handle OPTIONS requests for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        logger.info("Handling OPTIONS preflight request")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # For direct Lambda invocation (not through API Gateway)
        # If the event itself is the asset data (no headers, etc.), process it directly
        if 'name' in event and 'assetType' in event and 'httpMethod' not in event and 'headers' not in event:
            logger.info("Processing direct Lambda invocation")
            
            # Convert all floats to Decimal for DynamoDB
            asset_data = float_to_decimal(event)
            
            # Create a new asset record 
            asset_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().isoformat()
            
            # Get user and company IDs from the request payload if available
            user_id = asset_data.get('userId', 'direct-invocation')
            company_id = asset_data.get('companyId', 'default-company')
            
            logger.info(f"Using provided user credentials - UserId: {user_id}, CompanyId: {company_id}")
            
            asset = {
                'AssetId': asset_id,
                'UserId': user_id,
                'CompanyId': company_id,
                'Name': asset_data.get('name'),
                'Description': asset_data.get('description', ''),
                'AssetType': asset_data.get('assetType'),
                'Address': asset_data.get('address', ''),
                'Coordinates': asset_data.get('coordinates'),
                'Area': asset_data.get('area', 0),
                'CreatedAt': timestamp,
                'UpdatedAt': timestamp,
                'Tags': asset_data.get('tags', [])
            }
            
            # Add centerPoint if provided
            if 'centerPoint' in asset_data:
                asset['CenterPoint'] = asset_data['centerPoint']
                
            if 'geojson' in asset_data:
                asset['GeoJSON'] = asset_data['geojson']
                
            # Save to DynamoDB
            logger.info(f"Saving asset directly to DynamoDB: {json.dumps(asset, default=str)}")
            assets_table.put_item(Item=asset)
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Asset created successfully (direct invocation)',
                    'asset': asset
                }, default=str)
            }
    
        # For API Gateway invocation - extract authentication token
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        logger.info(f"Auth header present: {bool(auth_header)}")
        
        # Parse request body for API Gateway invocation
        body = event.get('body')
        if not body:
            logger.warning("Request body is empty")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Request body is required'})
            }
        
        # Parse JSON body and convert floats to Decimal
        try:
            if isinstance(body, str):
                parsed_body = json.loads(body)
            else:
                parsed_body = body  # In case it's already parsed
                
            # Convert floats to Decimal for DynamoDB
            asset_data = float_to_decimal(parsed_body)
            logger.info(f"Parsed asset data: {json.dumps(asset_data, default=str)}")
        except json.JSONDecodeError as json_error:
            logger.error(f"JSON parsing error: {str(json_error)}")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Invalid JSON in request body'})
            }
        
        # Validate required fields
        if not asset_data.get('name') or not asset_data.get('assetType'):
            logger.warning(f"Missing required fields. name: {bool(asset_data.get('name'))}, assetType: {bool(asset_data.get('assetType'))}")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Missing required asset information'})
            }
        
        # Get user info from token if provided, otherwise get from request payload
        user_id = asset_data.get('userId', 'test-user-id')
        company_id = asset_data.get('companyId', 'test-company-id')
        
        if auth_header:
            try:
                # Remove 'Bearer ' prefix if present
                token = auth_header.replace('Bearer ', '')
                
                # Log token length for debugging (don't log the actual token for security)
                logger.info(f"Token length: {len(token)}")
                
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
                
                logger.info(f"User ID: {user_id}, Company ID: {company_id}")
            except Exception as cognito_error:
                logger.error(f"Error getting user from Cognito: {str(cognito_error)}")
                # Use values from request instead of default
                logger.info(f"Using user values from request payload: UserId={user_id}, CompanyId={company_id}")
        else:
            logger.info(f"No auth header provided, using values from request: UserId={user_id}, CompanyId={company_id}")
        
        # Create a new asset record
        asset_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        asset = {
            'AssetId': asset_id,
            'UserId': user_id,
            'CompanyId': company_id,
            'Name': asset_data.get('name'),
            'Description': asset_data.get('description', ''),
            'AssetType': asset_data.get('assetType'),
            'Address': asset_data.get('address', ''),
            'Coordinates': asset_data.get('coordinates'),
            'Area': asset_data.get('area', 0),
            'CreatedAt': timestamp,
            'UpdatedAt': timestamp,
            'Tags': asset_data.get('tags', [])
        }
        
        # Add centerPoint if provided
        if 'centerPoint' in asset_data:
            asset['CenterPoint'] = asset_data['centerPoint']
            
        # Add GeoJSON if provided
        if 'geojson' in asset_data:
            asset['GeoJSON'] = asset_data['geojson']
        
        # Log the complete asset object before saving
        logger.info(f"Asset to be saved: {json.dumps(asset, default=str)}")
        
        # Save to DynamoDB with detailed error handling
        try:
            logger.info(f"Attempting to save asset to DynamoDB table: Assets")
            put_response = assets_table.put_item(Item=asset)
            logger.info(f"DynamoDB put_item response: {json.dumps(put_response, default=str)}")
        except ClientError as db_error:
            error_code = db_error.response['Error']['Code']
            error_message = db_error.response['Error']['Message']
            logger.error(f"DynamoDB error: {error_code} - {error_message}")
            
            # Check for specific DynamoDB errors
            if error_code == 'ResourceNotFoundException':
                logger.error("DynamoDB table 'Assets' not found")
            elif error_code == 'ValidationException':
                logger.error(f"DynamoDB validation error: {error_message}")
            
            raise
        
        # Log success and return response
        logger.info(f"Asset created successfully with ID: {asset_id}")
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'message': 'Asset created successfully',
                'asset': asset
            }, default=str)
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
