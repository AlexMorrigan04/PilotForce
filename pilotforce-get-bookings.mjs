import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB clients
const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);
const BOOKINGS_TABLE = 'Bookings';

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
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
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
    // Debug headers received
    console.log('Headers received:', JSON.stringify(event.headers || {}, null, 2));
    
    // Extract token from Authorization header - check both camel case and lowercase
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    console.log('Auth header:', authHeader);
    
    if (!authHeader) {
      console.log('No Authorization header found in request');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Authorization token required' })
      };
    }
    
    // Split token from 'Bearer ' prefix if present
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    console.log('Token extracted:', token ? `${token.substring(0, 20)}...` : 'null');
    
    // Decode token payload
    const tokenPayload = decodeToken(token);
    
    if (!tokenPayload) {
      console.log('Failed to decode token payload');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Invalid token' })
      };
    }
    
    // Extract user info from token
    const userId = tokenPayload.sub;
    let companyId = tokenPayload['custom:companyId'];
    const userRole = tokenPayload['custom:userRole'] || 'User';
    
    console.log(`User ID: ${userId}, Company ID: ${companyId}, Role: ${userRole}`);
    
    // Check for company ID in query params - these override token values
    const queryParams = event.queryStringParameters || {};
    if (queryParams.companyId) {
      companyId = queryParams.companyId;
      console.log(`Using company ID from query params: ${companyId}`);
    }
    
    if (!companyId) {
      console.log('No company ID found in token or query parameters');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Company ID not found in token or query parameters' })
      };
    }
    
    // Query using the GSI
    console.log(`Querying bookings for Company ID: ${companyId}`);
    
    try {
      // Try using GSI first
      const queryCommand = new QueryCommand({
        TableName: BOOKINGS_TABLE,
        IndexName: 'CompanyIdIndex',
        KeyConditionExpression: 'CompanyId = :companyId',
        ExpressionAttributeValues: {
          ':companyId': companyId
        }
      });
      
      // Log the actual query parameters for debugging
      console.log('DynamoDB Query parameters:', JSON.stringify({
        TableName: BOOKINGS_TABLE,
        IndexName: 'CompanyIdIndex',
        KeyConditionExpression: 'CompanyId = :companyId',
        ExpressionAttributeValues: {
          ':companyId': companyId
        }
      }));
      
      const queryResponse = await docClient.send(queryCommand);
      let bookings = queryResponse.Items || [];
      
      console.log(`Found ${bookings.length} bookings using CompanyIdIndex`);
      
      // If no results, try with lowercase companyId
      if (bookings.length === 0) {
        console.log('No results from GSI with CompanyId, trying with companyId (lowercase)');
        
        const lowercaseQueryCommand = new QueryCommand({
          TableName: BOOKINGS_TABLE,
          IndexName: 'companyIdIndex', // Try lowercase index name
          KeyConditionExpression: 'companyId = :companyId',
          ExpressionAttributeValues: {
            ':companyId': companyId
          }
        });
        
        try {
          const lowercaseResponse = await docClient.send(lowercaseQueryCommand);
          bookings = lowercaseResponse.Items || [];
          console.log(`Found ${bookings.length} bookings using lowercase companyIdIndex`);
        } catch (lowercaseError) {
          console.log('Error with lowercase index query:', lowercaseError.message);
        }
      }
      
      // If still no results, try scanning with filter
      if (bookings.length === 0) {
        console.log('No results from GSI queries, trying scan with filter');
        
        const scanCommand = new ScanCommand({
          TableName: BOOKINGS_TABLE,
          FilterExpression: 'CompanyId = :companyId OR companyId = :companyId',
          ExpressionAttributeValues: {
            ':companyId': companyId
          }
        });
        
        const scanResponse = await docClient.send(scanCommand);
        bookings = scanResponse.Items || [];
        
        console.log(`Found ${bookings.length} bookings using scan with filter`);
      }
      
      // Log a sample booking for debugging
      if (bookings.length > 0) {
        console.log('Sample booking:', JSON.stringify(bookings[0], null, 2));
      } else {
        console.log('No bookings found after all query attempts');
      }
      
      // Return success with bookings array, even if empty
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: bookings.length > 0 ? 'Bookings retrieved successfully' : 'No bookings found',
          bookings: bookings
        })
      };
      
    } catch (queryError) {
      console.error('Error querying DynamoDB:', queryError);
      
      // Always try fallback scan as last resort
      try {
        console.log('Attempting fallback scan for all bookings');
        const scanCommand = new ScanCommand({
          TableName: BOOKINGS_TABLE
        });
        
        const scanResponse = await docClient.send(scanCommand);
        const allBookings = scanResponse.Items || [];
        
        console.log(`Fallback scan found ${allBookings.length} total bookings`);
        
        // Filter client-side by company ID
        const filteredBookings = allBookings.filter(booking => 
          booking.CompanyId === companyId || booking.companyId === companyId
        );
        
        console.log(`Filtered to ${filteredBookings.length} bookings matching company ID`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Bookings retrieved using fallback method',
            bookings: filteredBookings
          })
        };
      } catch (fallbackError) {
        console.error('Fallback scan also failed:', fallbackError);
        throw fallbackError; // Let the outer catch handle this
      }
    }
    
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