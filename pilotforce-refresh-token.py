import json
import boto3
import os
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create service clients
cognito = boto3.client('cognito-idp')

def lambda_handler(event, context):
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }
    
    # Log the incoming event
    logger.info(f"Refresh token request received")
    
    # Handle OPTIONS requests (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        # Parse the request body to get the refresh token
        request_body = None
        if event.get('body'):
            try:
                request_body = json.loads(event.get('body'))
            except Exception as e:
                logger.error(f"Failed to parse request body: {str(e)}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'message': 'Invalid request body format'
                    })
                }
        
        if not request_body:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'Request body is required'
                })
            }
        
        refresh_token = request_body.get('refreshToken')
        
        if not refresh_token:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'Refresh token is required'
                })
            }
        
        # Get the client ID from environment variables
        client_id = os.environ.get('COGNITO_CLIENT_ID')
        if not client_id:
            logger.error("COGNITO_CLIENT_ID environment variable is not set")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'Internal server error - missing configuration'
                })
            }
        
        # Call Cognito to refresh the tokens
        logger.info("Initiating auth with refresh token")
        auth_result = cognito.initiate_auth(
            ClientId=client_id,
            AuthFlow='REFRESH_TOKEN_AUTH',
            AuthParameters={
                'REFRESH_TOKEN': refresh_token
            }
        )
        
        logger.info("Token refresh successful")
        
        # Return the new tokens
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'idToken': auth_result['AuthenticationResult'].get('IdToken'),
                'accessToken': auth_result['AuthenticationResult'].get('AccessToken'),
                'expiresIn': auth_result['AuthenticationResult'].get('ExpiresIn')
            })
        }
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        
        # Determine the appropriate error response
        status_code = 500
        message = 'Internal server error'
        
        if hasattr(e, 'response'):
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == 'NotAuthorizedException':
                status_code = 401
                message = 'Invalid refresh token'
            elif error_code == 'LimitExceededException':
                status_code = 429
                message = 'Too many requests'
        
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': message,
                'error': str(e)
            })
        }
