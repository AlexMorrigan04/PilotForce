const AWS = require('aws-sdk'); 
const cognito = new AWS.CognitoIdentityServiceProvider(); 
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => { 
    // Set up CORS headers 
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

    // Handle OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }

    try {
        // Extract authentication token
        const authHeader = event.headers['Authorization'] || event.headers['authorization'];
        if (!authHeader) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Authorization token required' })
            };
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        // Get user info from Cognito
        const userParams = {
            AccessToken: token
        };
        
        const userInfo = await cognito.getUser(userParams).promise();
        
        // Extract attributes
        const userAttributes = {};
        userInfo.UserAttributes.forEach(attr => {
            userAttributes[attr.Name] = attr.Value;
        });
        
        const userId = userAttributes.sub;
        
        // Get full user details from DynamoDB
        const dbParams = {
            TableName: 'Users',
            Key: {
                UserId: userId
            }
        };
        
        const dbResult = await dynamoDB.get(dbParams).promise();
        const userData = dbResult.Item || {};
        
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
                    createdAt: userData.CreatedAt || new Date().toISOString()
                }
            })
        };
    } catch (error) {
        console.error('Error getting user data:', error);
        
        let statusCode = 500;
        let message = 'Internal server error';
        
        if (error.code === 'NotAuthorizedException') {
            statusCode = 401;
            message = 'Invalid or expired token';
        }
        
        return {
            statusCode,
            headers,
            body: JSON.stringify({ 
                message, 
                error: error.message
            })
        };
    }
};