*CORS*
{
    "CORSRules": [
        {
            "AllowedHeaders": [
                "*"
            ],
            "AllowedMethods": [
                "GET",
                "POST",
                "HEAD"
            "AllowedOrigins": [
                "http://localhost:3000/*",
                "https://*.pilotforce.com"
            "ExposeHeaders": [
            ],
        }
}

*Bucket Policy*
{
    "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"AllowAccessFromPilotForceRole\",\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::229816860983:role/PilotForceLambdaRole\"},\"Action\":[\"s3:GetObject\",\"s3:PutObject\"],\"Resource\":\"arn:aws:s3:::pilotforce-resources/*\"}]}"
}

*Access Control List*
{
    "Owner": {
        "ID": "0456993003719f367ba895a626e79acc9bd0e58e276f5faa5b06f30a2d5087ec"
    },
    "Grants": [
        {
            "Grantee": {
                "ID": "0456993003719f367ba895a626e79acc9bd0e58e276f5faa5b06f30a2d5087ec",
                "Type": "CanonicalUser"
            },
            "Permission": "FULL_CONTROL"
        }
    ]
}

*Uploaded Files example in S3 bucket '/pilotforce-resources'*
This root folder is where all images and geotiffs are stored for user's bookings.

These are the files inside of the directory - /pilotforce-resources/booking_1744201462869_417/

Images (1 image uploaded so far):
DJI_0245.JPG
JPG
April 13, 2025, 14:11:45 (UTC+01:00)
3.3 MB
Standard

Chunked uploads of the GeoTiff file from the admin side:
test-GeoTiff_manifest.json
json
April 14, 2025, 11:24:09 (UTC+01:00)
747.0 B
Standard

test-GeoTiff.tif.part0
part0
April 14, 2025, 11:24:12 (UTC+01:00)
4.0 MB
Standard

test-GeoTiff.tif.part1
part1
April 14, 2025, 11:24:14 (UTC+01:00)
4.0 MB
Standard

test-GeoTiff.tif.part2
part2
April 14, 2025, 11:24:15 (UTC+01:00)
4.0 MB
Standard

test-GeoTiff.tif.part3
part3
April 14, 2025, 11:24:17 (UTC+01:00)
3.9 MB
Standard


Reassembled GeoTiff file made up of the chunked GeoTiff files (this file works in app.GeoTiff.io, meaning that the geotiff is back in its original state once it has been reassembled):

reassembled_geotiff_1744626257_db85f41f_test-GeoTiff.tif
tif
April 14, 2025, 11:24:20 (UTC+01:00)
15.9 MB
Standard



*DynamoDB Tables for these booking resources*

*Resources Table*
Resources.csv

*GeoTiffChunks Table*
GeoTiffChunks.csv

*API GATEWAY CONFIGURATION*
APIGatewayConfig.json


*Lambda Functions*
This function runs once the geotiff files have been chunked after being uploaded through the admin dashboard in order to reassemble the geotiff back to its original state

reassembleGeoTiffChunks.py

import json
import boto3
import os
import base64
import uuid
from typing import List, Dict, Any, Optional
import time
import logging
from urllib.parse import unquote_plus

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Configure environment variables
SOURCE_BUCKET = os.environ.get('SOURCE_BUCKET', 'pilotforce-resources')
CHUNKS_TABLE = os.environ.get('CHUNKS_TABLE', 'GeoTiffChunks')
RESOURCES_TABLE = os.environ.get('RESOURCES_TABLE', 'Resources')  # Add Resources table name

# Access the DynamoDB table for tracking chunks
chunks_table = dynamodb.Table(CHUNKS_TABLE)

def lambda_handler(event, context):
    """
    Lambda handler for reassembling chunked GeoTIFF files
    
    Triggers:
    1. From API Gateway direct request with bookingId and optional resourceId
    2. From S3 event when a manifest file is uploaded 
    3. From scheduled check to find complete chunk sets ready for assembly
    """
    logger.info("GeoTIFF Reassembly Lambda triggered")
    logger.info(f"Event: {json.dumps(event)}")
    
    try:
        # Check what triggered this lambda
        if 'body' in event:
            # API Gateway trigger - direct request
            return handle_api_request(event)
        
        elif 'Records' in event:
            # S3 trigger from manifest upload
            return handle_s3_trigger(event)
        
        elif 'detail' in event and 'scheduled' in event.get('detail-type', '').lower():
            # Scheduled event to check for completed chunk sets
            return handle_scheduled_check()
        
        else:
            # Unknown trigger
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid trigger event'})
            }
    
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Internal server error: {str(e)}'})
        }

def handle_api_request(event):
    """Handle direct API Gateway requests for reassembly"""
    # Parse the request body - support both string and dict formats
    body = {}
    if isinstance(event.get('body'), str):
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            logger.error(f"Failed to parse event body as JSON: {event.get('body')}")
            body = {}
    elif isinstance(event.get('body'), dict):
        body = event.get('body', {})
    else:
        # Try to use the whole event as the body
        body = event
    
    booking_id = body.get('bookingId')
    session_id = body.get('sessionId')
    manifest_key = body.get('manifestKey')
    final_resource_id = body.get('finalResourceId')
    base_file_name = body.get('baseFileName')
    resource_type = body.get('resourceType', 'geotiff')
    
    logger.info(f"Handling API request for reassembly - bookingId: {booking_id}, sessionId: {session_id}")
    logger.info(f"Request body: {json.dumps(body)}")
    
    if not booking_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'bookingId is required'})
        }
    
    # If session_id is provided, try to reassemble that specific session
    if session_id:
        # First check if there's a manifest key we can use
        if manifest_key:
            manifest = download_and_parse_manifest(SOURCE_BUCKET, manifest_key)
            if manifest:
                return {
                    'statusCode': 200,
                    'body': json.dumps(reassemble_chunks_from_manifest(SOURCE_BUCKET, booking_id, manifest))
                }
        
        # If no manifest or manifest download failed, try to reassemble based on session ID
        try:
            result = reassemble_chunks_by_session(booking_id, session_id, final_resource_id, base_file_name)
            return {
                'statusCode': 200,
                'body': json.dumps(result)
            }
        except Exception as e:
            logger.error(f"Error reassembling chunks for session {session_id}: {str(e)}")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': f'Failed to reassemble chunks: {str(e)}'})
            }
    else:
        # If no session ID provided, fall back to general reassembly
        result = reassemble_chunks(booking_id, final_resource_id, base_file_name)
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }

def handle_s3_trigger(event):
    """Handle S3 event when a manifest file is uploaded"""
    try:
        # Extract bucket and key from the S3 event
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        
        # Check if this is a manifest file
        if not key.endswith('_manifest.json'):
            logger.info(f"Not a manifest file, ignoring: {key}")
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Not a manifest file, ignoring'})
            }
        
        # Extract booking_id from the key path
        path_parts = key.split('/')
        if len(path_parts) < 2:
            logger.error(f"Invalid key path format: {key}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid key path format'})
            }
        
        booking_folder = path_parts[0]
        
        # Handle booking ID with or without booking_ prefix
        booking_id = booking_folder
        
        # Download and parse the manifest
        manifest = download_and_parse_manifest(bucket, key)
        if not manifest:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Manifest file not found or invalid'})
            }
        
        # Register the chunks from the manifest
        register_chunks_from_manifest(bucket, booking_id, manifest, key)
        
        # Check if all chunks are already available
        session_id = manifest.get('sessionId')
        if not session_id:
            logger.error("Manifest missing sessionId")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Manifest missing sessionId'})
            }
        
        # Try to reassemble immediately if all chunks are already uploaded
        all_chunks_available = check_chunks_availability(booking_id, session_id, manifest)
        
        if all_chunks_available:
            logger.info(f"All chunks available for {session_id}, proceeding with reassembly")
            result = reassemble_chunks_from_manifest(bucket, booking_id, manifest)
            return {
                'statusCode': 200,
                'body': json.dumps(result)
            }
        else:
            logger.info(f"Not all chunks available for {session_id}, waiting for more uploads")
            return {
                'statusCode': 202,
                'body': json.dumps({
                    'message': 'Manifest registered, waiting for all chunks',
                    'bookingId': booking_id,
                    'sessionId': session_id,
                    'requiredChunks': manifest.get('totalChunks', 0)
                })
            }
        
    except Exception as e:
        logger.error(f"Error handling S3 trigger: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Error handling S3 trigger: {str(e)}'})
        }

def handle_scheduled_check():
    """Check for complete chunk sets ready for reassembly"""
    try:
        # Get candidate sessions from DynamoDB that might be complete
        candidate_sessions = find_candidate_sessions()
        
        results = []
        for session in candidate_sessions:
            booking_id = session['bookingId']
            session_id = session['sessionId']
            manifest_key = session.get('manifestKey')
            
            if not manifest_key:
                logger.warning(f"Session {session_id} missing manifest key, trying to reassemble without manifest")
                try:
                    result = reassemble_chunks_by_session(booking_id, session_id)
                    results.append({
                        'sessionId': session_id,
                        'bookingId': booking_id,
                        'result': result
                    })
                    continue
                except Exception as e:
                    logger.warning(f"Failed to reassemble without manifest: {e}")
                    # Fall through to see if we can find a manifest
            
            # Get the manifest for this session if available
            manifest = None
            if manifest_key:
                manifest = download_and_parse_manifest(SOURCE_BUCKET, manifest_key)
            
            if not manifest:
                # Try to find manifest by listing objects in S3
                prefix = f"{booking_id}/{session_id}"
                try:
                    response = s3_client.list_objects_v2(
                        Bucket=SOURCE_BUCKET,
                        Prefix=prefix
                    )
                    
                    if 'Contents' in response:
                        # Look for manifest files
                        manifest_keys = [obj['Key'] for obj in response['Contents'] if obj['Key'].endswith('_manifest.json')]
                        
                        if manifest_keys:
                            manifest_key = sorted(manifest_keys, reverse=True)[0]
                            manifest = download_and_parse_manifest(SOURCE_BUCKET, manifest_key)
                except Exception as e:
                    logger.error(f"Error searching for manifest: {e}")
            
            # If we have a manifest, use it for reassembly
            if manifest:
                # Check if all chunks are available
                all_chunks_available = check_chunks_availability(booking_id, session_id, manifest)
                
                if all_chunks_available:
                    logger.info(f"All chunks available for {session_id}, proceeding with reassembly")
                    result = reassemble_chunks_from_manifest(SOURCE_BUCKET, booking_id, manifest)
                    results.append({
                        'sessionId': session_id,
                        'bookingId': booking_id,
                        'result': result
                    })
            else:
                # Try direct reassembly by session without manifest
                try:
                    result = reassemble_chunks_by_session(booking_id, session_id)
                    results.append({
                        'sessionId': session_id,
                        'bookingId': booking_id,
                        'result': result
                    })
                except Exception as e:
                    logger.error(f"Failed to reassemble session {session_id}: {e}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Checked {len(candidate_sessions)} candidate sessions',
                'reassembled': len(results),
                'results': results
            })
        }
    
    except Exception as e:
        logger.error(f"Error in scheduled check: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Error in scheduled check: {str(e)}'})
        }

def download_and_parse_manifest(bucket: str, key: str) -> Optional[Dict[str, Any]]:
    """Download and parse a manifest file from S3"""
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        manifest_content = response['Body'].read().decode('utf-8')
        return json.loads(manifest_content)
    except Exception as e:
        logger.error(f"Error downloading manifest {bucket}/{key}: {str(e)}")
        return None

def register_chunks_from_manifest(bucket: str, booking_id: str, manifest: Dict[str, Any], manifest_key: str):
    """Register chunks in DynamoDB based on manifest"""
    try:
        session_id = manifest.get('sessionId')
        if not session_id:
            logger.error("Manifest missing sessionId")
            return
        
        original_filename = manifest.get('originalFileName')
        if not original_filename:
            logger.error("Manifest missing originalFileName")
            return
        
        # Store session info in DynamoDB
        chunks_table.put_item(
            Item={
                'bookingId': booking_id,
                'chunkId': f"{session_id}_manifest",  # Use the manifest chunkId format
                'sessionId': session_id,
                'originalFileName': original_filename,
                'totalChunks': manifest.get('totalChunks', 0),
                'checksum': manifest.get('checksum', ''),
                'timestamp': manifest.get('timestamp', int(time.time() * 1000)),
                'manifestKey': manifest_key,
                'status': 'pending',
                'chunksUploaded': 0,
                'lastUpdated': int(time.time())
            }
        )
        
        logger.info(f"Registered chunk session {session_id} for booking {booking_id}")
    
    except Exception as e:
        logger.error(f"Error registering chunks from manifest: {str(e)}")
        raise

def check_chunks_availability(booking_id: str, session_id: str, manifest: Dict[str, Any]) -> bool:
    """Check if all chunks for a session are available in S3"""
    try:
        total_chunks = manifest.get('totalChunks', 0)
        
        # Get the current state from DynamoDB
        response = chunks_table.get_item(
            Key={
                'bookingId': booking_id,
                'chunkId': f"{session_id}_manifest"  # Use the manifest chunkId format
            }
        )
        
        if 'Item' not in response:
            logger.warning(f"Session {session_id} not found in DynamoDB")
            return False
        
        chunks_uploaded = response['Item'].get('chunksUploaded', 0)
        
        # If we've already verified all chunks are uploaded, return True
        if chunks_uploaded == total_chunks:
            return True
        
        # Otherwise, count the chunks in S3
        # Be more flexible with prefix matching to catch various naming formats
        prefix = f"{booking_id}/{session_id}"
        
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(
            Bucket=SOURCE_BUCKET,
            Prefix=prefix
        )
        
        # Collect all chunk keys for verification
        chunk_keys = []
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    # Skip manifest files in the count
                    if "_manifest.json" not in obj['Key'] and "part" in obj['Key']:
                        chunk_keys.append(obj['Key'])
        
        chunk_count = len(chunk_keys)
        logger.info(f"Found {chunk_count} chunks in S3 out of {total_chunks} expected")
        
        # Verify actual chunk accessibility by checking a few files
        if chunk_count >= total_chunks:
            # Test access to first and last chunk
            try:
                # Sort keys to find first and last chunks
                sorted_keys = sorted(chunk_keys)
                if sorted_keys:
                    # Test first chunk
                    s3_client.head_object(Bucket=SOURCE_BUCKET, Key=sorted_keys[0])
                    logger.info(f"Successfully verified S3 object accessibility for first chunk: {sorted_keys[0]}")
                    
                    # Test last chunk if there's more than one
                    if len(sorted_keys) > 1:
                        s3_client.head_object(Bucket=SOURCE_BUCKET, Key=sorted_keys[-1])
                        logger.info(f"Successfully verified S3 object accessibility for last chunk: {sorted_keys[-1]}")
            except Exception as access_error:
                logger.error(f"Error accessing chunks: {str(access_error)}")
                logger.info("Chunks exist but may not be accessible yet, will retry later")
                return False
        
        # Update the count in DynamoDB
        chunks_table.update_item(
            Key={
                'bookingId': booking_id,
                'chunkId': f"{session_id}_manifest"
            },
            UpdateExpression="SET chunksUploaded = :count, lastUpdated = :time",
            ExpressionAttributeValues={
                ':count': chunk_count,
                ':time': int(time.time())
            }
        )
        
        if chunk_count >= total_chunks:
            logger.info(f"All {chunk_count} chunks verified as available and accessible")
            return True
        else:
            logger.info(f"Only {chunk_count}/{total_chunks} chunks available, not ready for reassembly")
            return False
    
    except Exception as e:
        logger.error(f"Error checking chunks availability: {str(e)}")
        return False

def find_candidate_sessions() -> List[Dict[str, Any]]:
    """Find sessions that might be ready for reassembly"""
    try:
        # Find sessions that are pending and were last updated more than 2 minutes ago
        cutoff_time = int(time.time()) - 120  # 2 minutes ago
        
        # Scan the table for pending sessions
        response = chunks_table.scan(
            FilterExpression="(#status = :pending) AND (#lastUpdated < :cutoff)",
            ExpressionAttributeNames={
                '#status': 'status',
                '#lastUpdated': 'lastUpdated'
            },
            ExpressionAttributeValues={
                ':pending': 'pending',
                ':cutoff': cutoff_time
            }
        )
        
        return response.get('Items', [])
    
    except Exception as e:
        logger.error(f"Error finding candidate sessions: {str(e)}")
        return []

def reassemble_chunks_with_known_keys(bucket: str, booking_id: str, manifest: Dict[str, Any], chunk_keys: List[str]) -> Dict[str, Any]:
    """Reassemble chunks when we already know the chunk keys"""
    try:
        session_id = manifest.get('sessionId')
        original_filename = manifest.get('originalFileName')
        
        if not session_id or not original_filename:
            raise ValueError("Missing session ID or original filename")
        
        # Make sure we have a clean output filename without part indicators
        clean_filename = original_filename
        part_match = clean_filename.lower().find(".part")
        if part_match > 0:
            clean_filename = clean_filename[:part_match]
        
        # Add .tif extension if missing
        if not clean_filename.lower().endswith('.tif') and not clean_filename.lower().endswith('.tiff'):
            clean_filename += '.tif'
        
        # Generate resource ID for the reassembled file
        resource_id = f"geotiff_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        # Generate output key for the reassembled file
        output_key = f"{booking_id}/reassembled_{resource_id}_{clean_filename}"
        
        logger.info(f"Starting reassembly of {len(chunk_keys)} chunks into file {output_key}")
        
        # Try to sort chunks by part number
        def extract_part_num(key: str) -> int:
            import re
            # Try different patterns for part extraction
            patterns = [
                r'\.part(\d+)$',  # file.part1
                r'_part(\d+)_',   # file_part1_suffix
                r'part(\d+)',     # any occurrence of part1
            ]
            
            for pattern in patterns:
                match = re.search(pattern, key.lower())
                if match:
                    return int(match.group(1))
            
            # If all else fails, use position in list
            return 0
        
        # Sort chunks by extracted part number
        sorted_chunks = sorted(chunk_keys, key=extract_part_num)
        logger.info(f"Sorted {len(sorted_chunks)} chunks by part number")
        
        # Check file sizes to determine if we should use multipart upload or direct assembly
        total_size = 0
        chunk_sizes = []
        
        for chunk_key in sorted_chunks:
            try:
                head = s3_client.head_object(Bucket=bucket, Key=chunk_key)
                size = head['ContentLength']
                chunk_sizes.append(size)
                total_size += size
            except Exception as e:
                logger.error(f"Error getting size for chunk {chunk_key}: {e}")
                raise ValueError(f"Could not access chunk {chunk_key}")
        
        logger.info(f"Total size of all chunks: {total_size} bytes")
        
        # Check if any chunks are smaller than 5MB (S3 multipart upload minimum per part)
        # S3 minimum part size is 5MB except for the last part
        min_part_size = 5 * 1024 * 1024  # 5MB in bytes
        small_chunks = [i for i, size in enumerate(chunk_sizes) if i < len(chunk_sizes) - 1 and size < min_part_size]
        
        if small_chunks and len(sorted_chunks) > 1:
            logger.info(f"Found {len(small_chunks)} chunks smaller than 5MB minimum for multipart upload")
            
            # Use the direct assembly method for small chunks
            return reassemble_by_direct_download(bucket, booking_id, session_id, manifest, sorted_chunks, output_key, resource_id)
        
        # Use multipart upload for normal sized chunks
        response = s3_client.create_multipart_upload(
            Bucket=bucket,
            Key=output_key,
            ContentType='image/tiff'
        )
        
        upload_id = response['UploadId']
        
        try:
            # Process chunks in order
            parts = []
            
            for i, chunk_key in enumerate(sorted_chunks):
                part_number = i + 1
                
                logger.info(f"Copying part {part_number} from {chunk_key}")
                
                # Upload this part from the chunk
                part_response = s3_client.upload_part_copy(
                    Bucket=bucket,
                    CopySource={'Bucket': bucket, 'Key': chunk_key},
                    Key=output_key,
                    PartNumber=part_number,
                    UploadId=upload_id
                )
                
                parts.append({
                    'PartNumber': part_number,
                    'ETag': part_response['CopyPartResult']['ETag']
                })
            
            # Complete the multipart upload
            logger.info(f"Completing multipart upload for {output_key}")
            s3_client.complete_multipart_upload(
                Bucket=bucket,
                Key=output_key,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
            
            return finalize_reassembly(bucket, booking_id, session_id, output_key, resource_id, clean_filename)
            
        except Exception as e:
            # Abort the multipart upload on error
            logger.error(f"Error during reassembly: {str(e)}")
            try:
                s3_client.abort_multipart_upload(
                    Bucket=bucket,
                    Key=output_key,
                    UploadId=upload_id
                )
            except Exception as abort_error:
                logger.error(f"Failed to abort multipart upload: {str(abort_error)}")
            raise
    
    except Exception as e:
        logger.error(f"Error reassembling chunks with known keys: {str(e)}")
        return {
            'success': False,
            'message': f"Failed to reassemble chunks: {str(e)}",
            'bookingId': booking_id,
            'sessionId': session_id if 'session_id' in locals() else 'unknown'
        }

def reassemble_by_direct_download(
    bucket: str, 
    booking_id: str, 
    session_id: str,
    manifest: Dict[str, Any], 
    chunk_keys: List[str],
    output_key: str,
    resource_id: str
) -> Dict[str, Any]:
    """
    Alternative method to reassemble chunks by downloading them and uploading
    as a single file. This is needed when chunks are smaller than 5MB which is
    the S3 multipart upload minimum.
    """
    try:
        logger.info(f"Using direct download/upload method for reassembly due to small chunk sizes")
        
        # Download all chunks and combine them
        chunks_data = []
        
        for chunk_key in chunk_keys:
            logger.info(f"Downloading chunk: {chunk_key}")
            response = s3_client.get_object(Bucket=bucket, Key=chunk_key)
            chunk_data = response['Body'].read()
            chunks_data.append(chunk_data)
        
        # Combine all chunks into one file
        logger.info(f"Combining {len(chunks_data)} chunks")
        combined_data = b''.join(chunks_data)
        
        # Upload the combined file
        logger.info(f"Uploading combined file of size {len(combined_data)} bytes to {output_key}")
        s3_client.put_object(
            Bucket=bucket,
            Key=output_key,
            Body=combined_data,
            ContentType='image/tiff'
        )
        
        clean_filename = manifest.get('originalFileName', f"reassembled_{session_id}.tif")
        
        # Finalize the reassembly
        return finalize_reassembly(bucket, booking_id, session_id, output_key, resource_id, clean_filename)
        
    except Exception as e:
        logger.error(f"Error in direct download reassembly: {str(e)}")
        return {
            'success': False,
            'message': f"Failed to reassemble chunks: {str(e)}",
            'bookingId': booking_id,
            'sessionId': session_id
        }

def finalize_reassembly(bucket: str, booking_id: str, session_id: str, output_key: str, resource_id: str, clean_filename: str) -> Dict[str, Any]:
    """Final steps to complete reassembly: generate URL, update database records"""
    try:
        # Generate a presigned URL for the file
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': output_key},
            ExpiresIn=604800 * 2  # 2 weeks
        )
        
        # Get size of the reassembled file
        file_info = s3_client.head_object(Bucket=bucket, Key=output_key)
        file_size = file_info.get('ContentLength', 0)
        
        # Update the Resources table
        try:
            resources_table = dynamodb.Table(RESOURCES_TABLE)
            resources_table.put_item(
                Item={
                    'resourceId': resource_id,
                    'bookingId': booking_id,
                    'fileName': clean_filename,
                    'contentType': 'image/tiff',
                    'resourceType': 'geotiff',
                    's3Key': output_key,
                    'url': presigned_url,
                    'size': file_size,
                    'createdAt': int(time.time()),
                    'updatedAt': int(time.time()),
                    'status': 'active',
                    'isChunkedFile': True,
                    'isComplete': True,
                    'sessionId': session_id
                }
            )
            logger.info(f"Updated Resources table with reassembled file {resource_id}")
        except Exception as db_error:
            logger.error(f"Failed to update Resources table: {db_error}")
        
        # Update the chunks table to mark this session as completed
        try:
            chunks_table.update_item(
                Key={
                    'bookingId': booking_id,
                    'chunkId': f"{session_id}_manifest"
                },
                UpdateExpression="SET #status = :completed, finalResourceId = :resId, reassembledUrl = :url, completedAt = :time",
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':completed': 'completed',
                    ':resId': resource_id,
                    ':url': presigned_url,
                    ':time': int(time.time())
                }
            )
        except Exception as e:
            # The manifest record might not exist - that's okay
            logger.warning(f"Could not update chunks table: {e}")
        
        logger.info(f"Successfully reassembled file into {output_key}")
        
        return {
            'success': True,
            'message': f"Successfully reassembled into {clean_filename}",
            'resourceId': resource_id,
            'fileName': clean_filename,
            'url': presigned_url,
            's3Key': output_key,
            'bookingId': booking_id,
            'size': file_size
        }
    
    except Exception as e:
        logger.error(f"Error finalizing reassembly: {str(e)}")
        return {
            'success': False,
            'message': f"Failed to finalize reassembly: {str(e)}",
            'bookingId': booking_id,
            'sessionId': session_id
        }

def reassemble_chunks_by_session(
    booking_id: str, 
    session_id: str, 
    final_resource_id: Optional[str] = None,
    base_file_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Reassemble chunks for a specific session without a manifest
    """
    logger.info(f"Reassembling chunks for session: {session_id}")
    
    try:
        # First, try to find all chunks using a broader search
        # Since the actual prefix might vary (sometimes session_id is in the filename not the path)
        # We'll list all objects in the booking folder and filter by session_id
        
        prefix = f"{booking_id}/"  # Search all files in the booking folder
        
        logger.info(f"Searching for chunks with broader prefix: {prefix}")
        
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(
            Bucket=SOURCE_BUCKET,
            Prefix=prefix
        )
        
        # Collect all objects that might be chunks
        all_objects = []
        for page in pages:
            if 'Contents' in page:
                all_objects.extend(page['Contents'])
        
        if not all_objects:
            logger.error(f"No objects found with prefix {prefix}")
            raise ValueError(f"No files found for booking {booking_id}")
        
        logger.info(f"Found {len(all_objects)} total objects in booking folder")
        
        # Try multiple approaches to identify chunks for this session
        chunk_keys = []
        
        # Approach 1: Look for session ID in the key path
        path_pattern = f"{booking_id}/{session_id}"
        path_chunks = [obj['Key'] for obj in all_objects if path_pattern in obj['Key'] and "_manifest.json" not in obj['Key']]
        
        # Approach 2: Look for session ID in the filename
        filename_chunks = [obj['Key'] for obj in all_objects if session_id in obj['Key'] and "_manifest.json" not in obj['Key']]
        
        # Approach 3: Examine metadata for timestamp/session ID
        metadata_chunks = []
        for obj in all_objects:
            try:
                if "_manifest.json" not in obj['Key'] and "part" in obj['Key'].lower():
                    head = s3_client.head_object(Bucket=SOURCE_BUCKET, Key=obj['Key'])
                    metadata = head.get('Metadata', {})
                    if metadata.get('timestamp') == session_id:
                        metadata_chunks.append(obj['Key'])
            except Exception as e:
                # Skip if we can't get metadata
                pass
                
        # Combine all found chunks, removing duplicates
        chunk_keys = list(set(path_chunks + filename_chunks + metadata_chunks))
        
        if not chunk_keys:
            # Last resort: look for chunks by part number pattern
            part_chunks = [obj['Key'] for obj in all_objects if f".part" in obj['Key'].lower()]
            
            if part_chunks:
                # Group files that appear to be from the same file by examining name patterns
                chunk_groups = {}
                for key in part_chunks:
                    # Extract base name by removing part number
                    import re
                    match = re.search(r'(.+)\.part\d+$', key.lower())
                    if match:
                        base_name = match.group(1)
                        if base_name not in chunk_groups:
                            chunk_groups[base_name] = []
                        chunk_groups[base_name].append(key)
                
                # Use the group with the most chunks (likely our target)
                if chunk_groups:
                    best_match = max(chunk_groups.items(), key=lambda x: len(x[1]))
                    chunk_keys = best_match[1]
                    logger.info(f"Using best match group with {len(chunk_keys)} parts: {best_match[0]}")
        
        if not chunk_keys:
            logger.error(f"No chunks found for session {session_id}")
            raise ValueError(f"No chunks found for session {session_id}")
        
        # Log what we found
        logger.info(f"Found {len(chunk_keys)} potential chunks for session {session_id}")
        for key in chunk_keys:
            logger.info(f"  - {key}")
        
        # Create a fake manifest for reassembly
        fake_manifest = {
            'sessionId': session_id,
            'totalChunks': len(chunk_keys),
            'originalFileName': base_file_name or f"reassembled_{session_id}.tif"
        }
        
        # If no base filename was provided, try to extract it
        if not base_file_name and chunk_keys:
            # Extract filename from first chunk
            filename = chunk_keys[0].split('/')[-1]
            # Remove part indicator (e.g., .part1)
            import re
            clean_name = re.sub(r'\.part\d+$', '', filename)
            fake_manifest['originalFileName'] = clean_name
        
        logger.info(f"Created fake manifest with {len(chunk_keys)} chunks for reassembly")
        
        # Use the reassemble_chunks_from_manifest function with our fake manifest
        # But we'll inject our found chunk_keys
        result = reassemble_chunks_with_known_keys(SOURCE_BUCKET, booking_id, fake_manifest, chunk_keys)
        
        # If a final resource ID was provided, update it
        if final_resource_id and result.get('success') and result.get('resourceId'):
            try:
                resources_table = dynamodb.Table(RESOURCES_TABLE)
                resources_table.update_item(
                    Key={
                        'resourceId': result['resourceId']
                    },
                    UpdateExpression="SET OriginalResourceId = :orig",
                    ExpressionAttributeValues={
                        ':orig': final_resource_id
                    }
                )
            except Exception as update_error:
                logger.warning(f"Could not update resource with original ID: {update_error}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error in reassemble_chunks_by_session: {str(e)}")
        return {
            'success': False,
            'message': f"Error reassembling chunks by session: {str(e)}",
            'bookingId': booking_id,
            'sessionId': session_id
        }

def reassemble_chunks_from_manifest(bucket: str, booking_id: str, manifest: Dict[str, Any]) -> Dict[str, Any]:
    """Reassemble chunks based on the manifest"""
    try:
        session_id = manifest.get('sessionId')
        original_filename = manifest.get('originalFileName')
        total_chunks = manifest.get('totalChunks', 0)
        
        if not session_id or not original_filename:
            raise ValueError("Manifest missing required fields")
        
        # Find all chunks with this session ID using multiple approaches
        prefix = f"{booking_id}/"
        
        logger.info(f"Starting reassembly for session {session_id}, expecting {total_chunks} chunks")
        
        # Get all objects in the booking folder
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(
            Bucket=bucket,
            Prefix=prefix
        )
        
        all_objects = []
        for page in pages:
            if 'Contents' in page:
                all_objects.extend(page['Contents'])
        
        if not all_objects:
            raise ValueError(f"No files found in bucket {bucket} with prefix {prefix}")
        
        # Use multiple approaches to find chunks
        logger.info(f"Found {len(all_objects)} total objects in booking folder")
        
        # Look for chunks using various methods
        chunk_keys = []
        
        # Look for session ID in the key path
        path_pattern = f"{booking_id}/{session_id}"
        path_chunks = [obj['Key'] for obj in all_objects if path_pattern in obj['Key'] and "_manifest.json" not in obj['Key']]
        
        # Look for session ID in the filename
        filename_chunks = [obj['Key'] for obj in all_objects if session_id in obj['Key'] and "_manifest.json" not in obj['Key']]
        
        # Look for part pattern (like .part1, .part2, etc)
        part_pattern_chunks = [obj['Key'] for obj in all_objects if ".part" in obj['Key'].lower() and "_manifest.json" not in obj['Key']]
        
        # Combine all found chunks, removing duplicates
        chunk_keys = list(set(path_chunks + filename_chunks))
        
        if not chunk_keys and part_pattern_chunks:
            # If we haven't found chunks by session ID, try using the part pattern chunks
            chunk_keys = part_pattern_chunks
        
        if not chunk_keys:
            raise ValueError(f"No valid chunks found for session {session_id}")
        
        # Log what we found
        logger.info(f"Found {len(chunk_keys)} potential chunks for session {session_id}")
        
        # Now that we have the chunks, use the direct reassembly function
        return reassemble_chunks_with_known_keys(bucket, booking_id, manifest, chunk_keys)
        
    except Exception as e:
        logger.error(f"Error reassembling chunks from manifest: {str(e)}")
        
        # Update the status to failed
        try:
            if session_id:
                chunks_table.update_item(
                    Key={
                        'bookingId': booking_id,
                        'chunkId': f"{session_id}_manifest" 
                    },
                    UpdateExpression="SET #status = :failed, errorMessage = :error, failedAt = :time",
                    ExpressionAttributeNames={
                        '#status': 'status'
                    },
                    ExpressionAttributeValues={
                        ':failed': 'failed',
                        ':error': str(e),
                        ':time': int(time.time())
                    }
                )
        except Exception:
            pass  # Ignore errors updating status
        
        return {
            'success': False,
            'message': f"Failed to reassemble chunks: {str(e)}",
            'bookingId': booking_id,
            'sessionId': session_id if 'session_id' in locals() else 'unknown'
        }

def reassemble_chunks(booking_id: str, resource_id: Optional[str] = None, file_pattern: Optional[str] = None) -> Dict[str, Any]:
    """Find and reassemble chunks for a booking"""
    try:
        # If resource_id is provided, look for chunks with that finalResourceId
        if resource_id:
            # Query the chunks table for sessions with this resource_id
            response = chunks_table.scan(
                FilterExpression="bookingId = :bid AND finalResourceId = :rid",
                ExpressionAttributeValues={
                    ':bid': booking_id,
                    ':rid': resource_id
                }
            )
            
            if 'Items' in response and response['Items']:
                session = response['Items'][0]
                session_id = session['sessionId']
                manifest_key = session.get('manifestKey')
                
                if manifest_key:
                    manifest = download_and_parse_manifest(SOURCE_BUCKET, manifest_key)
                    if manifest:
                        return reassemble_chunks_from_manifest(SOURCE_BUCKET, booking_id, manifest)
                
                # If no manifest or manifest download failed, try direct reassembly
                return reassemble_chunks_by_session(booking_id, session_id, resource_id)
        
        # If no resource_id or couldn't find it, look by file pattern
        if file_pattern:
            # List objects in the booking folder matching the pattern
            prefix = f"{booking_id}/{file_pattern}"
            
            response = s3_client.list_objects_v2(
                Bucket=SOURCE_BUCKET,
                Prefix=prefix
            )
            
            if 'Contents' in response:
                # Group files by session ID
                session_files = {}
                for obj in response['Contents']:
                    key = obj['Key']
                    # Try to extract session ID from key
                    parts = key.split('_')
                    for i, part in enumerate(parts):
                        if len(part) >= 13 and part.isdigit():  # Looks like a timestamp
                            session_id = part
                            if session_id not in session_files:
                                session_files[session_id] = []
                            session_files[session_id].append(key)
                            break
                
                # Find session with most files
                if session_files:
                    best_session = max(session_files.items(), key=lambda x: len(x[1]))
                    session_id, files = best_session
                    
                    # Look for manifest
                    manifest_keys = [k for k in files if k.endswith('_manifest.json')]
                    if manifest_keys:
                        manifest = download_and_parse_manifest(SOURCE_BUCKET, manifest_keys[0])
                        if manifest:
                            return reassemble_chunks_from_manifest(SOURCE_BUCKET, booking_id, manifest)
                    
                    # If no manifest, try direct reassembly
                    return reassemble_chunks_by_session(booking_id, session_id, resource_id, file_pattern)
        
        # If all else fails, look for any pending sessions for this booking
        response = chunks_table.scan(
            FilterExpression="bookingId = :bid AND #status = :pending",
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':bid': booking_id,
                ':pending': 'pending'
            }
        )
        
        if 'Items' in response and response['Items']:
            session = response['Items'][0]
            session_id = session['sessionId']
            manifest_key = session.get('manifestKey')
            
            if manifest_key:
                manifest = download_and_parse_manifest(SOURCE_BUCKET, manifest_key)
                if manifest:
                    return reassemble_chunks_from_manifest(SOURCE_BUCKET, booking_id, manifest)
            
            # If no manifest or manifest download failed, try direct reassembly
            return reassemble_chunks_by_session(booking_id, session_id, resource_id)
        
        return {
            'success': False,
            'message': "Could not find chunks to reassemble",
            'bookingId': booking_id
        }
    
    except Exception as e:
        logger.error(f"Error reassembling chunks: {str(e)}")
        return {
            'success': False,
            'message': f"Error reassembling chunks: {str(e)}",
            'bookingId': booking_id
        }


*pilotforce-get-booking-details.py*
This function is responsible for getting all details about the booking such as details, images and the geotiff. This file is supposed to:
Get all details about the booking (which is does well already)
Get all images for the booking from the Resources table and then fetch the images from the S3 bucket to be displayed in the Image Gallery component/tab in the Flight Details page (already does successfully)
Get the reassembled GeoTiff file from the GeoTiffChunks table (isnt doing this successfully yet).

This function needs to be modified, only for the geotiff fetching, in order to make it work as successfully as the other components of the function. currently the function is able to fetch the images from teh Resources table nad the S3 bucket but unable to get the GeoTiff file from the GeoTiffChunks table and the exact same S3 bucket and folder as the images are stored in.

Here is the lambda fucntion for this operation:
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
                                
                        # Add this resource to our response
                        if presigned_url:
                            image_item = {
                                'name': item.get('FileName', 'Unknown'),
                                'url': presigned_url,
                                'type': item.get('ContentType', 'image/jpeg'),
                                'resourceId': item.get('ResourceId', ''),
                                'uploadDate': item.get('CreatedAt', '')
                            }
                            images.append(image_item)
                        else:
                            logger.warning(f"Could not generate URL for resource {item.get('ResourceId')}")
                    except Exception as item_error:
                        logger.warning(f"Error processing resource item: {str(item_error)}")
            else:
                logger.info("No resources found in Resources table")
                
            # If no resources found, check for images directly in the S3 bucket
            if not images:
                logger.info(f"Looking for images directly in S3 bucket for booking {booking_id}")
                try:
                    # List objects in the booking prefix
                    prefix = f"booking_{booking_id}/"
                    s3_response = s3_client.list_objects_v2(
                        Bucket=s3_bucket,
                        Prefix=prefix
                    )
                    
                    if 'Contents' in s3_response:
                        s3_objects = s3_response['Contents']
                        logger.info(f"Found {len(s3_objects)} objects in S3 with prefix {prefix}")
                        
                        for obj in s3_objects:
                            try:
                                key = obj['Key']
                                
                                # Skip non-image files and already processed GeoTIFF files
                                if key.endswith('.part') or '_manifest.json' in key:
                                    continue
                                    
                                # Get the filename
                                filename = key.split('/')[-1]
                                
                                # Only generate URLs for images by checking extension
                                image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
                                is_image = any(filename.lower().endswith(ext) for ext in image_extensions)
                                
                                if is_image or 'geotiff' in filename.lower() or '.tif' in filename.lower():
                                    # Generate a presigned URL
                                    presigned_url = s3_client.generate_presigned_url(
                                        'get_object',
                                        Params={
                                            'Bucket': s3_bucket,
                                            'Key': key
                                        },
                                        ExpiresIn=604800  # 7 days
                                    )
                                    
                                    # Ensure we're not duplicating an image
                                    if not any(img.get('url') == presigned_url for img in images):
                                        images.append({
                                            'name': filename,
                                            'url': presigned_url,
                                            'type': 'image/jpeg',  # Default to JPEG
                                            'resourceId': f"s3-{key.replace('/', '-')}",
                                            'uploadDate': int(obj['LastModified'].timestamp()),
                                            'source': 'direct_s3'
                                        })
                            except Exception as obj_error:
                                logger.warning(f"Error processing S3 object {obj.get('Key')}: {str(obj_error)}")
                        
                except Exception as s3_list_error:
                    logger.warning(f"Error listing S3 objects: {str(s3_list_error)}")
                
        except Exception as resources_error:
            logger.warning(f"Error querying Resources table: {str(resources_error)}")
        
        logger.info(f"Total resources found for booking {booking_id}: {len(images)}")
        return images
    
    except Exception as e:
        logger.error(f"Error fetching booking images: {str(e)}")
        return []

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
