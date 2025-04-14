import json
import boto3
import os
import logging
import uuid
import time
from datetime import datetime
from decimal import Decimal
import base64
from botocore.exceptions import ClientError
import mimetypes
import io
from PIL import Image  # For image processing
import piexif  # For EXIF data extraction

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
S3_BUCKET = os.environ.get('S3_BUCKET_NAME', 'pilotforce-resources')
RESOURCES_TABLE = os.environ.get('RESOURCES_TABLE', 'Resources')
BOOKINGS_TABLE = os.environ.get('BOOKINGS_TABLE', 'Bookings')

# Initialize AWS clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
resources_table = dynamodb.Table(RESOURCES_TABLE)
bookings_table = dynamodb.Table(BOOKINGS_TABLE)

# Custom JSON encoder to handle datetime and Decimal types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super(CustomJSONEncoder, self).default(obj)

def generate_response(status_code, body, headers=None):
    """Generate a standardized API response"""
    if headers is None:
        headers = {}
    
    # Add CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
        'Content-Type': 'application/json'
    }
    
    # Merge provided headers with CORS headers
    headers = {**cors_headers, **headers}
    
    # Ensure the body is JSON serializable with custom encoder
    try:
        body_str = json.dumps(body, cls=CustomJSONEncoder)
    except TypeError as e:
        logger.error(f"Error serializing response body: {str(e)}")
        logger.error(f"Problematic body: {body}")
        body_str = json.dumps({"error": "Error serializing response", "message": str(e)})
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': body_str
    }

def get_booking(booking_id):
    """Get a booking by ID"""
    try:
        response = bookings_table.get_item(Key={'BookingId': booking_id})
        if 'Item' in response:
            return response['Item']
        return None
    except Exception as e:
        logger.error(f"Error getting booking {booking_id}: {str(e)}")
        return None

def get_resources_for_booking(booking_id):
    """Get resources for a booking"""
    try:
        response = resources_table.query(
            IndexName='BookingIdIndex',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('BookingId').eq(booking_id)
        )
        return response.get('Items', [])
    except Exception as e:
        logger.error(f"Error querying resources for booking {booking_id}: {str(e)}")
        return []

def create_folder(booking_id, folder_name):
    """Create a new folder resource for a booking"""
    try:
        timestamp = datetime.now().isoformat()
        folder_id = f"folder_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        s3_path = f"{booking_id}/{folder_id}/"
        
        # Create "folder" in S3 (actually just a zero-byte object with a trailing slash)
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_path,
            Body=''
        )
        
        # Add folder record to DynamoDB
        folder_item = {
            'ResourceId': folder_id,
            'BookingId': booking_id,
            'Type': 'folder',
            'FolderName': folder_name,
            'S3Path': s3_path,
            'CreatedAt': timestamp,
            'UpdatedAt': timestamp
        }
        
        resources_table.put_item(Item=folder_item)
        
        return {
            'success': True,
            'message': 'Folder created successfully',
            'folderId': folder_id,
            'folderName': folder_name,
            's3Path': s3_path
        }
    except Exception as e:
        logger.error(f"Error creating folder: {str(e)}")
        return {
            'success': False,
            'message': f'Error creating folder: {str(e)}'
        }

def upload_file(booking_id, file_data, content_type, file_name):
    """
    Upload a file to S3 and create a resource record
    Automatically creates a folder structure with the bookingId
    """
    try:
        logger.info(f"Starting file upload for booking {booking_id}")
        logger.info(f"File name: {file_name}, Content type: {content_type}")
        
        # Decode base64 file content if needed
        try:
            # Check if the file_data is a base64 string
            if isinstance(file_data, str):
                try:
                    file_content = base64.b64decode(file_data)
                    logger.info("Successfully decoded base64 string")
                except Exception as e:
                    logger.error(f"Error decoding base64: {str(e)}")
                    file_content = file_data.encode('utf-8')
            else:
                # If it's already binary data
                file_content = file_data
                logger.info("Using raw binary file data")
        except Exception as e:
            logger.error(f"Error processing file data: {str(e)}")
            file_content = file_data
            
        timestamp = datetime.now().isoformat()
        resource_id = f"file_{int(time.time() * 1000)}_{str(uuid.uuid4())[:8]}"
        
        # Sanitize file name
        safe_file_name = ''.join([c for c in file_name if c.isalnum() or c in '._- '])
        
        # Create a folder structure with bookingId
        s3_key = f"{booking_id}/{safe_file_name}"
        logger.info(f"S3 key: {s3_key}")
        
        # Try to determine content type if not provided
        if not content_type or content_type == 'application/octet-stream':
            content_type, _ = mimetypes.guess_type(file_name)
            if not content_type:
                # Default to binary if can't determine
                content_type = 'application/octet-stream'
        
        # Check the content length before uploading
        file_size = len(file_content)
        logger.info(f"File size: {file_size} bytes")
        
        if file_size == 0:
            logger.error("File content is empty")
            return {
                'success': False,
                'message': 'File content is empty'
            }
        
        # Upload to S3
        try:
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=s3_key,
                Body=file_content,
                ContentType=content_type
            )
            logger.info(f"Successfully uploaded to S3: {S3_BUCKET}/{s3_key}")
        except Exception as e:
            logger.error(f"S3 upload error: {str(e)}")
            return {
                'success': False,
                'message': f'S3 upload error: {str(e)}'
            }
        
        # Determine if this is an image for thumbnail generation
        is_image = content_type and content_type.startswith('image/')
        
        # Extract metadata if the file is an image
        metadata = extract_image_metadata(file_content, safe_file_name, content_type) if is_image else None
        
        # Format metadata for DynamoDB - convert values to DynamoDB format
        formatted_metadata = None
        geolocation = {}
        
        if metadata and isinstance(metadata, dict):
            logger.info(f"Processing extracted metadata: {metadata}")
            formatted_metadata = {}
            
            # Format location data for DynamoDB
            if 'latitude' in metadata and 'longitude' in metadata:
                geolocation = {
                    'latitude': {'N': str(metadata['latitude'])},
                    'longitude': {'N': str(metadata['longitude'])}
                }
                
                # Add direction if available
                if 'direction' in metadata:
                    geolocation['heading'] = {'N': str(metadata['direction'])}
                
                # Add altitude if available
                if 'altitude' in metadata:
                    geolocation['altitude'] = {'N': str(metadata['altitude'])}
                
                logger.info(f"Formatted geolocation data for DynamoDB: {geolocation}")
            
            # Store all other metadata as well
            for key, value in metadata.items():
                if isinstance(value, (int, float)):
                    formatted_metadata[key] = {'N': str(value)}
                elif isinstance(value, str):
                    formatted_metadata[key] = {'S': value}
                elif isinstance(value, bool):
                    formatted_metadata[key] = {'BOOL': value}
        
        # Create record in DynamoDB
        resource_item = {
            'ResourceId': resource_id,
            'BookingId': booking_id,
            'Type': 'file',
            'FileName': safe_file_name,
            'S3Path': s3_key,
            'ContentType': content_type,
            'Size': file_size,
            'IsImage': is_image,
            'CreatedAt': timestamp,
            'UpdatedAt': timestamp
        }
        
        # Add geolocation data if available
        if geolocation and len(geolocation) > 0:
            logger.info("Adding geolocation data to resource record")
            resource_item['geolocation'] = geolocation
        
        # Add formatted metadata if available
        if formatted_metadata and len(formatted_metadata) > 0:
            logger.info("Adding extended metadata to resource record")
            resource_item['metadata'] = formatted_metadata
        
        # Generate a pre-signed URL for access
        try:
            resource_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': s3_key},
                ExpiresIn=3600  # URL expires in 1 hour
            )
            resource_item['ResourceUrl'] = resource_url
            logger.info(f"Generated presigned URL: {resource_url[:50]}...")
        except Exception as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
        
        # Store in DynamoDB
        try:
            resources_table.put_item(Item=resource_item)
            logger.info(f"Resource record created in DynamoDB: {resource_id}")
        except Exception as e:
            logger.error(f"DynamoDB error: {str(e)}")
            return {
                'success': False,
                'message': f'DynamoDB error: {str(e)}'
            }
        
        # Include metadata in the response for debugging
        response = {
            'success': True,
            'message': 'File uploaded successfully',
            'resourceId': resource_id,
            'fileName': safe_file_name,
            's3Path': s3_key,
            'resourceUrl': resource_item.get('ResourceUrl', '')
        }
        
        # Include metadata summary in response if available
        if geolocation and len(geolocation) > 0:
            metadata_summary = {}
            if 'latitude' in geolocation and 'longitude' in geolocation:
                metadata_summary['hasCoordinates'] = True
            if 'heading' in geolocation:
                metadata_summary['hasDirection'] = True
                metadata_summary['direction'] = float(geolocation['heading']['N'])
            
            response['metadataSummary'] = metadata_summary
        
        return response
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return {
            'success': False,
            'message': f'Error uploading file: {str(e)}'
        }

def delete_resource(booking_id, resource_id):
    """Delete a resource (file or folder)"""
    try:
        # Get the resource to know what to delete from S3
        response = resources_table.get_item(Key={'ResourceId': resource_id})
        if 'Item' not in response:
            return {
                'success': False,
                'message': 'Resource not found'
            }
            
        resource = response['Item']
        
        # Check if this resource belongs to the specified booking
        if resource.get('BookingId') != booking_id:
            return {
                'success': False,
                'message': 'Resource does not belong to the specified booking'
            }
            
        # Delete from S3
        s3_path = resource.get('S3Path', '')
        if s3_path:
            if resource.get('Type') == 'folder':
                # For folders, delete all objects with this prefix
                paginator = s3.get_paginator('list_objects_v2')
                for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=s3_path):
                    if 'Contents' in page:
                        objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]
                        s3.delete_objects(
                            Bucket=S3_BUCKET,
                            Delete={'Objects': objects_to_delete}
                        )
            else:
                # For single files
                s3.delete_object(
                    Bucket=S3_BUCKET,
                    Key=s3_path
                )
                
        # Delete from DynamoDB
        resources_table.delete_item(Key={'ResourceId': resource_id})
        
        return {
            'success': True,
            'message': 'Resource deleted successfully'
        }
    except Exception as e:
        logger.error(f"Error deleting resource: {str(e)}")
        return {
            'success': False,
            'message': f'Error deleting resource: {str(e)}'
        }

def extract_image_metadata(file_content, file_name, content_type):
    """
    Extract GPS coordinates, heading/direction, and other metadata from image EXIF data
    
    Args:
        file_content (bytes): Binary content of the image file
        file_name (str): Name of the image file
        content_type (str): MIME type of the file
        
    Returns:
        dict: Dictionary containing metadata or None if extraction fails
    """
    # Only process image files
    if not content_type.startswith('image/'):
        logger.info(f"Not an image file: {file_name} ({content_type})")
        return None
        
    metadata = {}
    
    try:
        # Create image from binary data
        img = Image.open(io.BytesIO(file_content))
        
        # Check if image has EXIF data
        if 'exif' in img.info:
            exif_dict = piexif.load(img.info['exif'])
            logger.info(f"Found EXIF data in {file_name}")
            
            # Extract GPS info
            if "GPS" in exif_dict and exif_dict["GPS"]:
                gps_data = exif_dict["GPS"]
                
                # Extract latitude
                if piexif.GPSIFD.GPSLatitude in gps_data and piexif.GPSIFD.GPSLatitudeRef in gps_data:
                    try:
                        lat_ref = gps_data[piexif.GPSIFD.GPSLatitudeRef].decode('ascii')
                        lat = _convert_to_degrees(gps_data[piexif.GPSIFD.GPSLatitude])
                        
                        # Convert to negative for Southern hemisphere
                        if lat_ref == 'S':
                            lat = -lat
                            
                        metadata['latitude'] = lat
                        logger.info(f"Extracted latitude: {lat}")
                    except Exception as e:
                        logger.error(f"Error extracting latitude from {file_name}: {str(e)}")
                
                # Extract longitude
                if piexif.GPSIFD.GPSLongitude in gps_data and piexif.GPSIFD.GPSLongitudeRef in gps_data:
                    try:
                        lng_ref = gps_data[piexif.GPSIFD.GPSLongitudeRef].decode('ascii')
                        lng = _convert_to_degrees(gps_data[piexif.GPSIFD.GPSLongitude])
                        
                        # Convert to negative for Western hemisphere
                        if lng_ref == 'W':
                            lng = -lng
                            
                        metadata['longitude'] = lng
                        logger.info(f"Extracted longitude: {lng}")
                    except Exception as e:
                        logger.error(f"Error extracting longitude from {file_name}: {str(e)}")
                
                # Extract direction/heading (GPSImgDirection)
                if piexif.GPSIFD.GPSImgDirection in gps_data:
                    try:
                        direction_rational = gps_data[piexif.GPSIFD.GPSImgDirection]
                        direction = float(direction_rational[0]) / float(direction_rational[1])
                        metadata['direction'] = direction
                        logger.info(f"Extracted direction: {direction}°")
                    except Exception as e:
                        logger.error(f"Error extracting direction from {file_name}: {str(e)}")
                
                # Extract altitude
                if piexif.GPSIFD.GPSAltitude in gps_data:
                    try:
                        altitude_rational = gps_data[piexif.GPSIFD.GPSAltitude]
                        altitude = float(altitude_rational[0]) / float(altitude_rational[1])
                        
                        # Check altitude reference (0 = above sea level, 1 = below sea level)
                        if piexif.GPSIFD.GPSAltitudeRef in gps_data:
                            altitude_ref = gps_data[piexif.GPSIFD.GPSAltitudeRef]
                            if altitude_ref == 1:
                                altitude = -altitude
                                
                        metadata['altitude'] = altitude
                        logger.info(f"Extracted altitude: {altitude}m")
                    except Exception as e:
                        logger.error(f"Error extracting altitude from {file_name}: {str(e)}")
            
            # Look for direction in DJI-specific XMP data
            # Some DJI drones store heading in Exif.Image.XPComment
            try:
                if 0x9286 in exif_dict.get("0th", {}):
                    xmp_comment = exif_dict["0th"][0x9286].decode('utf-8', errors='ignore')
                    if "drone-dji:GimbalYawDegree" in xmp_comment:
                        import re
                        match = re.search(r'drone-dji:GimbalYawDegree="([^"]+)"', xmp_comment)
                        if match:
                            direction = float(match.group(1))
                            metadata['direction'] = direction
                            logger.info(f"Extracted direction from XMP: {direction}°")
            except Exception as e:
                logger.error(f"Error extracting XMP direction from {file_name}: {str(e)}")
                
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata from {file_name}: {str(e)}")
        return None

def _convert_to_degrees(value):
    """
    Helper function to convert GPS coordinates from EXIF format to decimal degrees
    """
    degrees = float(value[0][0]) / float(value[0][1])
    minutes = float(value[1][0]) / float(value[1][1])
    seconds = float(value[2][0]) / float(value[2][1])
    
    return degrees + (minutes / 60.0) + (seconds / 3600.0)

def lambda_handler(event, context):
    """Main Lambda handler function"""
    logger.info(f"Received event: {json.dumps(event)}")
    logger.info(f"Request ID: {context.aws_request_id}")
    
    # Check the HTTP method and resource path
    method = event.get('httpMethod', '')
    path = event.get('path', '')
    logger.info(f"HTTP Method: {method}, Path: {path}")
    
    # Get path parameters
    path_parameters = event.get('pathParameters', {}) or {}
    logger.info(f"Path parameters: {path_parameters}")
    
    # CORS preflight
    if method == 'OPTIONS':
        return generate_response(200, {})

    try:
        # Handle GET /admin/bookings/{bookingId}/resources - List resources for a booking
        if method == 'GET' and '/admin/bookings/' in path and '/resources' in path:
            booking_id = path_parameters.get('bookingId')
            logger.info(f"Handling GET resources for booking {booking_id}")
            
            if not booking_id:
                return generate_response(400, {'message': 'Missing booking ID'})
                
            # Verify booking exists
            booking = get_booking(booking_id)
            logger.info(f"Found booking: {booking}")
            
            if not booking:
                return generate_response(404, {'message': 'Booking not found'})
                
            try:
                resources = get_resources_for_booking(booking_id)
                return generate_response(200, {'resources': resources})
            except Exception as e:
                logger.error(f"Error getting resources for booking {booking_id}: {str(e)}")
                return generate_response(500, {'message': f'Error getting resources: {str(e)}'})
        
        # Handle POST /admin/bookings/{bookingId}/folders - Create a folder
        elif method == 'POST' and '/admin/bookings/' in path and '/folders' in path:
            booking_id = path_parameters.get('bookingId')
            if not booking_id:
                return generate_response(400, {'message': 'Missing booking ID'})
                
            # Parse request body
            body = json.loads(event.get('body', '{}'))
            folder_name = body.get('folderName', '')
            
            if not folder_name:
                return generate_response(400, {'message': 'Missing folder name'})
                
            # Verify booking exists
            booking = get_booking(booking_id)
            if not booking:
                return generate_response(404, {'message': 'Booking not found'})
                
            result = create_folder(booking_id, folder_name)
            
            if result.get('success'):
                return generate_response(201, result)
            else:
                return generate_response(500, result)
        
        # Handle POST /admin/bookings/{bookingId}/resources - Upload a file
        elif method == 'POST' and '/admin/bookings/' in path and '/resources' in path:
            booking_id = path_parameters.get('bookingId')
            if not booking_id:
                return generate_response(400, {'message': 'Missing booking ID'})
            
            # Check if booking exists
            booking = get_booking(booking_id)
            if not booking:
                return generate_response(404, {'message': 'Booking not found'})
            
            try:
                # Check content type to determine how to handle the request
                content_type = event.get('headers', {}).get('content-type', '') or event.get('headers', {}).get('Content-Type', '')
                logger.info(f"Content-Type: {content_type}")
                
                # Handle multipart/form-data request (simplified to avoid cgi dependency)
                if 'multipart/form-data' in content_type:
                    # Since we can't rely on the cgi module in Lambda, we'll inform the client
                    # to use JSON with base64 encoded files instead
                    logger.error("Multipart form data parsing not supported in this Lambda environment")
                    return generate_response(400, {
                        'message': 'Please use JSON with base64 encoded files instead',
                        'details': 'Multipart form data parsing is not available on this Lambda environment'
                    })
                        
                # Handle JSON request with base64 encoded file
                else:
                    logger.info("Handling as JSON request")
                    body = json.loads(event.get('body', '{}'))
                    
                    # Log the request body keys (not the full content to avoid logging large files)
                    logger.info(f"Request body keys: {list(body.keys())}")
                    
                    # Check if file data is present
                    if 'file' not in body:
                        logger.error("File data is missing")
                        return generate_response(400, {'message': 'File data is required'})
                        
                    file_data = body.get('file', '')
                    file_name = body.get('fileName', 'unknown_file')
                    content_type = body.get('contentType', 'application/octet-stream')
                    
                    logger.info(f"JSON request with file: {file_name}")
                    logger.info(f"Content type: {content_type}")
                    
                    result = upload_file(booking_id, file_data, content_type, file_name)
                    
                    if result.get('success'):
                        return generate_response(201, result)
                    else:
                        return generate_response(500, result)
                        
            except Exception as e:
                logger.error(f"Error processing upload request: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                return generate_response(500, {'message': f'Server error: {str(e)}'})
        
        # Handle DELETE /admin/bookings/{bookingId}/resources/{resourceId}
        elif method == 'DELETE' and '/admin/bookings/' in path and '/resources/' in path:
            booking_id = path_parameters.get('bookingId')
            resource_id = path_parameters.get('resourceId')
            
            if not booking_id or not resource_id:
                return generate_response(400, {'message': 'Missing booking ID or resource ID'})
                
            result = delete_resource(booking_id, resource_id)
            
            if result.get('success'):
                return generate_response(200, result)
            else:
                return generate_response(404 if 'not found' in result.get('message', '') else 500, result)
        
        else:
            return generate_response(404, {'message': f'Unsupported method or path: {method} {path}'})
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return generate_response(500, {'message': f'Server error: {str(e)}'})

# Initialize AWS clients when the Lambda container starts
try:
    logger.info("Found credentials in environment variables.")
    s3 = boto3.client('s3')
    dynamodb = boto3.resource('dynamodb')
    resources_table = dynamodb.Table(RESOURCES_TABLE)
    bookings_table = dynamodb.Table(BOOKINGS_TABLE)
    logger.info("AWS clients initialized successfully")
    
    # Validate that resources exist and are accessible
    logger.info(f"Using S3 bucket: {S3_BUCKET}")
    logger.info(f"Using DynamoDB tables: Resources={RESOURCES_TABLE}, Bookings={BOOKINGS_TABLE}")
    
    # Check DynamoDB tables
    resources_table_desc = resources_table.table_status
    logger.info(f"Resources table status: {resources_table_desc}")
    
    bookings_table_desc = bookings_table.table_status
    logger.info(f"Bookings table status: {bookings_table_desc}")
    
    # Check if S3 bucket exists
    s3.head_bucket(Bucket=S3_BUCKET)
    logger.info(f"S3 bucket '{S3_BUCKET}' exists and is accessible")
    
except Exception as e:
    logger.error(f"Error initializing AWS clients: {str(e)}")
    # Don't re-raise, let Lambda continue and handle errors per-invocation