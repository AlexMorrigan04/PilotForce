import boto3
import json
import logging
import os

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS Cognito client
cognito_client = boto3.client('cognito-idp')

# The Cognito user pool and client ID from your configuration
USER_POOL_ID = 'eu-north-1_gejWyB4ZB'  # From your cognito_schema.json
CLIENT_ID = 're4qc69mpbck8uf69jd53oqpa'   # From your cognitoUtils.ts

def lambda_handler(event, context):
    # Set up CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }
    
    # Log the event for debugging (omitting sensitive data)
    logger.info(f"Received event type: {type(event)}")
    if isinstance(event, dict):
        safe_keys = [k for k in event.keys() if k.lower() not in ('password', 'secret')]
        logger.info(f"Event keys: {safe_keys}")
    
    try:
        # Extract username and password from the event
        body = {}
        
        # Request body handling depends on API Gateway integration
        if 'body' in event:
            # API Gateway proxy integration
            if isinstance(event['body'], str):
                try:
                    body = json.loads(event['body'])
                except:
                    logger.error("Failed to parse request body as JSON")
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'message': 'Invalid request body format'})
                    }
            elif isinstance(event['body'], dict):
                body = event['body']
        else:
            # Direct Lambda invocation or custom integration
            body = event
            
        username = body.get('username')
        password = body.get('password')
        
        # Log the login attempt (never log passwords)
        if username:
            logger.info(f"Login attempt for user: {username}")
        
        if not username or not password:
            logger.warning("Missing username or password")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Username and Password are required'})
            }

        # Initiate authentication with Cognito
        response = cognito_client.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow='ADMIN_NO_SRP_AUTH',  # Flow to use username and password directly
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            }
        )
        
        # If successful, extract the tokens
        auth_result = response.get('AuthenticationResult', {})
        logger.info(f"Login successful for {username}")
        
        # Create a properly formatted response with JSON body as a string
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Login successful',
                'tokens': {
                    'accessToken': auth_result.get('AccessToken', ''),
                    'idToken': auth_result.get('IdToken', ''),
                    'refreshToken': auth_result.get('RefreshToken', ''),
                    'expiresIn': auth_result.get('ExpiresIn', 3600)
                }
            })
        }
    
    except cognito_client.exceptions.NotAuthorizedException as e:
        logger.error(f"Authentication failed: {str(e)}")
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({
                'message': 'Invalid username or password',
                'error': str(e)
            })
        }
    
    except cognito_client.exceptions.UserNotConfirmedException as e:
        logger.error(f"User not confirmed: {str(e)}")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'message': 'User not confirmed',
                'needsConfirmation': True,
                'error': str(e)
            })
        }
    
    except Exception as e:
        logger.error(f"Error during authentication: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal Server Error',
                'error': str(e)
            })
        }

# For local testing
if __name__ == "__main__":
    # You can test the handler with a mock event
    test_event = {
        "username": "test@example.com",
        "password": "Password1!"
    }
    
    # Print the result without exposing secrets
    # result = lambda_handler(test_event, None)
    # print(f"Status: {result['statusCode']}")
    # print(f"Response: {result['body']}")
