/**
 * Fetches all users for a specific company
 * @param companyId - The ID of the company to fetch users for
 * @returns {Promise<Array>} Array of user objects
 */
export async function getUsersByCompany(companyId: string) {
  try {
    
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
      }
    }
    
    
    // Create headers with the best available authentication method
    let headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    let requestBody = null;
    
    if (tokenToUse) {
      headers['Authorization'] = `Bearer ${tokenToUse}`;
    } else if (username && password) {
      // For API Gateway, we need to send credentials in the body for POST requests
      requestBody = { username, password };
    } else {
      throw new Error('No authentication credentials available');
    }
    
    // First try with GET request (token auth)
    let response;
    let method = 'GET';
    const apiUrl = process.env.REACT_APP_API_URL || '';
    
    if (tokenToUse) {
      try {
        response = await fetch(`${apiUrl}/companies/${companyId}/users`, {
          method,
          headers
        });
      } catch (networkError) {
        // Retry with alternative endpoint if available
        response = await fetch(`${apiUrl}/user?companyId=${companyId}`, {
          method,
          headers
        });
      }
    } else {
      // If no token but we have username/password, use POST instead
      method = 'POST';
      try {
        response = await fetch(`${apiUrl}/companies/${companyId}/users`, {
          method,
          headers,
          body: JSON.stringify(requestBody)
        });
      } catch (networkError) {
        // Retry with alternative endpoint if available
        response = await fetch(`${apiUrl}/user`, {
          method,
          headers,
          body: JSON.stringify({
            ...requestBody,
            companyId
          })
        });
      }
    }
    
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch company users: ${response.status}`);
    }
    
    const responseText = await response.text();
    
    // Try to parse the response as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Error parsing server response');
    }
    
    // Handle different response formats
    let users = [];
    
    if (responseData.users) {
      users = responseData.users;
    } else if (responseData.body) {
      let parsedBody;
      
      try {
        parsedBody = typeof responseData.body === 'string' 
          ? JSON.parse(responseData.body) 
          : responseData.body;
      } catch (parseError) {
        parsedBody = responseData.body;
      }
      
      if (parsedBody && typeof parsedBody === 'object') {
      }
        
      if (parsedBody.users) {
        users = parsedBody.users;
      } else if (Array.isArray(parsedBody)) {
        users = parsedBody;
      }
    } else if (Array.isArray(responseData)) {
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
    
    return validUsers;
  } catch (error) {
    throw error;
  }
}

// Create mock data utility for testing and development when real AWS credentials aren't available
const createMockCompanyData = (companyId: string) => {
  return {
    CompanyId: companyId,
    Name: "Development Company",
    Status: "Active",
    Plan: "Professional",
    UserCount: 5,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    BillingEmail: "billing@example.com",
    BillingAddress: "123 Development St, Dev City",
    ContactPerson: "Dev User",
    ContactPhone: "+1234567890"
  };
};

/**
 * Fetches company information by ID directly from DynamoDB
 * @param companyId The company ID to fetch
 * @returns Company information object or null if not found
 */
export const getCompanyInfo = async (companyId: string): Promise<any> => {
  if (!companyId) {
    return null;
  }

  try {
    const token = localStorage.getItem('idToken');
    if (!token) {
        throw new Error("No auth token found");
    }
    const apiUrl = process.env.REACT_APP_API_URL || '';
    const response = await fetch(`${apiUrl}/companies/${companyId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if(!response.ok) {
        throw new Error("Failed to fetch company info");
    }
    
    const data = await response.json();
    return data.company || data;

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      return createMockCompanyData(companyId);
    }
    return null;
  }
};