// Use CommonJS import syntax which is more compatible with Lambda
const AWS = require('aws-sdk');

// Create service clients
const cognito = new AWS.CognitoIdentityServiceProvider();

// Export handler using CommonJS format
exports.handler = async (event) => {
    // Set up CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    };
    
    // Handle OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    try {
        // Parse the request body to get the refresh token
        let requestBody;
        try {
            requestBody = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Invalid request body' })
            };
        }
        
        const { refreshToken } = requestBody;
        
        if (!refreshToken) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Refresh token is required' })
            };
        }
        
        // Call Cognito to refresh the tokens
        const params = {
            ClientId: process.env.COGNITO_CLIENT_ID, // Set this in your Lambda environment variables
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            AuthParameters: {
                'REFRESH_TOKEN': refreshToken
            }
        };
        
        const authResult = await cognito.initiateAuth(params).promise();
        
        // Return the new tokens
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                idToken: authResult.AuthenticationResult.IdToken,
                accessToken: authResult.AuthenticationResult.AccessToken,
                // Note: The refresh token doesn't typically change on refresh
                expiresIn: authResult.AuthenticationResult.ExpiresIn
            })
        };
    } catch (error) {
        console.error('Error refreshing token:', error);
        
        // Determine the appropriate error response
        let statusCode = 500;
        let message = 'Internal server error';
        
        if (error.code === 'NotAuthorizedException') {
            statusCode = 401;
            message = 'Invalid refresh token';
        }
        
        return {
            statusCode,
            headers,
            body: JSON.stringify({ 
                success: false,
                message, 
                error: error.message
            })
        };
    }
};
