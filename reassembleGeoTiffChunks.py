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
