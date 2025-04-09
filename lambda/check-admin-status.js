const AWS = require('aws-sdk');

// Initialize the Cognito Identity Provider client
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

// User pool constants
const USER_POOL_ID = process.env.USER_POOL_ID || 'eu-north-1_gejWyB4ZB';

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET'
};

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  try {
    // Extract token from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Authorization token required' })
      };
    }

    // Remove 'Bearer ' if present
    const token = authHeader.replace('Bearer ', '');
    
    // First try to get the user information from the token
    let userInfo;
    try {
      userInfo = await cognitoIdentityServiceProvider.getUser({
        AccessToken: token
      }).promise();
    } catch (error) {
      console.error('Error getting user from token:', error);
      
      // If the token is an ID token instead of an access token, we can still
      // extract the username from the event.requestContext if available
      if (event.requestContext && event.requestContext.authorizer && 
          event.requestContext.authorizer.claims && 
          event.requestContext.authorizer.claims['cognito:username']) {
        
        // Get the username from the authorizer claims
        const username = event.requestContext.authorizer.claims['cognito:username'];
        
        // Check if the user is in the admin group using AdminListGroupsForUser
        return await checkAdminGroupMembership(username);
      }
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid or expired token',
          error: error.message
        })
      };
    }
    
    // If we got user info, get the username
    const username = userInfo.Username;
    
    // Check if the user is in the admin group
    return await checkAdminGroupMembership(username);
    
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error checking admin status',
        error: error.message
      })
    };
  }
};

/**
 * Checks if a user is in the Administrators group
 * @param {string} username - The Cognito username
 * @returns {Object} API Gateway response
 */
async function checkAdminGroupMembership(username) {
  try {
    // Get the user's groups
    const groupResponse = await cognitoIdentityServiceProvider.adminListGroupsForUser({
      UserPoolId: USER_POOL_ID,
      Username: username
    }).promise();
    
    // Check if the user is in an admin group
    const groups = groupResponse.Groups || [];
    const groupNames = groups.map(group => group.GroupName);
    const isAdmin = groupNames.some(name => ['Administrators', 'Admins', 'Admin'].includes(name));
    
    console.log(`User ${username} is admin: ${isAdmin}, Groups: ${groupNames.join(', ')}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isAdmin,
        username,
        groups: groupNames
      })
    };
  } catch (error) {
    console.error(`Error checking group membership for ${username}:`, error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Error checking admin group membership',
        error: error.message
      })
    };
  }
}
