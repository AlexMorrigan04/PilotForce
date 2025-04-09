// Using CommonJS imports for compatibility with AWS Lambda
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get Cognito configuration from environment variables with hardcoded fallbacks
const USER_POOL_ID = process.env.USER_POOL_ID || 'eu-north-1_gejWyB4ZB';
const CLIENT_ID = process.env.CLIENT_ID || 're4qc69mpbck8uf69jd53oqpa';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '1a798j6rng5ojs8u8r6sea9kjc93a0n937h6semd6ebhjg1i23dv';

// Set up CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
};

// Calculate SECRET_HASH for Cognito
function calculateSecretHash(username) {
  const crypto = require('crypto');
  const message = username + CLIENT_ID;
  const hmac = crypto.createHmac('sha256', CLIENT_SECRET);
  hmac.update(message);
  return hmac.digest('base64');
}

// Main Lambda handler
exports.handler = async (event) => {
  console.log(`Received event type: ${typeof event}`);
  
  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  try {
    // Get the HTTP method and path
    const httpMethod = event.httpMethod || 'GET';
    const path = event.path || '/';
    
    // Log important details for debugging
    console.log(`Request: ${httpMethod} ${path}`);
    if (event.headers) {
      console.log('Headers:', Object.keys(event.headers));
    }
    
    // Handle different API Gateway routes
    if (path === '/user' || path.endsWith('/user')) {
      return await handleUserRequest(event);
    } else if (path === '/login' || path.endsWith('/login')) {
      return await handleLoginRequest(event);
    }
    
    // Default route - not found
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found' })
    };
  } catch (error) {
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

// Handle user API requests
async function handleUserRequest(event) {
  try {
    // Extract authentication token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Authorization token required' })
      };
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log(`Processing token: ${token.substring(0, 10)}...`);
    
    // Get user info from Cognito
    const userInfo = await cognito.getUser({ AccessToken: token }).promise();
    
    // Extract attributes
    const userAttributes = {};
    userInfo.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });
    
    const userId = userAttributes.sub;
    
    // Get user data from DynamoDB
    let userData = {};
    try {
      const dbResult = await dynamodb.get({
        TableName: 'Users',
        Key: { UserId: userId }
      }).promise();
      userData = dbResult.Item || {};
    } catch (dbError) {
      console.error('DynamoDB error:', dbError);
      // Continue with empty user data if DB fails
    }
    
    // Return combined user data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user: {
          id: userId,
          username: userInfo.Username,
          email: userAttributes.email,
          companyId: userData.CompanyId || userAttributes['custom:companyId'] || '',
          role: userData.UserRole || userAttributes['custom:userRole'] || 'User',
          phoneNumber: userData.PhoneNumber || userAttributes.phone_number || '',
          status: userData.UserAccess ? 'Active' : 'Pending',
          createdAt: userData.CreatedAt || new Date().toISOString(),
          name: userAttributes.name || '',
          given_name: userAttributes.given_name || '',
          family_name: userAttributes.family_name || ''
        }
      })
    };
  } catch (error) {
    console.error('Error in user request:', error);
    
    // Handle specific Cognito errors
    if (error.code === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid or expired token',
          error: error.message
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error retrieving user data',
        error: error.message
      })
    };
  }
}

// Handle login API requests
async function handleLoginRequest(event) {
  try {
    // Parse the request body
    let body = {};
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else if (typeof event.body === 'object') {
      body = event.body;
    }
    
    const { username, password } = body;
    
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Username and password are required' })
      };
    }
    
    // Calculate SECRET_HASH
    const secretHash = calculateSecretHash(username);
    
    // Authenticate with Cognito
    const authParams = {
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash
      }
    };
    
    const authResponse = await cognito.adminInitiateAuth(authParams).promise();
    const authResult = authResponse.AuthenticationResult || {};
    
    // If there's a challenge, return it
    if (authResponse.ChallengeName) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: `Authentication challenge required: ${authResponse.ChallengeName}`,
          challengeName: authResponse.ChallengeName,
          session: authResponse.Session,
          challengeParameters: authResponse.ChallengeParameters
        })
      };
    }
    
    // Get user attributes
    const userResponse = await cognito.adminGetUser({
      UserPoolId: USER_POOL_ID,
      Username: username
    }).promise();
    
    // Create user object
    const userAttributes = {};
    userResponse.UserAttributes.forEach(attr => {
      userAttributes[attr.Name] = attr.Value;
    });
    
    const user = {
      id: userAttributes.sub || '',
      username: userResponse.Username,
      email: userAttributes.email || '',
      name: userAttributes.name || '',
      companyId: userAttributes['custom:companyId'] || '',
      role: userAttributes['custom:userRole'] || 'User'
    };
    
    // Return success with tokens and user info
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Login successful',
        tokens: {
          accessToken: authResult.AccessToken,
          idToken: authResult.IdToken,
          refreshToken: authResult.RefreshToken,
          expiresIn: authResult.ExpiresIn
        },
        user
      })
    };
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific Cognito errors
    if (error.code === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          message: 'Invalid username or password',
          error: error.message
        })
      };
    } else if (error.code === 'UserNotConfirmedException') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'User not confirmed',
          needsConfirmation: true,
          error: error.message
        })
      };
    } else if (error.code === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: 'User does not exist',
          error: error.message
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Login failed',
        error: error.message
      })
    };
  }
}
