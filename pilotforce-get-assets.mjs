import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB clients with specific configuration to handle numbers as strings
const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    // Convert empty strings, blobs to null
    convertEmptyValues: true,
    // Convert numbers to strings to avoid precision issues
    convertClassInstanceToMap: true
  },
  unmarshallOptions: {
    // Don't convert strings to numbers, which can cause precision issues
    wrapNumbers: true, 
  }
});

const ASSETS_TABLE = 'Assets';

/**
 * Helper function to process numbers in asset data for safe JSON serialization
 * @param {Object} asset - Asset data from DynamoDB
 * @returns {Object} - Processed asset data
 */
function processAssetForSerialization(asset) {
  // Create a copy to avoid modifying original data
  const processed = { ...asset };
  
  // Process possible numeric fields
  if (processed.Area !== undefined) {
    if (typeof processed.Area === 'object' && processed.Area.value !== undefined) {
      processed.Area = Number(processed.Area.value);
    }
  }
  
  return processed;
}

/**
 * Decode JWT token to extract payload
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
function decodeToken(token) {
  try {
    // Split the JWT token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Token does not have three parts');
      return null;
    }
    
    // Decode the payload (middle part)
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export const handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,DELETE'
  };
  
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }
  
  try {
    // Check if a specific asset ID is requested in the path
    const pathParameters = event.pathParameters || {};
    const assetId = pathParameters.id;
    
    if (assetId) {
      console.log(`Fetching specific asset with ID: ${assetId}`);
      
      // Query for the specific asset
      const scanCommand = new ScanCommand({
        TableName: ASSETS_TABLE,
        FilterExpression: 'AssetId = :assetId OR id = :assetId',
        ExpressionAttributeValues: {
          ':assetId': assetId
        }
      });
      
      const scanResponse = await docClient.send(scanCommand);
      const items = scanResponse.Items || [];
      
      if (items.length === 0) {
        console.log(`No asset found with ID: ${assetId}`);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: `Asset with ID ${assetId} not found` })
        };
      }
      
      console.log(`Found asset: ${JSON.stringify(items[0])}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(items[0])
      };
    }
    
    // Debug headers received
    console.log('Headers received:', JSON.stringify(event.headers || {}, null, 2));
    
    // Extract token from Authorization header - check both camel case and lowercase
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    console.log('Auth header:', authHeader);
    
    // Extract query parameters
    const queryParams = event.queryStringParameters || {};
    let companyId = queryParams.companyId;
    
    console.log('Query parameters:', queryParams);
    console.log(`Company ID from query: ${companyId}`);
    
    // If no companyId in query params, try to get it from the token
    if (!companyId && authHeader) {
      // Split token from 'Bearer ' prefix if present
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      console.log('Token extracted:', token ? `${token.substring(0, 20)}...` : 'null');
      
      // Decode token payload
      const tokenPayload = decodeToken(token);
      
      if (tokenPayload) {
        // Extract company ID from token
        companyId = tokenPayload['custom:companyId'];
        console.log(`Company ID from token: ${companyId}`);
      } else {
        console.log('Failed to decode token payload');
      }
    }
    
    // If we have a company ID, filter assets by it
    if (companyId) {
      console.log(`Querying assets for Company ID: ${companyId}`);
      
      try {
        // Try using GSI first
        const queryCommand = new QueryCommand({
          TableName: ASSETS_TABLE,
          IndexName: 'CompanyIdIndex',
          KeyConditionExpression: 'CompanyId = :companyId',
          ExpressionAttributeValues: {
            ':companyId': companyId
          }
        });
        
        // Log the actual query parameters for debugging
        console.log('DynamoDB Query parameters:', JSON.stringify({
          TableName: ASSETS_TABLE,
          IndexName: 'CompanyIdIndex',
          KeyConditionExpression: 'CompanyId = :companyId',
          ExpressionAttributeValues: {
            ':companyId': companyId
          }
        }));
        
        const queryResponse = await docClient.send(queryCommand);
        let assets = queryResponse.Items || [];
        
        console.log(`Found ${assets.length} assets using CompanyIdIndex`);
        
        // If no results, try with lowercase companyId
        if (assets.length === 0) {
          console.log('No results from GSI with CompanyId, trying with companyId (lowercase)');
          
          const lowercaseQueryCommand = new QueryCommand({
            TableName: ASSETS_TABLE,
            IndexName: 'companyIdIndex', // Try lowercase index name
            KeyConditionExpression: 'companyId = :companyId',
            ExpressionAttributeValues: {
              ':companyId': companyId
            }
          });
          
          try {
            const lowercaseResponse = await docClient.send(lowercaseQueryCommand);
            assets = lowercaseResponse.Items || [];
            console.log(`Found ${assets.length} assets using lowercase companyIdIndex`);
          } catch (lowercaseError) {
            console.log('Error with lowercase index query:', lowercaseError.message);
          }
        }
        
        // If still no results, try scanning with filter
        if (assets.length === 0) {
          console.log('No results from GSI queries, trying scan with filter');
          
          const scanCommand = new ScanCommand({
            TableName: ASSETS_TABLE,
            FilterExpression: 'CompanyId = :companyId OR companyId = :companyId',
            ExpressionAttributeValues: {
              ':companyId': companyId
            }
          });
          
          const scanResponse = await docClient.send(scanCommand);
          assets = scanResponse.Items || [];
          
          console.log(`Found ${assets.length} assets using scan with filter`);
        }
        
        // Process assets for safe serialization
        const processedAssets = assets.map(asset => processAssetForSerialization(asset));
        
        // Log a sample asset for debugging
        if (processedAssets.length > 0) {
          console.log('Sample processed asset:', JSON.stringify(processedAssets[0], null, 2));
        } else {
          console.log('No assets found after all query attempts');
        }
        
        // Return success with processed assets array
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(processedAssets)
        };
        
      } catch (queryError) {
        console.error('Error querying DynamoDB:', queryError);
        
        // Always try fallback scan as last resort
        try {
          console.log('Attempting fallback scan for all assets');
          const scanCommand = new ScanCommand({
            TableName: ASSETS_TABLE
          });
          
          const scanResponse = await docClient.send(scanCommand);
          const allAssets = scanResponse.Items || [];
          
          console.log(`Fallback scan found ${allAssets.length} total assets`);
          
          // Filter client-side by company ID
          const filteredAssets = allAssets.filter(asset => 
            asset.CompanyId === companyId || asset.companyId === companyId
          );
          
          console.log(`Filtered to ${filteredAssets.length} assets matching company ID`);
          
          // Process assets for safe serialization
          const processedFilteredAssets = filteredAssets.map(asset => 
            processAssetForSerialization(asset)
          );
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(processedFilteredAssets)
          };
        } catch (fallbackError) {
          console.error('Fallback scan also failed:', fallbackError);
          throw fallbackError; // Let the outer catch handle this
        }
      }
    }
    
    // If no company ID specified, return a limited set of assets
    console.log('No company ID provided, fetching limited assets');
    const scanCommand = new ScanCommand({
      TableName: ASSETS_TABLE,
      Limit: 100 // Limit for safety
    });
    
    const scanResponse = await docClient.send(scanCommand);
    const assets = scanResponse.Items || [];
    
    // Process assets for safe serialization
    const processedAssets = assets.map(asset => processAssetForSerialization(asset));
    
    console.log(`Returning ${processedAssets.length} processed assets (no company filter)`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(processedAssets)
    };
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: `Internal server error: ${error.message}`,
        error: error.stack
      })
    };
  }
};