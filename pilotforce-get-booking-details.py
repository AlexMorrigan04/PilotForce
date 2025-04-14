import json
import boto3
import logging
from boto3.dynamodb.conditions import Key, Attr
import decimal
from botocore.exceptions import ClientError
import os
import urllib.parse
import uuid

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configure DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')
bookings_table = dynamodb.Table('Bookings')
image_uploads_table = dynamodb.Table('ImageUploads')
resources_table = dynamodb.Table('Resources')
geotiff_uploads_table = dynamodb.Table('GeoTiffChunks')

# Configure S3 client for generating presigned URLs
s3_client = boto3.client('s3', region_name='eu-north-1')
s3_resource = boto3.resource('s3', region_name='eu-north-1')
s3_bucket = 'pilotforce-resources'  # Main S3 bucket

# Helper class to handle Decimal values in the data
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 == 0:
                return int(o)
            else:
                return float(o)
        return super(DecimalEncoder, self).default(o)

def extract_nested_value(data, default=None):
    """
    Extract values from deeply nested DynamoDB structures.
    Handles nested maps (M), strings (S), numbers (N) and other DynamoDB data types.
    Updated to better handle multi-level nested structures.
    """
    if data is None:
        return default
    
    if isinstance(data, dict):
        # Handle DynamoDB Map type
        if 'M' in data:
            return extract_nested_value(data['M'])
        # Handle DynamoDB String type
        elif 'S' in data:
            return data['S']
        # Handle DynamoDB Number type
        elif 'N' in data:
            try:
                value = data['N']
                # If the N value is itself a string or dict, extract it further
                if isinstance(value, dict):
                    value = extract_nested_value(value)
                elif isinstance(value, str):
                    return float(value)
                return float(value)
            except (ValueError, TypeError):
                return default
        # Handle normal dict structure (recursively process each key)
        else:
            result = {}
            for key, value in data.items():
                result[key] = extract_nested_value(value)
            return result
    elif isinstance(data, list):
        return [extract_nested_value(item) for item in data]
    else:
        # Return primitive values as is
        return data

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
        
        # Try to get booking_id from all possible locations
        booking_id = None
        
        # Try direct path format from path parameters
        if path_parameters.get('id'):
            booking_id = path_parameters.get('id')
            logger.info(f"📌 Found booking ID from path parameter 'id': {booking_id}")
        
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
        
        # Fetch booking details
        booking = get_booking_by_id(booking_id)
        
        # If no booking found, return 404
        if not booking:
            logger.warning(f"No booking found with ID: {booking_id} after all attempts")
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'message': f'Booking with ID {booking_id} not found'})
            }
        
        # Fetch images for this booking
        images = fetch_booking_images(booking_id)
        
        # Fetch GeoTIFF data if available
        geotiff_data = fetch_geotiff_data(booking_id)
        
        # Add images and GeoTIFF data to the booking response
        booking['images'] = images
        if geotiff_data:
            booking['geoTiff'] = geotiff_data
        
        # Return the enhanced booking data
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

def get_booking_by_id(booking_id):
    """Fetch booking details from DynamoDB."""
    try:
        # First try with BookingId as the primary key
        response = bookings_table.get_item(Key={'BookingId': booking_id})
        booking = response.get('Item')
        if booking:
            logger.info(f"Successfully found booking with BookingId: {booking_id}")
            return booking
            
        # Try with 'id' as the key if not found
        response = bookings_table.get_item(Key={'id': booking_id})
        booking = response.get('Item')
        if booking:
            logger.info(f"Successfully found booking with id: {booking_id}")
            return booking
            
        # Fall back to scan with filter if direct key access fails
        scan_filter = (
            Attr('BookingId').eq(booking_id) | 
            Attr('bookingId').eq(booking_id) | 
            Attr('id').eq(booking_id)
        )
        
        response = bookings_table.scan(FilterExpression=scan_filter)
        items = response.get('Items', [])
        
        if items:
            booking = items[0]
            logger.info(f"Found booking via scan: {booking.get('BookingId') or booking.get('id')}")
            return booking
        
        logger.warning(f"No booking found with ID: {booking_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error fetching booking: {str(e)}")
        return None

def fetch_booking_images(booking_id):
    """Fetch images associated with a booking from multiple sources."""
    logger.info(f"Fetching images for booking: {booking_id}")
    images = []
    
    try:
        # Get all resources from the Resources table - primary source for all files
        try:
            logger.info("Fetching all files from Resources table...")
            resources_response = resources_table.scan(
                FilterExpression=Attr('BookingId').eq(booking_id)
            )
            resources_items = resources_response.get('Items', [])
            
            if resources_items:
                logger.info(f"Found {len(resources_items)} resources in Resources table")
                
                for item in resources_items:
                    try:
                        # Generate presigned URL with extended expiration (7 days)
                        s3_key = item.get('S3Path')
                        presigned_url = None
                        
                        if s3_key:
                            try:
                                # Check if the object exists in S3 before generating URL
                                s3_client.head_object(Bucket=s3_bucket, Key=s3_key)
                                
                                # Generate presigned URL with extended expiration
                                presigned_url = s3_client.generate_presigned_url(
                                    'get_object',
                                    Params={
                                        'Bucket': s3_bucket,
                                        'Key': s3_key
                                    },
                                    ExpiresIn=604800  # 7 days
                                )
                                logger.info(f"Generated presigned URL for {s3_key}")
                            except Exception as s3_error:
                                logger.warning(f"Error accessing S3 object {s3_key}: {str(s3_error)}")
                                # Fall back to using stored URL if available
                                presigned_url = item.get('ResourceUrl')
                                if presigned_url:
                                    logger.info(f"Using stored ResourceUrl for {s3_key}")
                        else:
                            # No S3Path, try to use stored URL
                            presigned_url = item.get('ResourceUrl')
                            if presigned_url:
                                logger.info(f"Using stored ResourceUrl (no S3Path)")
                        
                        # Extract metadata from the resource item using our helper function
                        metadata = {}
                        geo_location = {}
                        
                        # Check if Metadata field exists directly in the item
                        if 'Metadata' in item:
                            metadata = extract_nested_value(item['Metadata'])
                            logger.info(f"Extracted metadata: {json.dumps(metadata, cls=DecimalEncoder)}")
                        
                        # Extract geolocation data from metadata if available
                        if metadata and 'geolocation' in metadata:
                            geo_location = metadata['geolocation']
                            logger.info(f"Found geolocation in metadata: {json.dumps(geo_location, cls=DecimalEncoder)}")
                        
                        # Check for direct geolocation field
                        elif 'Geolocation' in item:
                            geo_location = extract_nested_value(item['Geolocation'])
                            logger.info(f"Found direct Geolocation field: {json.dumps(geo_location, cls=DecimalEncoder)}")
                        elif 'geolocation' in item:
                            geo_location = extract_nested_value(item['geolocation'])
                            logger.info(f"Found direct geolocation field: {json.dumps(geo_location, cls=DecimalEncoder)}")
                        
                        # Format geolocation structure if necessary
                        if geo_location:
                            # Ensure numeric values
                            if 'latitude' in geo_location and geo_location['latitude'] is not None:
                                geo_location['latitude'] = parse_numeric_value(geo_location['latitude'])
                            if 'longitude' in geo_location and geo_location['longitude'] is not None:
                                geo_location['longitude'] = parse_numeric_value(geo_location['longitude'])
                            if 'altitude' in geo_location:
                                geo_location['altitude'] = parse_numeric_value(geo_location['altitude'])
                            if 'heading' in geo_location:
                                geo_location['heading'] = parse_numeric_value(geo_location['heading'])
                            if 'direction' in geo_location:
                                geo_location['heading'] = parse_numeric_value(geo_location['direction'])
                                
                            logger.info(f"Formatted geolocation data: {json.dumps(geo_location, cls=DecimalEncoder)}")
                        
                        # Add this resource to our response if we have a URL
                        if presigned_url:
                            image_item = {
                                'name': item.get('FileName', 'Unknown'),
                                'url': presigned_url,
                                'presignedUrl': presigned_url,  # Add specific presignedUrl field for frontend
                                'type': item.get('ContentType', 'image/jpeg'),
                                'resourceId': item.get('ResourceId', ''),
                                'uploadDate': item.get('CreatedAt', ''),
                                'FileName': item.get('FileName', 'Unknown'),  # Duplicate with original casing for consistency
                                'ResourceId': item.get('ResourceId', ''),     # Duplicate with original casing
                                'ContentType': item.get('ContentType', 'image/jpeg'),  # Duplicate with original casing
                                'S3Path': s3_key,
                                'CreatedAt': item.get('CreatedAt', '')
                            }
                            
                            # Add both metadata and direct geolocation
                            if metadata:
                                image_item['metadata'] = metadata
                            
                            # Always add geolocation at the top level for direct access by frontend
                            if geo_location:
                                image_item['geolocation'] = geo_location
                                logger.info(f"Added geolocation to image item: {json.dumps(geo_location, cls=DecimalEncoder)}")
                            
                            images.append(image_item)
                        else:
                            logger.warning(f"Could not generate URL for resource {item.get('ResourceId')}")
                    except Exception as item_error:
                        logger.error(f"Error processing resource item: {str(item_error)}")
                        logger.error(f"Resource data: {json.dumps(item, cls=DecimalEncoder)}")
            else:
                logger.info("No resources found in Resources table")
                
            # Rest of the function remains the same
            # ...existing code...
        except Exception as resources_error:
            logger.warning(f"Error querying Resources table: {str(resources_error)}")
        
        logger.info(f"Total resources found for booking {booking_id}: {len(images)}")
        return images
    
    except Exception as e:
        logger.error(f"Error fetching booking images: {str(e)}")
        return []

# Helper function to parse numeric values from strings or other formats
def parse_numeric_value(value):
    """Parse a numeric value from various formats."""
    if value is None:
        return None
    
    if isinstance(value, (int, float, decimal.Decimal)):
        return value
    
    if isinstance(value, dict) and 'N' in value:
        try:
            return float(value['N'])
        except (ValueError, TypeError):
            return None
    
    if isinstance(value, str):
        try:
            return float(value)
        except (ValueError, TypeError):
            return value
    
    return value

def fetch_geotiff_data(booking_id):
    """Fetch GeoTIFF data for a booking - prioritizing reassembled files from GeoTiffChunks table."""
    logger.info(f"Fetching GeoTIFF data for booking: {booking_id}")
    try:
        # First check the GeoTiffChunks table for completed reassembled files
        chunks_table = dynamodb.Table('GeoTiffChunks')
        
        # Query for completed reassembled chunks with a _manifest chunk ID pattern
        try:
            logger.info("Checking GeoTiffChunks table for completed reassemblies...")
            
            # Use scan with filter for completed status and matching booking ID
            response = chunks_table.scan(
                FilterExpression=Attr('bookingId').eq(booking_id) & 
                                 Attr('status').eq('completed') &
                                 Attr('chunkId').contains('_manifest')
            )
            
            chunks_items = response.get('Items', [])
            
            logger.info(f"[DEBUG] GeoTiffChunks scan result: found {len(chunks_items)} items matching the criteria")
            
            if chunks_items:
                logger.info(f"Found {len(chunks_items)} completed reassemblies in GeoTiffChunks table")
                
                # Display the found items for troubleshooting
                for idx, item in enumerate(chunks_items):
                    logger.info(f"[DEBUG] Reassembly {idx+1}:")
                    logger.info(f"  - chunkId: {item.get('chunkId', 'N/A')}")
                    logger.info(f"  - sessionId: {item.get('sessionId', 'N/A')}")
                    logger.info(f"  - completedAt: {item.get('completedAt', 'N/A')}")
                    logger.info(f"  - finalResourceId: {item.get('finalResourceId', 'N/A')}")
                    logger.info(f"  - Has reassembledUrl: {'Yes' if 'reassembledUrl' in item else 'No'}")
                    
                    # Check URL structure and length to identify potential issues
                    if 'reassembledUrl' in item:
                        url_length = len(item['reassembledUrl'])
                        url_preview = item['reassembledUrl'][:50] + '...' if url_length > 50 else item['reassembledUrl']
                        logger.info(f"  - reassembledUrl length: {url_length}, preview: {url_preview}")
                
                # Sort by completion time (newest first) if available
                sorted_items = sorted(
                    chunks_items,
                    key=lambda x: x.get('completedAt', 0),
                    reverse=True
                )
                
                # Take the most recent completed reassembly
                reassembled_item = sorted_items[0]
                
                # Check for required fields
                if reassembled_item.get('reassembledUrl'):
                    logger.info(f"Using reassembled GeoTIFF with resource ID: {reassembled_item.get('finalResourceId', 'unknown')}")
                    
                    # Try to get the S3 key for the reassembled file
                    s3_key = None
                    reassembled_url = reassembled_item['reassembledUrl']
                    
                    if 'reassembledUrl' in reassembled_item:
                        # Extract S3 key from URL by looking for booking_id in the URL
                        logger.info(f"[DEBUG] Extracting S3 key from reassembledUrl: {reassembled_url[:50]}...")
                        
                        # Parse URL to extract key - handle both URL formats
                        if 'amazonaws.com/' in reassembled_url:
                            try:
                                url_parts = reassembled_url.split('amazonaws.com/')
                                if len(url_parts) > 1:
                                    path = url_parts[1].split('?')[0]  # Remove query params
                                    s3_key = path
                                    logger.info(f"[DEBUG] Extracted S3 key from URL: {s3_key}")
                            except Exception as e:
                                logger.warning(f"[DEBUG] Failed to extract S3 key from URL: {e}")
                        
                        # If key extraction failed, try regex approach
                        if not s3_key:
                            try:
                                import re
                                # Look for patterns like booking_{id}/reassembled_geotiff_{timestamp}_{uuid}_filename.tif
                                # or just any path after the domain
                                matches = re.search(r'amazonaws\.com/([^?]+)', reassembled_url)
                                if matches:
                                    s3_key = matches.group(1)
                                    logger.info(f"[DEBUG] Extracted S3 key using regex: {s3_key}")
                            except Exception as e:
                                logger.warning(f"[DEBUG] Failed to extract S3 key using regex: {e}")
                        
                        # Final fallback - save the URL as is
                        if not s3_key:
                            logger.warning("[DEBUG] Could not extract S3 key, using full URL")
                            s3_key = f"{booking_id}/reassembled_geotiff_unknown.tif"
                    
                    # Extract the original filename if available
                    filename = reassembled_item.get('originalFileName', 'Reassembled GeoTIFF')
                    if not filename:
                        # Try to extract from S3 key or URL
                        if s3_key:
                            try:
                                # Extract the filename part from the S3 key (after the last slash)
                                filename = s3_key.split('/')[-1]
                                logger.info(f"[DEBUG] Extracted filename from S3 key: {filename}")
                            except:
                                filename = "reassembled_geotiff.tif"
                        elif 'reassembledUrl' in reassembled_item:
                            try:
                                # Extract filename from URL
                                url_path = reassembled_url.split('?')[0]
                                filename = url_path.split('/')[-1]
                                logger.info(f"[DEBUG] Extracted filename from URL: {filename}")
                            except:
                                filename = "reassembled_geotiff.tif"
                    
                    # Check if this GeoTIFF actually exists in S3
                    try:
                        if s3_key:
                            s3_client.head_object(Bucket=s3_bucket, Key=s3_key)
                            logger.info(f"[DEBUG] Verified GeoTIFF exists in S3: {s3_key}")
                    except Exception as s3_check_error:
                        logger.warning(f"[DEBUG] Could not verify GeoTIFF in S3: {str(s3_check_error)}")
                    
                    # Build the response with all available information
                    geotiff_data = {
                        'filename': filename,
                        'url': reassembled_item['reassembledUrl'],
                        'presignedUrl': reassembled_item['reassembledUrl'],
                        'key': s3_key or '',
                        'uploadDate': reassembled_item.get('completedAt', ''),
                        'resourceId': reassembled_item.get('finalResourceId', ''),
                        'isReassembled': True,
                        'sessionId': reassembled_item.get('sessionId', '')
                    }
                    
                    logger.info(f"[DEBUG] Returning GeoTIFF data: {json.dumps(geotiff_data, cls=DecimalEncoder)}")
                    return geotiff_data
                else:
                    logger.warning(f"[DEBUG] Found completed reassembly but missing reassembledUrl field")
            
            logger.info("No completed reassemblies found in GeoTiffChunks table, checking Resources table...")
        except Exception as chunks_error:
            logger.warning(f"Error querying GeoTiffChunks table: {str(chunks_error)}")
        
        # If no reassembled GeoTIFF found, check Resources table for GeoTIFF files
        logger.info("[DEBUG] Searching Resources table for GeoTIFF files...")
        resources_response = resources_table.scan(
            FilterExpression=Attr('BookingId').eq(booking_id) & 
                           ((Attr('ContentType').begins_with('image/tiff') | 
                             Attr('ContentType').begins_with('image/geotiff')) |
                            (Attr('FileName').contains('.tif') | 
                             Attr('FileName').contains('.tiff')))
        )
        resources_items = resources_response.get('Items', [])
        
        if resources_items:
            logger.info(f"Found GeoTIFF in Resources table for booking {booking_id}")
            logger.info(f"[DEBUG] Resources table returned {len(resources_items)} GeoTIFF files")
            
            # Log information about each GeoTIFF file found
            for idx, item in enumerate(resources_items):
                logger.info(f"[DEBUG] GeoTIFF {idx+1} from Resources:")
                logger.info(f"  - ResourceId: {item.get('ResourceId', 'N/A')}")
                logger.info(f"  - FileName: {item.get('FileName', 'N/A')}")
                logger.info(f"  - ContentType: {item.get('ContentType', 'N/A')}")
                logger.info(f"  - S3Path: {item.get('S3Path', 'N/A')}")
                logger.info(f"  - CreatedAt: {item.get('CreatedAt', 'N/A')}")
            
            # Sort by upload date to get the most recent
            sorted_items = sorted(resources_items, 
                                 key=lambda x: x.get('CreatedAt', ''), 
                                 reverse=True)
            geotiff = sorted_items[0]
            
            # Generate a fresh presigned URL with extended expiration
            if geotiff.get('S3Path'):
                try:
                    # Generate both presigned and direct URLs for maximum compatibility
                    s3_key = geotiff.get('S3Path')
                    
                    # Ensure the key is properly formatted
                    if not s3_key.startswith(booking_id):
                        s3_key = f"{booking_id}/{s3_key}"
                        logger.info(f"[DEBUG] Reformatted S3 key to: {s3_key}")
                    
                    # Check if the file exists in S3
                    try:
                        s3_client.head_object(Bucket=s3_bucket, Key=s3_key)
                        logger.info(f"[DEBUG] Verified GeoTIFF exists in S3: {s3_key}")
                    except Exception as s3_check_error:
                        logger.warning(f"[DEBUG] Could not verify GeoTIFF in S3: {str(s3_check_error)}")
                    
                    # Presigned URL with extended expiration (14 days)
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': s3_bucket,
                            'Key': s3_key
                        },
                        ExpiresIn=1209600  # 14 days (same as used in successful requests)
                    )
                    
                    # Generate direct S3 URL as backup
                    direct_url = f"https://{s3_bucket}.s3.eu-north-1.amazonaws.com/{s3_key}"
                    
                    logger.info(f"[DEBUG] Generated presigned URL: {presigned_url[:50]}...")
                    logger.info(f"[DEBUG] Generated direct URL: {direct_url}")
                    
                    geotiff_data = {
                        'filename': geotiff.get('FileName'),
                        'url': presigned_url,
                        'presignedUrl': presigned_url,
                        'directUrl': direct_url,
                        'key': s3_key,
                        'uploadDate': geotiff.get('CreatedAt'),
                        'resourceId': geotiff.get('ResourceId'),
                        'source': 'resources_table'
                    }
                    
                    logger.info(f"[DEBUG] Returning GeoTIFF data from Resources: {json.dumps(geotiff_data, cls=DecimalEncoder)}")
                    return geotiff_data
                except Exception as e:
                    logger.warning(f"Error generating presigned URL for GeoTIFF: {str(e)}")
                    # Fall back to the stored ResourceUrl if available
                    if geotiff.get('ResourceUrl'):
                        logger.info(f"[DEBUG] Falling back to stored ResourceUrl")
                        return {
                            'filename': geotiff.get('FileName'),
                            'url': geotiff.get('ResourceUrl'),
                            'presignedUrl': geotiff.get('ResourceUrl'),
                            'key': geotiff.get('S3Path'),
                            'uploadDate': geotiff.get('CreatedAt'),
                            'resourceId': geotiff.get('ResourceId'),
                            'source': 'resources_table_fallback'
                        }
        else:
            logger.info("[DEBUG] No GeoTIFF files found in Resources table")
        
        # As fallback, look directly in the S3 bucket for GeoTIFF files
        try:
            logger.info(f"[DEBUG] Looking for GeoTIFF directly in S3 bucket for booking {booking_id}")
            
            # List objects in the booking prefix
            prefix = f"{booking_id}/"
            s3_response = s3_client.list_objects_v2(
                Bucket=s3_bucket,
                Prefix=prefix
            )
            
            if 'Contents' in s3_response:
                # Log all objects found in the bucket
                all_objects = s3_response['Contents']
                logger.info(f"[DEBUG] Found {len(all_objects)} objects in S3 bucket with prefix {prefix}")
                
                # Log a sample of objects for debugging
                for idx, obj in enumerate(all_objects[:5]):  # Log first 5 objects
                    logger.info(f"[DEBUG] S3 object {idx+1}: {obj.get('Key', 'Unknown')}, Size: {obj.get('Size', 0)}")
                
                if len(all_objects) > 5:
                    logger.info(f"[DEBUG] ...and {len(all_objects) - 5} more objects")
                
                # First look for reassembled GeoTIFF files
                geotiff_objects = [obj for obj in all_objects 
                                if (obj['Key'].lower().endswith(('.tif', '.tiff')) or 
                                   obj['Key'].lower().endswith('.tif')) and
                                   'reassembled' in obj['Key'].lower()]
                
                logger.info(f"[DEBUG] Found {len(geotiff_objects)} reassembled GeoTIFF objects in S3")
                
                # Log the found GeoTIFF files
                for idx, obj in enumerate(geotiff_objects):
                    logger.info(f"[DEBUG] Reassembled GeoTIFF {idx+1}: {obj.get('Key', 'Unknown')}")
                
                # If no reassembled files, look for any .tif files (not chunks)
                if not geotiff_objects:
                    geotiff_objects = [obj for obj in all_objects 
                                     if (obj['Key'].lower().endswith(('.tif', '.tiff')) or
                                        obj['Key'].lower().endswith('.tif')) and
                                        '.part' not in obj['Key'].lower()]
                    
                    logger.info(f"[DEBUG] Found {len(geotiff_objects)} non-reassembled GeoTIFF objects in S3")
                
                # If still no files, check for part files that might need reassembly
                if not geotiff_objects:
                    part_objects = [obj for obj in all_objects 
                                  if '.part' in obj['Key'].lower()]
                    
                    if part_objects:
                        logger.info(f"[DEBUG] Found {len(part_objects)} part files that need reassembly")
                        
                        # Return information about the part files so frontend can initiate reassembly
                        part_object = part_objects[0]  # Take the first part file
                        s3_key = part_object['Key']
                        
                        # Extract the base filename (before .part0)
                        import re
                        base_match = re.search(r'(.+)\.part\d+$', s3_key)
                        base_name = base_match.group(1) if base_match else s3_key
                        
                        # Generate a fake reassembled name for display
                        reassembled_name = f"{base_name}_reassembled.tif"
                        
                        # Return info about parts
                        return {
                            'filename': reassembled_name,
                            'key': s3_key,  # Just return the key of the first part
                            'uploadDate': int(part_object['LastModified'].timestamp()),
                            'requiresReassembly': True,
                            'parts': len(part_objects),
                            'partFiles': [obj['Key'] for obj in part_objects[:5]],  # Just show first 5
                            'source': 'direct_s3_parts'
                        }
                
                # Process found GeoTIFF files if any
                if geotiff_objects:
                    # Sort by last modified date, newest first
                    sorted_objects = sorted(geotiff_objects, 
                                          key=lambda x: x['LastModified'], 
                                          reverse=True)
                    
                    geotiff_obj = sorted_objects[0]
                    s3_key = geotiff_obj['Key']
                    
                    logger.info(f"[DEBUG] Selected newest GeoTIFF: {s3_key}, Last modified: {geotiff_obj['LastModified']}")
                    
                    # Generate presigned URL with longer expiration
                    presigned_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': s3_bucket,
                            'Key': s3_key
                        },
                        ExpiresIn=1209600  # 14 days
                    )
                    
                    # Extract filename from key
                    filename = s3_key.split('/')[-1]
                    
                    # Determine if this is a reassembled file
                    is_reassembled = 'reassembled' in s3_key.lower()
                    
                    geotiff_data = {
                        'filename': filename,
                        'url': presigned_url,
                        'presignedUrl': presigned_url,
                        'key': s3_key,
                        'uploadDate': int(geotiff_obj['LastModified'].timestamp()),
                        'resourceId': f"s3-{s3_key.replace('/', '-')}",
                        'isReassembled': is_reassembled,
                        'source': 'direct_s3'
                    }
                    
                    logger.info(f"[DEBUG] Returning GeoTIFF data from direct S3: {json.dumps(geotiff_data, cls=DecimalEncoder)}")
                    return geotiff_data
            else:
                logger.info(f"[DEBUG] No objects found in S3 with prefix {prefix}")
            
        except Exception as s3_error:
            logger.warning(f"Error checking S3 for GeoTIFF files: {str(s3_error)}")
        
        # Final fallback to GeoTiffUploads table
        try:
            logger.info(f"[DEBUG] Checking GeoTiffUploads table as final fallback")
            
            params = {
                'TableName': 'GeoTiffUploads',
                'FilterExpression': 'BookingId = :bookingId',
                'ExpressionAttributeValues': {
                    ':bookingId': booking_id
                }
            }
            
            response = dynamodb.scan(**params)
            items = response.get('Items', [])
            
            logger.info(f"[DEBUG] GeoTiffUploads table has {len(items)} entries for this booking")
            
            if items:
                # Log information about each item found
                for idx, item in enumerate(items):
                    logger.info(f"[DEBUG] GeoTiffUpload {idx+1}:")
                    logger.info(f"  - filename: {item.get('filename', 'N/A')}")
                    logger.info(f"  - s3Key: {item.get('s3Key', 'N/A')}")
                    logger.info(f"  - uploadDate: {item.get('uploadDate', 'N/A')}")
                
                # Sort by upload date and get the most recent one
                sorted_items = sorted(items, key=lambda x: x.get('uploadDate', ''), reverse=True)
                geotiff = sorted_items[0]
                
                # Generate both presigned and direct URLs for the GeoTIFF
                if geotiff.get('s3Key'):
                    try:
                        s3_key = geotiff.get('s3Key')
                        
                        # Check if file exists in S3
                        try:
                            s3_client.head_object(Bucket=s3_bucket, Key=s3_key)
                            logger.info(f"[DEBUG] Verified GeoTIFF exists in S3: {s3_key}")
                        except Exception as s3_check_error:
                            logger.warning(f"[DEBUG] Could not verify GeoTIFF in S3: {str(s3_check_error)}")
                        
                        # Presigned URL with extended expiration (14 days)
                        presigned_url = s3_client.generate_presigned_url(
                            'get_object',
                            Params={
                                'Bucket': s3_bucket,
                                'Key': s3_key
                            },
                            ExpiresIn=1209600                        )
                        
                        # Generate direct S3 URL as backup
                        direct_url = f"https://{s3_bucket}.s3.eu-north-1.amazonaws.com/{s3_key}"
                        
                        logger.info(f"[DEBUG] Generated presigned URL: {presigned_url[:50]}...")
                        
                        geotiff_data = {
                            'filename': geotiff.get('filename', s3_key.split('/')[-1]),
                            'url': presigned_url,
                            'presignedUrl': presigned_url,
                            'directUrl': direct_url,
                            'key': s3_key,
                            'uploadDate': geotiff.get('uploadDate', ''),
                            'source': 'geotiff_uploads_table'
                        }
                        
                        logger.info(f"[DEBUG] Returning GeoTIFF data from GeoTiffUploads: {json.dumps(geotiff_data, cls=DecimalEncoder)}")
                        return geotiff_data
                    except Exception as e:
                        logger.warning(f"Error generating presigned URL from GeoTiffUploads: {str(e)}")
            else:
                logger.info(f"[DEBUG] No entries found in GeoTiffUploads table")
        except Exception as uploads_error:
            logger.warning(f"Error checking GeoTiffUploads table: {str(uploads_error)}")
        
        logger.info("No GeoTIFF files found for this booking after checking all data sources")
        return None
    
    except Exception as e:
        logger.error(f"Error fetching GeoTIFF data: {str(e)}")
        return None
