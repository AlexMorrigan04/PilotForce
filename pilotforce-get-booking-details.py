import json
import boto3
import logging
from boto3.dynamodb.conditions import Key, Attr
import decimal

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configure DynamoDB resource
# No need for credentials in Lambda - uses IAM role permissions
dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
bookings_table = dynamodb.Table('Bookings')

# Helper class to handle Decimal values in the data
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 == 0:
                return int(o)
            else:
                return float(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET',
        'Content-Type': 'application/json'
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
        # Validate httpMethod - make sure we're processing a GET request
        if event.get('httpMethod') != 'GET':
            logger.error(f"Invalid HTTP method: {event.get('httpMethod')}")
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'message': 'Method not allowed'})
            }
        
        # Log full event for debugging
        logger.info(f"FULL EVENT: {json.dumps(event)}")
        logger.info(f"EVENT HEADERS: {json.dumps(event.get('headers', {}))}")
        logger.info(f"EVENT PATH: {event.get('path')}")
        logger.info(f"EVENT RESOURCE: {event.get('resource')}")
        
        # Extract authentication token
        auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
        logger.info(f"Auth header: {auth_header and auth_header[:20]}...")
        
        if not auth_header:
            logger.error("No authorization header provided")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'message': 'Authorization token required'})
            }
        
        token = auth_header.replace('Bearer ', '')
        
        # Get the booking ID from ALL possible sources
        path_parameters = event.get('pathParameters', {}) or {}
        query_parameters = event.get('queryStringParameters', {}) or {}
        
        # Log all available parameters for debugging
        logger.info(f"Path parameters: {json.dumps(path_parameters)}")
        logger.info(f"Query parameters: {json.dumps(query_parameters)}")
        
        # CRITICAL: If resource pattern is /get-booking-details/{id}, 
        # get booking_id from path parameters first
        booking_id = None
        
        # Try direct path format (/get-booking-details/{id})
        if event.get('resource') == '/get-booking-details/{id}':
            booking_id = path_parameters.get('id')
            logger.info(f"📌 Found booking ID from direct Lambda path: {booking_id}")
        
        # If not found, try the /bookings/{id} format
        if not booking_id and path_parameters.get('id'):
            booking_id = path_parameters.get('id')
            logger.info(f"📌 Found booking ID from bookings/{id} path: {booking_id}")
        
        # If still not found, try from query parameters as fallback
        if not booking_id:
            # Check multiple possible parameter names
            for param_name in ['BookingId', 'bookingId', 'id']:
                if param_name in query_parameters:
                    booking_id = query_parameters[param_name]
                    logger.info(f"📌 Found booking ID in query parameter '{param_name}': {booking_id}")
                    break
        
        # Last resort: Try extracting from the path
        if not booking_id and event.get('path'):
            path = event.get('path', '')
            path_parts = path.split('/')
            if len(path_parts) > 0:
                possible_id = path_parts[-1]  # Get the last part of the path
                logger.info(f"📌 Trying to extract booking ID from path end: {possible_id}")
                if possible_id and possible_id != 'get-booking-details':
                    booking_id = possible_id
        
        # Loudly log which ID we're using
        if booking_id:
            logger.info(f"✅ Using booking ID: {booking_id}")
        else:
            logger.error("❌ No booking ID found in any parameter")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Booking ID is required but not found in request'})
            }
        
        # First try to fetch the booking by BookingId as the primary key
        try:
            logger.info(f"Attempting direct get_item with BookingId='{booking_id}'")
            response = bookings_table.get_item(
                Key={'BookingId': booking_id}
            )
            booking = response.get('Item')
            if booking:
                logger.info(f"Successfully found booking with direct get_item using BookingId")
        except Exception as e:
            logger.warning(f"Error when trying direct get_item with BookingId: {str(e)}")
            booking = None
            
        # If not found, try with 'id' as the key
        if not booking:
            try:
                logger.info(f"Attempting direct get_item with id='{booking_id}'")
                response = bookings_table.get_item(
                    Key={'id': booking_id}
                )
                booking = response.get('Item')
                if booking:
                    logger.info(f"Successfully found booking with direct get_item using id")
            except Exception as e:
                logger.warning(f"Error when trying direct get_item with id: {str(e)}")
                booking = None
                
        # If not found with direct access, try a scan with filter (fallback)
        if not booking:
            logger.info(f"Booking not found with direct key access, trying scan with filter")
            
            try:
                # Handle case where BookingId might be stored in different casing or field name
                scan_filter = (
                    Attr('BookingId').eq(booking_id) | 
                    Attr('bookingId').eq(booking_id) | 
                    Attr('id').eq(booking_id)
                )
                
                logger.info(f"Executing scan with filter for any ID field matching '{booking_id}'")
                response = bookings_table.scan(FilterExpression=scan_filter)
                items = response.get('Items', [])
                
                if items:
                    booking = items[0]
                    logger.info(f"Found booking via scan: ID={booking.get('BookingId') or booking.get('bookingId') or booking.get('id')}")
                else:
                    logger.warning(f"No booking found with ID: {booking_id}")
            except Exception as scan_error:
                logger.error(f"Error scanning for booking: {str(scan_error)}")
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({'message': f'Error retrieving booking: {str(scan_error)}'}, cls=DecimalEncoder)
                }
        
        # If still no booking found, return 404
        if not booking:
            logger.warning(f"No booking found with ID: {booking_id} after all attempts")
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'message': f'Booking with ID {booking_id} not found'})
            }
        
        # Log the found booking structure
        logger.info(f"Found booking with keys: {', '.join(booking.keys())}")
        
        # Return the booking data in the response
        logger.info(f"Successfully retrieved booking: {booking.get('BookingId') or booking.get('id')}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(booking, cls=DecimalEncoder)
        }
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'message': f'Internal server error: {str(e)}'})
        }
