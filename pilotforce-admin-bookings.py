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
BOOKING_TABLE = os.environ.get('BOOKING_TABLE', 'Bookings')
ASSET_TABLE = os.environ.get('ASSET_TABLE', 'Assets')
USER_TABLE = os.environ.get('USER_TABLE', 'Users')

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
booking_table = dynamodb.Table(BOOKING_TABLE)
asset_table = dynamodb.Table(ASSET_TABLE)
user_table = dynamodb.Table(USER_TABLE)

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
    
    try:
        # Route the request based on path and method
        path = event.get('resource', '')
        method = event.get('httpMethod', '')
        
        # Handle GET /admin/bookings
        if path == '/admin/bookings' and method == 'GET':
            return get_all_bookings(event)
        
        # Handle GET /admin/bookings/{bookingId}
        elif path == '/admin/bookings/{bookingId}' and method == 'GET':
            return get_booking_by_id(event)
        
        # Handle DELETE /admin/bookings/{bookingId}
        elif path == '/admin/bookings/{bookingId}' and method == 'DELETE':
            return delete_booking(event)
        
        # Handle PUT /admin/bookings/{bookingId}/status
        elif path == '/admin/bookings/{bookingId}/status' and method == 'PUT':
            return update_booking_status(event)
        
        # Unknown route
        return generate_response(404, {'message': 'Not Found'})
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return generate_response(500, {'message': f'Internal Server Error: {str(e)}'})

# Get all bookings
def get_all_bookings(event):
    try:
        # Get query parameters for filtering
        query_params = event.get('queryStringParameters', {}) or {}
        status_filter = query_params.get('status', '')
        company_filter = query_params.get('companyId', '')
        user_filter = query_params.get('userId', '')
        asset_filter = query_params.get('assetId', '')
        date_range = query_params.get('dateRange', '')
        
        # Determine scan parameters based on filters
        filter_expressions = []
        expression_attribute_values = {}
        
        if status_filter:
            filter_expressions.append("status = :status")
            expression_attribute_values[':status'] = status_filter
        
        # Use GSI if filtering by companyId, userId, or assetId
        if company_filter:
            # Use the CompanyIdIndex GSI
            response = booking_table.query(
                IndexName='CompanyIdIndex',
                KeyConditionExpression='CompanyId = :companyId',
                ExpressionAttributeValues={':companyId': company_filter}
            )
            bookings_data = response.get('Items', [])
            
            # Handle pagination for large result sets
            while 'LastEvaluatedKey' in response:
                response = booking_table.query(
                    IndexName='CompanyIdIndex',
                    KeyConditionExpression='CompanyId = :companyId',
                    ExpressionAttributeValues={':companyId': company_filter},
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                bookings_data.extend(response.get('Items', []))
        
        elif user_filter:
            # Use the UserIdIndex GSI
            response = booking_table.query(
                IndexName='UserIdIndex',
                KeyConditionExpression='UserId = :userId',
                ExpressionAttributeValues={':userId': user_filter}
            )
            bookings_data = response.get('Items', [])
            
            # Handle pagination for large result sets
            while 'LastEvaluatedKey' in response:
                response = booking_table.query(
                    IndexName='UserIdIndex',
                    KeyConditionExpression='UserId = :userId',
                    ExpressionAttributeValues={':userId': user_filter},
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                bookings_data.extend(response.get('Items', []))
        
        elif asset_filter:
            # Use the AssetIdIndex GSI
            response = booking_table.query(
                IndexName='AssetIdIndex',
                KeyConditionExpression='assetId = :assetId',
                ExpressionAttributeValues={':assetId': asset_filter}
            )
            bookings_data = response.get('Items', [])
            
            # Handle pagination for large result sets
            while 'LastEvaluatedKey' in response:
                response = booking_table.query(
                    IndexName='AssetIdIndex',
                    KeyConditionExpression='assetId = :assetId',
                    ExpressionAttributeValues={':assetId': asset_filter},
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
                bookings_data.extend(response.get('Items', []))
        
        else:
            # Full scan with filter expression if needed
            scan_params = {}
            if filter_expressions:
                scan_params['FilterExpression'] = ' AND '.join(filter_expressions)
                scan_params['ExpressionAttributeValues'] = expression_attribute_values
            
            # Scan the Bookings table
            response = booking_table.scan(**scan_params)
            bookings_data = response.get('Items', [])
            
            # Handle pagination for large result sets
            while 'LastEvaluatedKey' in response:
                scan_params['ExclusiveStartKey'] = response['LastEvaluatedKey']
                response = booking_table.scan(**scan_params)
                bookings_data.extend(response.get('Items', []))
        
        # Sort bookings by createdAt in descending order (newest first)
        bookings_data.sort(
            key=lambda x: x.get('createdAt', ''),
            reverse=True
        )
        
        # Apply date range filter if specified
        if date_range:
            now = datetime.datetime.now()
            
            if date_range == 'today':
                today = now.strftime('%Y-%m-%d')
                bookings_data = [b for b in bookings_data if b.get('flightDate', '').startswith(today)]
            
            elif date_range == 'this-week':
                # Calculate start of week (Monday)
                start_of_week = (now - datetime.timedelta(days=now.weekday())).strftime('%Y-%m-%d')
                bookings_data = [b for b in bookings_data if b.get('flightDate', '') >= start_of_week]
            
            elif date_range == 'this-month':
                start_of_month = f"{now.year}-{now.month:02d}-01"
                bookings_data = [b for b in bookings_data if b.get('flightDate', '').startswith(f"{now.year}-{now.month:02d}")]
            
            elif date_range == 'last-month':
                last_month = now.month - 1 if now.month > 1 else 12
                last_month_year = now.year if now.month > 1 else now.year - 1
                start_of_last_month = f"{last_month_year}-{last_month:02d}-01"
                
                if now.month > 1:
                    end_of_last_month = f"{now.year}-{now.month:02d}-01"
                else:
                    end_of_last_month = f"{now.year}-01-01"
                
                bookings_data = [b for b in bookings_data if 
                                 b.get('flightDate', '') >= start_of_last_month and 
                                 b.get('flightDate', '') < end_of_last_month]
        
        logger.info(f"Found {len(bookings_data)} bookings in DynamoDB after filtering")
        
        # Process bookings to ensure consistent format
        bookings = []
        for booking in bookings_data:
            # Ensure all the expected fields are present
            booking_obj = {
                'BookingId': booking.get('BookingId', ''),
                'status': booking.get('status', 'pending'),
                'location': booking.get('location', ''),
                'flightDate': booking.get('flightDate', ''),
                'createdAt': booking.get('createdAt', ''),
                'updatedAt': booking.get('updatedAt', ''),
                'jobTypes': booking.get('jobTypes', ''),
                'assetId': booking.get('assetId', ''),
                'assetName': booking.get('assetName', ''),
                'CompanyId': booking.get('CompanyId', ''),
                'companyName': booking.get('companyName', ''),
                'userEmail': booking.get('userEmail', ''),
                'userName': booking.get('userName', ''),
                'userPhone': booking.get('userPhone', ''),
                'UserId': booking.get('UserId', ''),
                'postcode': booking.get('postcode', ''),
                'notes': booking.get('notes', ''),
                'serviceOptions': booking.get('serviceOptions', []),
                'scheduling': booking.get('scheduling', {}),
                'siteContact': booking.get('siteContact', ''),
                'emailDomain': booking.get('emailDomain', '')
            }
            
            bookings.append(booking_obj)
        
        # Sample the first booking for debugging
        if bookings:
            logger.info(f"Sample booking data: {json.dumps(bookings[0])}")
        
        return generate_response(200, {'bookings': bookings})
    
    except Exception as e:
        logger.error(f"Error getting all bookings: {str(e)}")
        return generate_response(500, {'message': f'Error retrieving bookings: {str(e)}'})

# Get a specific booking by ID
def get_booking_by_id(event):
    try:
        booking_id = event['pathParameters']['bookingId']
        
        # Get booking from DynamoDB
        response = booking_table.get_item(
            Key={'BookingId': booking_id}
        )
        
        if 'Item' not in response:
            return generate_response(404, {'message': 'Booking not found'})
        
        booking = response['Item']
        
        # Ensure all expected fields are present
        booking_obj = {
            'BookingId': booking.get('BookingId', ''),
            'status': booking.get('status', 'pending'),
            'location': booking.get('location', ''),
            'flightDate': booking.get('flightDate', ''),
            'createdAt': booking.get('createdAt', ''),
            'updatedAt': booking.get('updatedAt', ''),
            'jobTypes': booking.get('jobTypes', ''),
            'assetId': booking.get('assetId', ''),
            'assetName': booking.get('assetName', ''),
            'CompanyId': booking.get('CompanyId', ''),
            'companyName': booking.get('companyName', ''),
            'userEmail': booking.get('userEmail', ''),
            'userName': booking.get('userName', ''),
            'userPhone': booking.get('userPhone', ''),
            'UserId': booking.get('UserId', ''),
            'postcode': booking.get('postcode', ''),
            'notes': booking.get('notes', ''),
            'serviceOptions': booking.get('serviceOptions', []),
            'scheduling': booking.get('scheduling', {}),
            'siteContact': booking.get('siteContact', ''),
            'emailDomain': booking.get('emailDomain', '')
        }
        
        return generate_response(200, {'booking': booking_obj})
    
    except Exception as e:
        logger.error(f"Error getting booking by ID: {str(e)}")
        return generate_response(500, {'message': f'Error retrieving booking: {str(e)}'})

# Delete a booking
def delete_booking(event):
    try:
        booking_id = event['pathParameters']['bookingId']
        
        # Check if booking exists
        response = booking_table.get_item(
            Key={'BookingId': booking_id}
        )
        
        if 'Item' not in response:
            return generate_response(404, {'message': 'Booking not found'})
        
        # Delete booking from DynamoDB
        booking_table.delete_item(
            Key={'BookingId': booking_id}
        )
        
        logger.info(f"Deleted booking: {booking_id}")
        
        return generate_response(200, {'message': 'Booking deleted successfully'})
    
    except Exception as e:
        logger.error(f"Error deleting booking: {str(e)}")
        return generate_response(500, {'message': f'Error deleting booking: {str(e)}'})

# Update booking status
def update_booking_status(event):
    try:
        booking_id = event['pathParameters']['bookingId']
        body = json.loads(event['body'])
        new_status = body.get('status')
        
        if not new_status:
            return generate_response(400, {'message': 'Status is required'})
        
        # Check if booking exists
        response = booking_table.get_item(
            Key={'BookingId': booking_id}
        )
        
        if 'Item' not in response:
            return generate_response(404, {'message': 'Booking not found'})
        
        # Update booking status in DynamoDB
        from datetime import datetime
        
        booking_table.update_item(
            Key={'BookingId': booking_id},
            UpdateExpression='SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':status': new_status,
                ':updatedAt': datetime.now().isoformat()
            }
        )
        
        logger.info(f"Updated booking status to {new_status}: {booking_id}")
        
        return generate_response(200, {
            'message': 'Booking status updated successfully',
            'BookingId': booking_id,
            'status': new_status
        })
    
    except Exception as e:
        logger.error(f"Error updating booking status: {str(e)}")
        return generate_response(500, {'message': f'Error updating booking status: {str(e)}'})