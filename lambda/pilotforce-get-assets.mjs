import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Environment variables with fallbacks
const TABLE_NAME = process.env.ASSETS_TABLE_NAME || 'Assets';
const GSI_NAME = process.env.COMPANY_ID_INDEX_NAME || 'CompanyIdIndex';
const CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || '*';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID;
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const TOKEN_TYPE = process.env.TOKEN_TYPE || 'id_token'; // Use 'id_token' or 'access_token'
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Initialize AWS clients with explicit region configuration
const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
const ddbClient = new DynamoDBClient({ region: AWS_REGION });
const dynamoDB = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event, context) => {
    const startTime = Date.now();
    const requestId = context?.awsRequestId || 'unknown-request';

    console.log(`[INFO] Lambda execution started. RequestId: ${requestId}`);
    console.log(`[INFO] Event received: ${JSON.stringify(event, null, 2)}`);
    
    // Define headers once to ensure consistency
    const headers = {
        'Access-Control-Allow-Origin': CORS_ALLOWED_ORIGINS,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key,X-Amz-Security-Token,X-Company-ID',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
    };
    
    // Handle OPTIONS (preflight) requests immediately
    if (event.httpMethod === 'OPTIONS') {
        console.log('[INFO] Handling OPTIONS preflight request');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }

    // Extract companyId from various possible locations
    let companyId;
    let authHeader;
    
    // Case 1: AWS_PROXY integration (event has standard structure)
    if (event.queryStringParameters) {
        companyId = event.queryStringParameters.companyId;
        console.log(`[INFO] Found companyId in queryStringParameters: ${companyId}`);
    }
    
    // Case 2: From headers
    if (event.headers) {
        if (event.headers['X-Company-ID'] || event.headers['x-company-id']) {
            companyId = event.headers['X-Company-ID'] || event.headers['x-company-id'];
            console.log(`[INFO] Found companyId in headers: ${companyId}`);
        }
        
        // Get authorization header while we're here - handle case sensitivity
        if (!authHeader) {
            // Check for standard casing, lowercase, and mixed case Authorization header
            authHeader = event.headers.Authorization || 
                         event.headers.authorization || 
                         Object.keys(event.headers)
                             .find(key => key.toLowerCase() === 'authorization') ?
                             event.headers[Object.keys(event.headers)
                                 .find(key => key.toLowerCase() === 'authorization')] :
                             null;
            
            if (authHeader) {
                console.log('[INFO] Found Authorization header');
            }
        }
    }
    
    // Case 3: Direct lambda invocation with companyId property
    if (!companyId && event.companyId) {
        companyId = event.companyId;
        console.log(`[INFO] Found companyId in direct invocation: ${companyId}`);
    }
    
    // Case 4: AWS integration (non-proxy) puts query params in a different place
    if (!companyId && event.params && event.params.querystring) {
        companyId = event.params.querystring.companyId;
        console.log(`[INFO] Found companyId in params.querystring: ${companyId}`);
        
        // Also check for authorization in params.header
        if (!authHeader && event.params.header) {
            authHeader = event.params.header.Authorization || event.params.header.authorization;
        }
    }
    
    // Case 5: Sometimes API Gateway passes the entire body as a stringified JSON
    if (!companyId && typeof event.body === 'string') {
        try {
            const body = JSON.parse(event.body);
            if (body.companyId) {
                companyId = body.companyId;
                console.log(`[INFO] Found companyId in parsed body: ${companyId}`);
            }
        } catch (e) {
            // Not valid JSON, ignore
        }
    }
    
    // Direct Lambda invocation without auth header
    if (!authHeader && !event.httpMethod) {
        console.log('[INFO] Processing direct lambda invocation without auth header');
        
        if (!companyId) {
            console.error('[ERROR] CompanyId is required for direct invocation');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'CompanyId is required', requestId })
            };
        }
        
        try {
            const assets = await getAssetsForCompany(companyId);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Assets retrieved successfully',
                    requestId,
                    assets
                })
            };
        } catch (error) {
            console.error(`[ERROR] Failed to get assets: ${error.message}`);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    message: 'Internal server error', 
                    error: error.message,
                    requestId 
                })
            };
        }
    }
    
    // Add debug logging to help troubleshoot header issues
    if (DEBUG_MODE) {
        console.log(`[DEBUG] Environment details:
        TABLE_NAME: ${TABLE_NAME}
        GSI_NAME: ${GSI_NAME}
        AWS_REGION: ${AWS_REGION}
        USER_POOL_ID: ${USER_POOL_ID || 'Not set'}
        IDENTITY_POOL_ID: ${IDENTITY_POOL_ID || 'Not set'}
        TOKEN_TYPE: ${TOKEN_TYPE}
        CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
        `);
        
        console.log(`[DEBUG] Headers: ${JSON.stringify(event.headers || {})}`);
        console.log(`[DEBUG] MultiValueHeaders: ${JSON.stringify(event.multiValueHeaders || {})}`);
        console.log(`[DEBUG] Auth header found: ${authHeader ? 'Yes' : 'No'}`);
    }
    
    // Below this point, we're handling API Gateway requests that need authentication
    
    // Check for missing authorization header
    if (!authHeader) {
        // As a fallback, try to find Authorization header in multiValueHeaders
        if (event.multiValueHeaders && event.multiValueHeaders.Authorization && event.multiValueHeaders.Authorization.length > 0) {
            authHeader = event.multiValueHeaders.Authorization[0];
            console.log('[INFO] Found Authorization in multiValueHeaders');
        } else if (event.multiValueHeaders && event.multiValueHeaders.authorization && event.multiValueHeaders.authorization.length > 0) {
            authHeader = event.multiValueHeaders.authorization[0];
            console.log('[INFO] Found authorization (lowercase) in multiValueHeaders');
        }
    }
    
    // Final check if auth header is still missing
    if (!authHeader) {
        console.error('[ERROR] Missing Authorization header');
        
        if (DEBUG_MODE) {
            // Log all headers for troubleshooting
            console.log(`[DEBUG] All headers: ${JSON.stringify(event.headers)}`);
            console.log(`[DEBUG] All multiValueHeaders: ${JSON.stringify(event.multiValueHeaders)}`);
        }
        
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Authorization token required', requestId })
        };
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        if (DEBUG_MODE) {
            console.log(`[DEBUG] Token first 20 chars: ${token.substring(0, 20)}...`);
            console.log(`[DEBUG] Token length: ${token.length}`);
        }
        
        console.log(`[INFO] Validating token: ${token.substring(0, 10)}...`);
        
        // Handle different token types
        try {
            const getUserCommand = new GetUserCommand({ AccessToken: token });
            const userInfo = await cognitoClient.send(getUserCommand);

            console.log(`[INFO] User info retrieved successfully`);
            const userAttributes = Object.fromEntries(
                (userInfo.UserAttributes || []).map(attr => [attr.Name, attr.Value])
            );

            const userId = userAttributes.sub;
            // Use provided companyId or get from user attributes
            const userCompanyId = companyId || userAttributes['custom:companyId'];
            console.log(`[INFO] User ID: ${userId}, Company ID: ${userCompanyId}`);
            
            if (!userCompanyId) {
                console.warn(`[WARNING] User ${userId} has no associated company`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'User has no associated company', requestId, assets: [] })
                };
            }

            // Get assets using the company ID
            const assets = await getAssetsForCompany(userCompanyId);
            
            const totalDuration = Date.now() - startTime;
            console.log(`[INFO] Total Lambda execution time: ${totalDuration}ms`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Assets retrieved successfully',
                    count: assets.length,
                    userId,
                    companyId: userCompanyId,
                    executionTime: totalDuration,
                    requestId,
                    assets
                })
            };
        } catch (tokenError) {
            // If the token might be an ID token instead of an access token
            if (tokenError.name === 'NotAuthorizedException' && TOKEN_TYPE === 'id_token') {
                console.log('[INFO] Access token validation failed, token might be an ID token');
                
                // For ID tokens, we can't use GetUserCommand, so we'll need to decode it
                try {
                    // Simple JWT decoding
                    const tokenParts = token.split('.');
                    if (tokenParts.length !== 3) {
                        throw new Error('Invalid JWT token format');
                    }
                    
                    // Decode the payload part (second part)
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                    
                    if (DEBUG_MODE) {
                        console.log(`[DEBUG] Decoded token payload: ${JSON.stringify(payload)}`);
                    }
                    
                    // Extract user information from ID token
                    const userId = payload.sub;
                    const userCompanyId = companyId || payload['custom:companyId'];
                    
                    console.log(`[INFO] User ID from ID token: ${userId}, Company ID: ${userCompanyId}`);
                    
                    if (!userCompanyId) {
                        console.warn(`[WARNING] User ${userId} has no associated company in ID token`);
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ message: 'User has no associated company', requestId, assets: [] })
                        };
                    }
                    
                    // Get assets using the company ID
                    const assets = await getAssetsForCompany(userCompanyId);
                    
                    const totalDuration = Date.now() - startTime;
                    console.log(`[INFO] Total Lambda execution time: ${totalDuration}ms`);
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            message: 'Assets retrieved successfully',
                            count: assets.length,
                            userId,
                            companyId: userCompanyId,
                            executionTime: totalDuration,
                            requestId,
                            assets
                        })
                    };
                } catch (decodeError) {
                    console.error(`[ERROR] Failed to decode ID token: ${decodeError.message}`);
                    throw decodeError;
                }
            } else {
                throw tokenError;
            }
        }
    } catch (e) {
        console.error(`[ERROR] ${e.name}: ${e.message}`);
        let statusCode = 500;
        let message = 'Internal server error';
        
        if (e.name === 'NotAuthorizedException') {
            statusCode = 401;
            message = 'Invalid or expired token';
        }
        
        return {
            statusCode,
            headers,
            body: JSON.stringify({
                message,
                error: e.message,
                errorName: e.name,
                requestId,
                executionTime: Date.now() - startTime
            })
        };
    }
};

// Helper function to get assets for a company
async function getAssetsForCompany(companyId) {
    try {
        console.log(`[INFO] Getting assets for company: ${companyId}`);
        
        // Try to use the GSI first
        try {
            const queryParams = {
                TableName: TABLE_NAME,
                IndexName: GSI_NAME,
                KeyConditionExpression: 'CompanyId = :companyId',
                ExpressionAttributeValues: { ':companyId': companyId }
            };

            console.log(`[INFO] Querying DynamoDB with GSI: ${GSI_NAME}`);
            const queryCommand = new QueryCommand(queryParams);
            const response = await dynamoDB.send(queryCommand);
            
            const assets = response.Items || [];
            console.log(`[INFO] Found ${assets.length} assets using GSI query`);
            return assets;
        } catch (e) {
            // If the GSI doesn't exist or there's another issue, fall back to scan
            if (e.name === 'ValidationException' && e.message.includes('IndexName')) {
                console.warn(`[WARNING] ${GSI_NAME} not found, falling back to scan`);
                const scanParams = {
                    TableName: TABLE_NAME,
                    FilterExpression: 'CompanyId = :companyId',
                    ExpressionAttributeValues: { ':companyId': companyId }
                };

                const scanCommand = new ScanCommand(scanParams);
                const response = await dynamoDB.send(scanCommand);
                
                const assets = response.Items || [];
                console.log(`[INFO] Found ${assets.length} assets using scan`);
                return assets;
            } else {
                throw e;
            }
        }
    } catch (error) {
        console.error(`[ERROR] Failed to query assets: ${error.message}`);
        throw error;
    }
}