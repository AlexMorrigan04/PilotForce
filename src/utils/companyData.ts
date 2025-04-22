import AWS from 'aws-sdk';

// Replace hardcoded AWS credentials with environment variables
const awsRegion = process.env.REACT_APP_AWS_REGION;
const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

// Only update AWS config if all values are present
if (awsRegion && accessKey && secretKey) {
  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: awsRegion
  });
} else {
  console.warn('AWS credentials not fully specified in environment variables');
}

const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * Gets all user IDs for users in the same company (with the same email domain)
 * @param emailDomain The email domain to search for (e.g., "company.com")
 * @param currentUserId The current user's ID to include as fallback
 * @returns Array of user IDs from the same company
 */
export const getCompanyUserIds = async (emailDomain: string, currentUserId: string): Promise<string[]> => {
  try {
    const usersParams = {
      TableName: 'Users',
      FilterExpression: 'contains(Email, :domain)',
      ExpressionAttributeValues: {
        ':domain': `@${emailDomain}`
      }
    };

    // Check if we have necessary AWS credentials
    if (!awsRegion || !accessKey || !secretKey) {
      console.warn('Missing AWS credentials, returning only current user ID');
      return [currentUserId];
    }
    
    const result = await dynamoDb.scan(usersParams).promise();
    
    if (!result.Items || result.Items.length === 0) {
      console.log('No users found with domain:', emailDomain);
      return [currentUserId];
    }
    
    const userIds = result.Items.map(item => item.UserID || item.userId || item.UserId)
      .filter(Boolean) as string[];
      
    console.log(`Found ${userIds.length} users with domain ${emailDomain}`);
    
    // Always include current user ID in case it wasn't found in the query
    if (currentUserId && !userIds.includes(currentUserId)) {
      userIds.push(currentUserId);
    }
    
    return userIds;
  } catch (error) {
    console.error('Error getting company user IDs:', error);
    return [currentUserId];
  }
};

/**
 * Gets the company ID associated with an email domain
 * @param emailDomain The email domain to search for
 * @returns The company ID if found, null otherwise
 */
export const getCompanyIdFromDomain = async (emailDomain: string): Promise<string | null> => {
  try {
    // Look for an admin user with this domain to get the company ID
    const adminParams = {
      TableName: 'Users',
      FilterExpression: 'contains(Email, :domain) AND UserRole = :adminRole',
      ExpressionAttributeValues: {
        ':domain': `@${emailDomain}`,
        ':adminRole': 'AccountAdmin'
      }
    };
    
    const adminData = await dynamoDb.scan(adminParams).promise();
    if (adminData.Items && adminData.Items.length > 0) {
      // Return the company ID from the first admin user
      return adminData.Items[0].CompanyId;
    }
    
    // If no admin found, try to find any user with this domain
    const userParams = {
      TableName: 'Users',
      FilterExpression: 'contains(Email, :domain)',
      ExpressionAttributeValues: {
        ':domain': `@${emailDomain}`
      }
    };
    
    const userData = await dynamoDb.scan(userParams).promise();
    if (userData.Items && userData.Items.length > 0) {
      // Return the company ID from the first user
      return userData.Items[0].CompanyId;
    }
    
    // No users found with this domain
    return null;
  } catch (error) {
    console.error('Error getting company ID from domain:', error);
    return null;
  }
};

/**
 * Fetches all assets belonging to a company
 * @param companyId The company ID to fetch assets for
 * @returns Array of assets belonging to the company
 */
export const getAssetsForCompany = async (companyId: string): Promise<any[]> => {
  try {
    const assetsParams = {
      TableName: 'Assets',
      FilterExpression: 'CompanyId = :companyId',
      ExpressionAttributeValues: {
        ':companyId': companyId
      }
    };
    
    const assetsData = await dynamoDb.scan(assetsParams).promise();
    return assetsData.Items || [];
  } catch (error) {
    console.error(`Error fetching assets for company ${companyId}:`, error);
    return [];
  }
};

/**
 * Fetches all bookings belonging to a company
 * @param companyId The company ID to fetch bookings for
 * @returns Array of bookings belonging to the company
 */
export const getBookingsForCompany = async (companyId: string): Promise<any[]> => {
  try {
    const bookingsParams = {
      TableName: 'Bookings',
      FilterExpression: 'CompanyId = :companyId',
      ExpressionAttributeValues: {
        ':companyId': companyId
      }
    };
    
    const bookingsData = await dynamoDb.scan(bookingsParams).promise();
    return bookingsData.Items || [];
  } catch (error) {
    console.error(`Error fetching bookings for company ${companyId}:`, error);
    return [];
  }
};

// Original functions to maintain backward compatibility
export const getCompanyAssets = getCompanyUserIds;
export const getCompanyBookings = getCompanyUserIds;
export const getCompanyMediaCount = async (companyUserIds: string[]): Promise<number> => {
  let totalMedia = 0;
  
  for (const userId of companyUserIds) {
    try {
      const mediaParams = {
        TableName: 'ImageUploads',
        FilterExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };
      
      const mediaData = await dynamoDb.scan(mediaParams).promise();
      if (mediaData.Items) {
        totalMedia += mediaData.Items.length;
      }
    } catch (error) {
      console.error(`Error fetching media for user ${userId}:`, error);
    }
  }
  
  return totalMedia;
};

/**
 * Fetches all users for a specific company
 * @param companyId - The ID of the company to fetch users for
 * @returns {Promise<Array>} Array of user objects
 */
export async function getUsersByCompany(companyId: string) {
  try {
    console.log(`Fetching users for company: ${companyId}`);
    
    // Get all available auth credentials - enhanced with token support
    const username = localStorage.getItem('auth_username');
    const password = localStorage.getItem('auth_password');
    const idToken = localStorage.getItem('idToken');
    const tokensStr = localStorage.getItem('tokens');
    
    let tokenToUse = idToken;
    
    // If we have a tokens object stored, try to get idToken from it
    if (!tokenToUse && tokensStr) {
      try {
        const tokens = JSON.parse(tokensStr);
        if (tokens && tokens.idToken) {
          tokenToUse = tokens.idToken;
        }
      } catch (e) {
        console.error('Error parsing tokens object:', e);
      }
    }
    
    console.log(`Auth credentials available: username=${!!username}, password=${!!password}, token=${!!tokenToUse}`);
    
    // Create headers with the best available authentication method
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    let requestBody = null;
    
    if (tokenToUse) {
      console.log('Using token authentication for company users fetch');
      headers['Authorization'] = `Bearer ${tokenToUse}`;
    } else if (username && password) {
      console.log('Using username/password authentication for company users fetch');
      // For API Gateway, we need to send credentials in the body for POST requests
      requestBody = { username, password };
    } else {
      throw new Error('No authentication credentials available');
    }
    
    // First try with GET request (token auth)
    let response;
    let method = 'GET';
    
    if (tokenToUse) {
      console.log(`Making ${method} request to fetch company users`);
      try {
        response = await fetch(`https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/companies/${companyId}/users`, {
          method,
          headers
        });
      } catch (networkError) {
        console.error('Network error in first attempt:', networkError);
        // Retry with alternative endpoint if available
        response = await fetch(`https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/user?companyId=${companyId}`, {
          method,
          headers
        });
      }
    } else {
      // If no token but we have username/password, use POST instead
      method = 'POST';
      console.log(`Making ${method} request to fetch company users`);
      try {
        response = await fetch(`https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/companies/${companyId}/users`, {
          method,
          headers,
          body: JSON.stringify(requestBody)
        });
      } catch (networkError) {
        console.error('Network error in first attempt:', networkError);
        // Retry with alternative endpoint if available
        response = await fetch(`https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/user`, {
          method,
          headers,
          body: JSON.stringify({
            ...requestBody,
            companyId
          })
        });
      }
    }
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed company users fetch: ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch company users: ${response.status}`);
    }
    
    const responseText = await response.text();
    console.log(`Response text length: ${responseText.length}`);
    
    // Try to parse the response as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`Parsed response data type: ${typeof responseData}`);
      console.log(`Response data keys: ${Object.keys(responseData).join(', ')}`);
    } catch (e) {
      console.error('Error parsing response as JSON:', e);
      console.log('Raw response:', responseText.substring(0, 200) + '...');
      throw new Error('Error parsing server response');
    }
    
    // Handle different response formats
    let users = [];
    
    if (responseData.users) {
      console.log(`Found users array directly in response (count: ${responseData.users.length})`);
      users = responseData.users;
    } else if (responseData.body) {
      console.log('Found body property in response, attempting to parse...');
      let parsedBody;
      
      try {
        parsedBody = typeof responseData.body === 'string' 
          ? JSON.parse(responseData.body) 
          : responseData.body;
      } catch (parseError) {
        console.error('Error parsing body:', parseError);
        parsedBody = responseData.body;
      }
      
      console.log(`Parsed body type: ${typeof parsedBody}`);
      if (parsedBody && typeof parsedBody === 'object') {
        console.log(`Parsed body keys: ${Object.keys(parsedBody).join(', ')}`);
      }
        
      if (parsedBody.users) {
        console.log(`Found users array in parsed body (count: ${parsedBody.users.length})`);
        users = parsedBody.users;
      } else if (Array.isArray(parsedBody)) {
        console.log(`Body is an array, assuming it's the users array (count: ${parsedBody.length})`);
        users = parsedBody;
      }
    } else if (Array.isArray(responseData)) {
      console.log(`Response is an array, assuming it's the users array (count: ${responseData.length})`);
      users = responseData;
    }
    
    // Filter out invalid user objects
    // Define interface for user objects with various property naming conventions
    interface UserObject {
      // Required fields (at least one of these must exist)
      UserId?: string;
      userId?: string;
      username?: string;
      Username?: string;
      
      // Other possible fields (optional)
      [key: string]: any;
    }
    
    const validUsers: UserObject[] = users.filter((user: unknown): user is UserObject => 
      user !== null && typeof user === 'object' && 
      !!(user as UserObject).UserId || !!(user as UserObject).userId || 
      !!(user as UserObject).username || !!(user as UserObject).Username
    );
    
    console.log(`Final valid users array length: ${validUsers.length} (filtered from ${users.length})`);
    return validUsers;
  } catch (error) {
    console.error('Error fetching company users:', error);
    throw error;
  }
}