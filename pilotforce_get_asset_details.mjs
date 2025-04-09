// Use CommonJS import syntax which is more compatible with Lambda
const AWS = require('aws-sdk');

// Create service clients
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Export handler using CommonJS format
exports.handler = async (event) => {
    // Set up CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET'
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
        console.log('Received event:', JSON.stringify(event, null, 2));
        
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
        
        // Get user info from token
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
        const companyId = userAttributes['custom:companyId'];
        const userRole = userAttributes['custom:userRole'] || 'User';
        
        // Get the asset ID from the path parameters
        let assetId;
        if (event.pathParameters && event.pathParameters.id) {
            assetId = event.pathParameters.id;
        } else if (event.pathParameters && event.pathParameters.proxy) {
            assetId = event.pathParameters.proxy;
        } else if (event.queryStringParameters && event.queryStringParameters.AssetId) {
            assetId = event.queryStringParameters.AssetId;
        }
        
        if (!assetId) {
            console.error('Asset ID not found in request:', JSON.stringify(event, null, 2));
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Asset ID is required' })
            };
        }
        
        console.log(`Looking up asset with ID: ${assetId}`);
        
        // Get the asset from DynamoDB
        const params = {
            TableName: 'Assets',
            Key: {
                AssetId: assetId
            }
        };
        
        const result = await dynamoDB.get(params).promise();
        const asset = result.Item;
        
        // Check if asset exists
        if (!asset) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Asset not found' })
            };
        }
        
        // Check if user has access to this asset
        if (asset.CompanyId !== companyId && userRole !== 'Admin' && userRole !== 'AccountAdmin') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ message: 'You do not have permission to access this asset' })
            };
        }
        
        // If not admin and not the creator, restrict access (unless user specifically needs it)
        if (userRole !== 'Admin' && userRole !== 'AccountAdmin' && asset.UserId !== userId) {
            // Check if we have any bookings for this user for this asset
            const bookingParams = {
                TableName: 'Bookings',
                IndexName: 'AssetIdIndex',
                KeyConditionExpression: 'AssetId = :assetId',
                FilterExpression: 'UserId = :userId',
                ExpressionAttributeValues: {
                    ':assetId': assetId,
                    ':userId': userId
                }
            };
            
            const bookingResult = await dynamoDB.query(bookingParams).promise();
            
            if (bookingResult.Items.length === 0) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({ message: 'You do not have permission to access this asset' })
                };
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                asset: asset
            })
        };
    } catch (error) {
        console.error('Error getting asset details:', error);
        
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