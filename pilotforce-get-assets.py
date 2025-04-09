import json
import boto3
import logging
import base64
import os
import decimal
from boto3.dynamodb.conditions import Key, Attr

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create DynamoDB client
dynamodb = boto3.resource('dynamodb')
assets_table = dynamodb.Table('Assets')

# Helper class to convert Decimal to float/int for JSON serialization
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            # Convert decimal to float or int if possible
            if o % 1 == 0:
                return int(o)
            else:
                return float(o)
        return super(DecimalEncoder, self).default(o)

def decode_token(token):
    """Decode the JWT token without verification to extract claims"""
    try:
        # For ID tokens, we can decode them without verification to extract user info
        # Split the token into parts
        parts = token.split('.')
        if len(parts) != 3:
            logger.error("Token does not have three parts")
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
        logger.info(f"Decoded token payload: {json.dumps(payload)}")
        return payload
    except Exception as e:
        logger.error(f"Error decoding token: {str(e)}")
        return None

def lambda_handler(event, context):
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,DELETE'
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
        # Check if a specific asset ID is requested in the path
        path_parameters = event.get('pathParameters', {}) or {}
        asset_id = path_parameters.get('id')
        
        if asset_id:
            logger.info(f"Fetching specific asset with ID: {asset_id}")
            
            # Query for the specific asset
            response = assets_table.scan(
                FilterExpression=Attr('AssetId').eq(asset_id) | Attr('id').eq(asset_id)
            )
            
            items = response.get('Items', [])
            
            if not items:
                logger.warning(f"No asset found with ID: {asset_id}")
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'message': f'Asset with ID {asset_id} not found'})
                }
            
            logger.info(f"Found asset: {json.dumps(items[0], cls=DecimalEncoder)}")
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(items[0], cls=DecimalEncoder)
            }
        
        # For non-specific requests, check for query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        company_id = query_params.get('companyId')
        
        # If no companyId in query params, try to get it from the token
        if not company_id:
            # Extract authentication token
            auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
            
            if auth_header:
                token = auth_header.replace('Bearer ', '')
                token_claims = decode_token(token)
                
                if token_claims:
                    company_id = token_claims.get('custom:companyId')
                    logger.info(f"Extracted company ID from token: {company_id}")
        
        # If we have a company ID, filter by it
        if company_id:
            logger.info(f"Fetching assets for company ID: {company_id}")
            
            # First try using CompanyIdIndex GSI
            try:
                logger.info("Trying query with CompanyIdIndex")
                response = assets_table.query(
                    IndexName='CompanyIdIndex',
                    KeyConditionExpression=Key('CompanyId').eq(company_id)
                )
                
                assets = response.get('Items', [])
                logger.info(f"Found {len(assets)} assets using CompanyIdIndex")
                
                # If no results, try with lowercase companyId
                if not assets:
                    try:
                        logger.info("No results from first GSI query, trying with lowercase 'companyId'")
                        lowercase_response = assets_table.query(
                            IndexName='companyIdIndex',  # Try lowercase index name
                            KeyConditionExpression=Key('companyId').eq(company_id)
                        )
                        assets = lowercase_response.get('Items', [])
                        logger.info(f"Found {len(assets)} assets using lowercase companyIdIndex")
                    except Exception as lowercase_error:
                        logger.warning(f"Error with lowercase index query: {str(lowercase_error)}")
                
                # If still no results, try scanning with a filter
                if not assets:
                    logger.info("No results from GSI queries, trying scan with filter")
                    scan_response = assets_table.scan(
                        FilterExpression=Attr('CompanyId').eq(company_id) | Attr('companyId').eq(company_id)
                    )
                    assets = scan_response.get('Items', [])
                    logger.info(f"Found {len(assets)} assets using scan with filter")
            
            except Exception as query_error:
                logger.error(f"Error querying DynamoDB with GSI: {str(query_error)}")
                # Fallback to scan if GSI fails
                scan_response = assets_table.scan(
                    FilterExpression=Attr('CompanyId').eq(company_id) | Attr('companyId').eq(company_id)
                )
                assets = scan_response.get('Items', [])
                logger.info(f"Found {len(assets)} assets using fallback scan with filter")
            
            # If we found assets, return them
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(assets, cls=DecimalEncoder)  # Use DecimalEncoder
            }
        
        # If no company ID, return all assets (with a limit for safety)
        logger.info("No company ID provided, fetching all assets with limit")
        response = assets_table.scan(Limit=100)
        assets = response.get('Items', [])
        
        logger.info(f"Returning {len(assets)} assets")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(assets, cls=DecimalEncoder)  # Use DecimalEncoder
        }
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'message': f'Internal server error: {str(e)}'})
        }
