import json
import boto3
import logging
import base64
import os
from boto3.dynamodb.conditions import Key, Attr

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create DynamoDB client
dynamodb = boto3.resource('dynamodb')
bookings_table = dynamodb.Table('Bookings')

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
        # Check if a specific booking ID is requested in the path
        path_parameters = event.get('pathParameters', {}) or {}
        booking_id = path_parameters.get('id')
        
        if booking_id:
            logger.info(f"Fetching specific booking with ID: {booking_id}")
            
            # Query for the specific booking
            response = bookings_table.scan(
                FilterExpression=Attr('BookingId').eq(booking_id) | Attr('id').eq(booking_id)
            )
            
            items = response.get('Items', [])
            
            if not items:
                logger.warning(f"No booking found with ID: {booking_id}")
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'message': f'Booking with ID {booking_id} not found'})
                }
            
            logger.info(f"Found booking: {json.dumps(items[0])}")
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(items[0])
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
            logger.info(f"Fetching bookings for company ID: {company_id}")
            
            # First try with GSI if available
            try:
                response = bookings_table.query(
                    IndexName='CompanyIdIndex',
                    KeyConditionExpression=Key('CompanyId').eq(company_id)
                )
                
                bookings = response.get('Items', [])
                logger.info(f"Found {len(bookings)} bookings via CompanyIdIndex")
                
                # If no results, try with scan fallback
                if not bookings:
                    response = bookings_table.scan(
                        FilterExpression=Attr('CompanyId').eq(company_id) | Attr('companyId').eq(company_id)
                    )
                    bookings = response.get('Items', [])
                    logger.info(f"Found {len(bookings)} bookings via scan filter")
            except Exception as e:
                logger.error(f"Error using GSI: {str(e)}")
                # Fallback to scan
                response = bookings_table.scan(
                    FilterExpression=Attr('CompanyId').eq(company_id) | Attr('companyId').eq(company_id)
                )
                bookings = response.get('Items', [])
                logger.info(f"Found {len(bookings)} bookings via fallback scan")
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(bookings)
            }
        
        # If no company ID, return all bookings (with a limit for safety)
        logger.info("No company ID provided, fetching all bookings with limit")
        response = bookings_table.scan(Limit=100)
        bookings = response.get('Items', [])
        
        logger.info(f"Returning {len(bookings)} bookings")
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(bookings)
        }
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'message': f'Internal server error: {str(e)}'})
        }
