import AWS from 'aws-sdk';

// Replace hardcoded AWS credentials with environment variables
const awsRegion = process.env.REACT_APP_AWS_REGION;
const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

// Update AWS config
AWS.config.update({
  accessKeyId: accessKey,
  secretAccessKey: secretKey,
  region: awsRegion
});

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
    
    const usersData = await dynamoDb.scan(usersParams).promise();
    const companyUserIds = usersData.Items?.map(item => item.UserId) || [];
    
    // If no company users found, just use the current user ID
    if (companyUserIds.length === 0) {
      companyUserIds.push(currentUserId);
    }
    
    return companyUserIds;
  } catch (error) {
    console.error('Error fetching company user IDs:', error);
    // Return just the current user ID as fallback
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