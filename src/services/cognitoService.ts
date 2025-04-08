import { calculateSecretHash, getClientId, getClientSecret } from '../utils/cognitoUtils';

// Interface for standardized response
interface CognitoResponse {
  success: boolean;
  message?: string;
  userId?: string;
  isSignUpComplete?: boolean;
  tokens?: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
  };
  user?: any;
  [key: string]: any;
}

/**
 * Sign in a user directly with Cognito (bypassing API Gateway)
 */
const cognitoSignIn = async (username: string, password: string): Promise<CognitoResponse> => {
  try {
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    
    // Calculate the secret hash required by Cognito
    const secretHash = calculateSecretHash(username, clientId, clientSecret);
    
    const authParams = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash
      }
    };
    
    // Since we don't want to include the full AWS SDK in the client,
    // we'll use the API Gateway as a proxy for the Cognito authentication
    // Make a POST request to a simulated /login endpoint that calls Cognito
    
    // Endpoint is the same as API Gateway but with a special flag
    const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Direct-Cognito': 'true'
      },
      body: JSON.stringify({
        username,
        password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Authentication failed');
    }
    
    const data = await response.json();
    
    // Extract user information from the tokens if available
    let user = data.user;
    if (!user && data.tokens?.idToken) {
      // Parse JWT to get user data
      const payload = parseJwt(data.tokens.idToken);
      user = {
        id: payload.sub,
        username: payload['cognito:username'] || username,
        email: payload.email,
        name: payload.name
      };
    }
    
    return {
      success: true,
      tokens: data.tokens,
      user,
      message: 'Login successful'
    };
  } catch (error: any) {
    console.error('Direct Cognito sign-in error:', error);
    return {
      success: false,
      message: error.message || 'Failed to authenticate with Cognito'
    };
  }
};

/**
 * Sign up a user directly with Cognito
 */
const cognitoSignUp = async (
  username: string, 
  password: string, 
  attributes: Record<string, string>
): Promise<CognitoResponse> => {
  try {
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    
    // Calculate the secret hash required by Cognito
    const secretHash = calculateSecretHash(username, clientId, clientSecret);
    
    // CRITICAL FIX: Use standard Cognito attribute names instead of custom names
    // Cognito expects standard attribute names like "name" and "phone_number"
    const standardAttributes: Record<string, string> = {
      // Required standard attributes
      email: attributes.email || '',
      name: attributes['name.formatted'] || attributes.name || username,
      
      // Phone number (standard format)
      phone_number: attributes.phoneNumbers || attributes.phone_number || '+15555555555',
      
      // Custom attributes
      'custom:companyId': attributes['custom:companyId'] || '',
      'custom:userRole': attributes['custom:userRole'] || attributes['custom:role'] || 'User'
    };
    
    // Format attributes for Cognito API - this is CRITICAL
    // For AWS SDK v3, attributes must be an array of {Name, Value} objects
    const userAttributes = Object.entries(standardAttributes)
      .filter(([_, value]) => value !== '') // Remove empty values
      .map(([key, value]) => ({
        Name: key,
        Value: String(value) // Ensure all values are strings
      }));
    
    console.log('Sending correctly formatted Cognito attributes:', JSON.stringify(userAttributes, null, 2));
    
    // Use the API Gateway proxy with properly formatted attributes
    const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Direct-Cognito': 'true'
      },
      body: JSON.stringify({
        username,
        password,
        attributes: userAttributes, // Send properly formatted attributes
        secretHash
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Signup failed');
    }
    
    const data = await response.json();
    
    return {
      success: true,
      userId: data.userId || data.user?.id,
      isSignUpComplete: false,
      message: 'Sign-up successful. Please check your email for verification code.'
    };
  } catch (error: any) {
    console.error('Direct Cognito sign-up error:', error);
    return {
      success: false,
      message: error.message || 'Failed to sign up with Cognito'
    };
  }
};

/**
 * Confirm sign up directly with Cognito
 */
const cognitoConfirmSignUp = async (
  username: string, 
  confirmationCode: string
): Promise<CognitoResponse> => {
  try {
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    
    // Calculate the secret hash required by Cognito
    const secretHash = calculateSecretHash(username, clientId, clientSecret);
    
    // Use the API Gateway proxy
    const response = await fetch('https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod/confirm-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Direct-Cognito': 'true'
      },
      body: JSON.stringify({
        username,
        confirmationCode,
        secretHash
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Confirmation failed');
    }
    
    return {
      success: true,
      message: 'User confirmed successfully'
    };
  } catch (error: any) {
    console.error('Direct Cognito confirm sign-up error:', error);
    return {
      success: false,
      message: error.message || 'Failed to confirm registration'
    };
  }
};

/**
 * Decode JWT token to get payload data
 */
const parseJwt = (token: string): any => {
  try {
    // Split the token to get the payload
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode the base64 string
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return {};
  }
};

export default {
  cognitoSignIn,
  cognitoSignUp,
  cognitoConfirmSignUp
};
