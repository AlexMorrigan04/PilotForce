import json
import boto3
import logging
import base64
import os
import uuid
import time
from datetime import datetime

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create DynamoDB client
dynamodb = boto3.resource('dynamodb')
bookings_table = dynamodb.Table(os.environ.get('BOOKINGS_TABLE_NAME', 'Bookings'))

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

def format_uk_postcode(postcode):
    """Format a UK postcode to ensure it has proper spacing and capitalization"""
    if not postcode:
        return ''
    
    # Remove all spaces and convert to uppercase
    clean_postcode = postcode.strip().upper().replace(' ', '')
    
    # UK postcodes have formats like XX9X 9XX or X9X 9XX or X9 9XX or X99 9XX
    # Insert space at the appropriate position
    if len(clean_postcode) > 3:
        # Assume the last 3 characters are the second part of the postcode
        formatted = f"{clean_postcode[:-3]} {clean_postcode[-3:]}"
        logger.info(f"Formatted postcode from '{postcode}' to '{formatted}'")
        return formatted
    
    return postcode.strip().upper()

def lambda_handler(event, context):
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }
    
    # Log the incoming event
    logger.info(f"Received event: {json.dumps(event)}")
    
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
        username = token_claims.get('cognito:username') or token_claims.get('name')
        email = token_claims.get('email')
        company_id = token_claims.get('custom:companyId')
        user_role = token_claims.get('custom:userRole', 'User')
        phone_number = token_claims.get('phone_number', '')
        
        logger.info(f"User info from token: ID={user_id}, Username={username}, Email={email}, Company ID={company_id}")
        
        # Parse the request body to get booking data
        try:
            body = json.loads(event.get('body', '{}'))
            logger.info(f"Request body parsed successfully with {len(body)} fields")
            
            # Extract user details directly from request - this is what the frontend sends
            request_user_id = body.get('UserId')
            if request_user_id and request_user_id != 'unknown-user':
                logger.info(f"Using user ID from request: {request_user_id}")
                if request_user_id != user_id:
                    logger.info(f"Request user ID differs from token user ID")
                user_id = request_user_id
            else:
                logger.info(f"Using user ID from token: {user_id}")
            
            # Get user details from the request
            user_email = body.get('userEmail') or email
            user_phone = body.get('userPhone') or phone_number
            user_name = body.get('userName') or username
            
            logger.info(f"User details: Name={user_name}, Email={user_email}, Phone={user_phone}")
            
            # Extract company name from request (frontend provides this)
            company_name = body.get('companyName') or body.get('CompanyName') or "Unknown Company"
            logger.info(f"Company: ID={company_id}, Name={company_name}")
            
            # Extract and validate postcode with better handling
            raw_postcode = body.get('postcode') or body.get('Postcode')
            if raw_postcode:
                logger.info(f"Found postcode in request: '{raw_postcode}'")
                postcode = format_uk_postcode(raw_postcode)
            else:
                logger.warning("No postcode found in request")
                address = body.get('address')
                if address:
                    logger.info(f"Attempting to extract postcode from address: '{address}'")
                    postcode = "BS16 1QY"  # Default test postcode 
                else:
                    logger.warning("No address found for postcode extraction")
                    postcode = "BS16 1QY"  # Default test postcode
                
                logger.info(f"Using fallback/default postcode: '{postcode}'")
            
            # Log important request fields
            asset_id = body.get('assetId')
            asset_name = body.get('assetName')
            logger.info(f"Creating booking for Asset: {asset_id} ({asset_name}), User: {user_id}")
            
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Invalid request body'})
            }
        
        # Ensure required fields exist
        if not body.get('assetId'):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Asset ID is required'})
            }
        
        if not body.get('jobTypes') or not isinstance(body.get('jobTypes'), list) or len(body.get('jobTypes')) == 0:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'At least one job type is required'})
            }
        
        # Generate a booking ID if not provided
        booking_id = body.get('BookingId') or f"booking_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        # Get site contact information from the request
        site_contact = body.get('siteContact')
        site_contact_id = None
        
        if site_contact:
            site_contact_id = site_contact.get('id') or f"contact_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            logger.info(f"Using site contact with ID: {site_contact_id}")
        
        # Prepare the booking item with data from the request
        booking_item = {
            'BookingId': booking_id,
            'CompanyId': body.get('CompanyId', company_id),
            'UserId': user_id,
            'assetId': asset_id,
            'assetName': asset_name,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat(),
            'status': body.get('status', 'pending'),
            'jobTypes': body.get('jobTypes', []),
            'postcode': postcode,
            'location': body.get('location', ''),
            'userName': user_name,
            'userEmail': user_email,
            'userPhone': user_phone,
            'companyName': company_name,
            'notes': body.get('notes')
        }
        
        # Add optional fields if present
        if body.get('flightDate'):
            booking_item['flightDate'] = body.get('flightDate')
            logger.info(f"Flight date scheduled for: {body.get('flightDate')}")
        
        if body.get('scheduling'):
            booking_item['scheduling'] = body.get('scheduling')
        
        if body.get('serviceOptions'):
            booking_item['serviceOptions'] = body.get('serviceOptions')
        
        if site_contact:
            booking_item['siteContact'] = {
                'id': site_contact_id,
                'name': site_contact.get('name', ''),
                'phone': site_contact.get('phone', ''),
                'email': site_contact.get('email', ''),
                'isAvailableOnsite': site_contact.get('isAvailableOnsite', False)
            }
        
        # Add email domain if provided
        if body.get('emailDomain'):
            booking_item['emailDomain'] = body.get('emailDomain')
        elif user_email and '@' in user_email:
            domain = user_email.split('@')[1]
            booking_item['emailDomain'] = domain.split('.')[0]
        
        # Log final booking verification with more details
        logger.info(f"Final booking details: User={user_name} ({user_id}), Company={company_name}, Postcode={postcode}")
        
        # Save to DynamoDB
        bookings_table.put_item(Item=booking_item)
        
        # Return success response
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': 'Booking created successfully',
                'bookingId': booking_id
            })
        }
    
    except Exception as e:
        logger.error(f"Error creating booking: {str(e)}", exc_info=True)
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': 'Internal server error',
                'error': str(e)
            })
        }
