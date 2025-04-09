// Using AWS SDK v3 with ES modules
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// Initialize AWS clients
const cognitoClient = new CognitoIdentityProviderClient();
const ddbClient = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
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
        // Direct invocation (not through API Gateway)
        if (event.name && event.assetType && !event.httpMethod && !event.headers) {
            console.log('Processing direct lambda invocation with data:', JSON.stringify(event));
            
            // Create a new asset record
            const assetId = randomUUID();
            const timestamp = new Date().toISOString();
            
            // Use user ID and company ID from the payload if available
            const userId = event.userId || 'direct-invocation-js';
            const companyId = event.companyId || 'default-company-js';
            
            console.log(`Using provided credentials - UserId: ${userId}, CompanyId: ${companyId}`);
            
            const asset = {
                AssetId: assetId,
                UserId: userId,
                CompanyId: companyId,
                Name: event.name,
                Description: event.description || '',
                AssetType: event.assetType,
                Address: event.address || '',
                Coordinates: event.coordinates || null,
                Area: event.area || 0,
                CreatedAt: timestamp,
                UpdatedAt: timestamp,
                Tags: event.tags || []
            };
            
            // Add centerPoint if provided
            if (event.centerPoint) {
                asset.CenterPoint = event.centerPoint;
            }
            
            // Add GeoJSON if provided
            if (event.geojson) {
                asset.GeoJSON = event.geojson;
            }
            
            // Save to DynamoDB using AWS SDK v3
            const params = {
                TableName: 'Assets',
                Item: asset
            };
            
            const putCommand = new PutCommand(params);
            await dynamoDB.send(putCommand);
            
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    message: 'Asset created successfully (direct JS invocation)',
                    asset: asset
                })
            };
        }
        
        // API Gateway invocation
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ message: 'Authorization token required' })
            };
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        // Get user info from token using AWS SDK v3
        const getUserCommand = new GetUserCommand({
            AccessToken: token
        });
        
        const userInfo = await cognitoClient.send(getUserCommand);
        
        // Extract attributes
        const userAttributes = {};
        for (const attr of userInfo.UserAttributes || []) {
            userAttributes[attr.Name] = attr.Value;
        }
        
        const userId = userAttributes.sub;
        const companyId = userAttributes['custom:companyId'];
        
        // Parse the asset data from the request body
        const assetData = JSON.parse(event.body);
        
        // Validate required fields
        if (!assetData.name || !assetData.assetType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing required asset information' })
            };
        }
        
        // Create a new asset record
        const assetId = randomUUID();
        const timestamp = new Date().toISOString();
        
        const asset = {
            AssetId: assetId,
            UserId: userId,
            CompanyId: companyId,
            Name: assetData.name,
            Description: assetData.description || '',
            AssetType: assetData.assetType,
            Address: assetData.address || '',
            Coordinates: assetData.coordinates || null,
            Area: assetData.area || 0,
            CreatedAt: timestamp,
            UpdatedAt: timestamp,
            Tags: assetData.tags || []
        };
        
        // Add any additional fields from the request
        if (assetData.centerPoint) {
            asset.CenterPoint = assetData.centerPoint;
        }
        
        if (assetData.geojson) {
            asset.GeoJSON = assetData.geojson;
        }
        
        // Save to DynamoDB using AWS SDK v3
        const params = {
            TableName: 'Assets',
            Item: asset
        };
        
        const putCommand = new PutCommand(params);
        await dynamoDB.send(putCommand);
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Asset created successfully',
                asset: asset
            })
        };
    } catch (error) {
        console.error('Error creating asset:', error);
        
        let statusCode = 500;
        let message = 'Internal server error';
        
        if (error.name === 'NotAuthorizedException') {
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
