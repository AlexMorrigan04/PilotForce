# Authentication Setup with AWS Cognito

## Introduction

This guide provides detailed instructions on how to implement user authentication in your PilotForce application using Amazon Cognito. AWS Cognito provides a robust, secure, and scalable user directory that can handle user registration, authentication, account recovery, and other identity management features.

## Architecture Overview

Your authentication architecture will consist of:

1. **Amazon Cognito User Pool**: Manages user registration, authentication, and user profiles
2. **Amazon Cognito Identity Pool** (optional): Provides temporary AWS credentials for accessing other AWS services directly from the client
3. **Lambda Triggers**: Customize authentication flows and user verification
4. **API Gateway Authorizers**: Validate tokens for API access
5. **Client Integration**: React frontend components for auth flows

## Setting Up Cognito User Pool

### 1. Create a User Pool

```bash
# Create a User Pool
aws cognito-idp create-user-pool \
  --pool-name PilotForceUserPool \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true,
      "TemporaryPasswordValidityDays": 7
    }
  }' \
  --auto-verify-attributes email \
  --schema '[
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Mutable": true,
      "Required": true
    },
    {
      "Name": "name",
      "AttributeDataType": "String",
      "Mutable": true,
      "Required": true
    },
    {
      "Name": "phone_number",
      "AttributeDataType": "String",
      "Mutable": true,
      "Required": false
    },
    {
      "Name": "custom:role",
      "AttributeDataType": "String",
      "Mutable": true,
      "Required": false
    }
  ]' \
  --admin-create-user-config '{
    "AllowAdminCreateUserOnly": false,
    "InviteMessageTemplate": {
      "EmailMessage": "Your PilotForce username is {username} and temporary password is {####}.",
      "EmailSubject": "Your temporary PilotForce password",
      "SMSMessage": "Your PilotForce username is {username} and temporary password is {####}."
    }
  }' \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "EmailMessage": "Your verification code is {####}.",
    "EmailSubject": "PilotForce - Verification code"
  }'

# Store the User Pool ID
USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 20 --query "UserPools[?Name=='PilotForceUserPool'].Id" --output text)
echo "User Pool ID: $USER_POOL_ID"
```

### 2. Create a User Pool Client

```bash
# Create an App Client
aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name PilotForceWebClient \
  --generate-secret false \
  --refresh-token-validity 30 \
  --access-token-validity 1 \
  --id-token-validity 1 \
  --token-validity-units '{
    "AccessToken": "hours",
    "IdToken": "hours",
    "RefreshToken": "days"
  }' \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --prevent-user-existence-errors ENABLED \
  --supported-identity-providers COGNITO

# Store the App Client ID
CLIENT_ID=$(aws cognito-idp list-user-pool-clients --user-pool-id $USER_POOL_ID --query "UserPoolClients[?ClientName=='PilotForceWebClient'].ClientId" --output text)
echo "App Client ID: $CLIENT_ID"
```

### 3. Configure User Pool Domain

```bash
# Set up a domain for your User Pool
aws cognito-idp create-user-pool-domain \
  --domain pilotforce-auth \
  --user-pool-id $USER_POOL_ID

echo "User Pool Login Page: https://pilotforce-auth.auth.us-east-1.amazoncognito.com/login?client_id=$CLIENT_ID&response_type=code&redirect_uri=https://yourapplication.com/callback"
```

## User Groups and Permissions

Set up user groups to manage permissions:

```bash
# Create Admin group
aws cognito-idp create-group \
  --group-name Administrators \
  --user-pool-id $USER_POOL_ID \
  --description "Administrator users with full access"

# Create Staff group
aws cognito-idp create-group \
  --group-name Staff \
  --user-pool-id $USER_POOL_ID \
  --description "Staff members with limited administrative access"

# Create Customers group
aws cognito-idp create-group \
  --group-name Customers \
  --user-pool-id $USER_POOL_ID \
  --description "Regular customers"
```

## Lambda Triggers for Enhanced Authentication Flow

### 1. Pre-Signup Validation

```javascript
// Lambda function to validate signup information
exports.handler = async (event, context) => {
  // Get the user attributes from the request
  const { email, "custom:role": userRole } = event.request.userAttributes;

  // Example business validation rules
  if (userRole === 'admin' || userRole === 'staff') {
    // Restrict creation of privileged accounts
    // This should be done through an admin account instead
    throw new Error("Cannot self-register as admin or staff");
  }

  // Email domain validation (optional)
  if (email.endsWith('@restricteddomain.com')) {
    throw new Error("Registration not allowed with this email domain");
  }

  // Return to Cognito
  return event;
};
```

### 2. Post-Confirmation Processing

```javascript
// Lambda function to process new confirmed users
exports.handler = async (event, context) => {
  // Get user attributes
  const { sub, email, name } = event.request.userAttributes;
  
  // Store user in your DynamoDB table
  const AWS = require('aws-sdk');
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
  
  const params = {
    TableName: 'PilotForce-Users',
    Item: {
      userId: sub,
      email: email,
      name: name,
      role: 'customer', // Default role
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  try {
    await dynamoDB.put(params).promise();
    console.log(`User ${sub} created in DynamoDB`);
    
    // Add user to the Customers group
    const cognito = new AWS.CognitoIdentityServiceProvider();
    await cognito.adminAddUserToGroup({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: 'Customers'
    }).promise();
    
    console.log(`User ${sub} added to Customers group`);
  } catch (error) {
    console.error('Error creating user record:', error);
    // Don't throw error, as we still want the user to be confirmed
  }
  
  return event;
};
```

## Setting Up API Gateway Authorizer with Cognito

### 1. Create a Cognito Authorizer

```bash
# First, get your API ID
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='PilotForce API'].id" --output text)

# Create the authorizer
aws apigateway create-authorizer \
  --rest-api-id $API_ID \
  --name PilotForceCognitoAuthorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns arn:aws:cognito-idp:$REGION:$ACCOUNT_ID:userpool/$USER_POOL_ID \
  --identity-source method.request.header.Authorization \
  --authorizer-result-ttl-in-seconds 300

# Get the authorizer ID
AUTHORIZER_ID=$(aws apigateway get-authorizers \
  --rest-api-id $API_ID \
  --query "items[?name=='PilotForceCognitoAuthorizer'].id" \
  --output text)
```

### 2. Apply the Authorizer to API Methods

```bash
# Apply to a specific method, e.g., GET /users/{userId}
RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query "items[?path=='/api/v1/users/{userId}'].id" \
  --output text)

aws apigateway update-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --patch-operations '[
    { 
      "op": "replace",
      "path": "/authorizationType",
      "value": "COGNITO_USER_POOLS"
    },
    {
      "op": "replace",
      "path": "/authorizerId",
      "value": "'$AUTHORIZER_ID'"
    }
  ]'
```

## Frontend Integration with AWS Amplify

AWS Amplify provides easy-to-use libraries for integrating Cognito authentication with React.

### 1. Install Required Packages

```bash
npm install aws-amplify @aws-amplify/ui-react
```

### 2. Configure Amplify in Your Application

```javascript
// src/index.js or App.js
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_xxxxxxxx',
    userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  },
  API: {
    endpoints: [
      {
        name: 'PilotForceAPI',
        endpoint: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev',
        custom_header: async () => {
          // Get the current session info
          const session = await Auth.currentSession();
          // Return the token in the format expected by API Gateway
          return { Authorization: session.getIdToken().getJwtToken() };
        }
      }
    ]
  }
});
```

### 3. Create Authentication Components

#### SignIn Component

```javascript
import React from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // Default styling

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to PilotForce</h1>
      </header>
      {/* Your authenticated application content */}
    </div>
  );
}

export default withAuthenticator(App);
```

#### Custom Authentication Forms

For more control over the authentication UI:

```javascript
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    
    try {
      const user = await Auth.signIn(username, password);
      console.log('Login success', user);
      // Redirect to home page or dashboard
    } catch (err) {
      console.error('Login error', err);
      setError(err.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Sign In</h2>
      {error && <div className="error">{error}</div>}
      <div>
        <label>Email</label>
        <input
          type="email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit">Sign In</button>
    </form>
  );
}

export default Login;
```

### 4. User Registration

```javascript
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  const handleSignUp = async (event) => {
    event.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name
        }
      });
      setNeedsConfirmation(true);
    } catch (err) {
      console.error('Error signing up:', err);
      setError(err.message);
    }
  };
  
  const handleConfirmation = async (event) => {
    event.preventDefault();
    setError('');
    
    try {
      await Auth.confirmSignUp(email, confirmationCode);
      // Redirect to login page or automatically sign in
      console.log('Confirmation successful');
    } catch (err) {
      console.error('Error confirming sign up:', err);
      setError(err.message);
    }
  };
  
  if (needsConfirmation) {
    return (
      <form onSubmit={handleConfirmation}>
        <h2>Confirm Sign Up</h2>
        <p>We've sent a code to your email. Please enter it below.</p>
        {error && <div className="error">{error}</div>}
        <div>
          <label>Confirmation Code</label>
          <input
            type="text"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
            required
          />
        </div>
        <button type="submit">Confirm</button>
      </form>
    );
  }
  
  return (
    <form onSubmit={handleSignUp}>
      <h2>Sign Up</h2>
      {error && <div className="error">{error}</div>}
      <div>
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit">Sign Up</button>
    </form>
  );
}

export default SignUp;
```

### 5. Making Authenticated API Calls

```javascript
import { API } from 'aws-amplify';

// Get user profile
async function getUserProfile(userId) {
  try {
    const response = await API.get('PilotForceAPI', `/api/v1/users/${userId}`);
    return response;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

// Create a booking
async function createBooking(bookingData) {
  try {
    const response = await API.post('PilotForceAPI', '/api/v1/bookings', {
      body: bookingData
    });
    return response;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}
```

## Security Considerations

### 1. Token Management

- Store tokens securely using browser's sessionStorage or localStorage
- Implement token refresh mechanism
- Set appropriate token expiration times

### 2. Attribute-Based Access Control

```javascript
// Example: Check user's groups before allowing access
import { Auth } from 'aws-amplify';

async function checkAdminAccess() {
  try {
    const session = await Auth.currentSession();
    const idToken = session.getIdToken();
    const groups = idToken.payload['cognito:groups'] || [];
    
    return groups.includes('Administrators');
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

// Then in your component
function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkAccess() {
      const hasAccess = await checkAdminAccess();
      setIsAdmin(hasAccess);
      setLoading(false);
    }
    
    checkAccess();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  if (!isAdmin) {
    return <div>Access denied. You need administrator privileges.</div>;
  }
  
  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin functionality */}
    </div>
  );
}
```

### 3. Password Recovery Flow

```javascript
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const requestCode = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await Auth.forgotPassword(email);
      setMessage('Check your email for the verification code');
      setStep(2);
    } catch (error) {
      console.error('Error requesting code:', error);
      setError(error.message);
    }
  };
  
  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await Auth.forgotPasswordSubmit(email, code, newPassword);
      setMessage('Password reset successfully. You can now log in with your new password.');
      setStep(3);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(error.message);
    }
  };
  
  return (
    <div>
      <h2>Reset Password</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="message">{message}</div>}
      
      {step === 1 && (
        <form onSubmit={requestCode}>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit">Request Code</button>
        </form>
      )}
      
      {step === 2 && (
        <form onSubmit={resetPassword}>
          <div>
            <label>Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Reset Password</button>
        </form>
      )}
      
      {step === 3 && (
        <div>
          <p>Your password has been reset successfully.</p>
          <button onClick={() => window.location.href = '/login'}>Go to Login</button>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;
```

## Best Practices and Common Issues

### 1. Handling Tokens

- Never store tokens in local variables or state that persists across page reloads
- Use secure context (HTTPS) for all authentication flows
- Clear tokens on logout

### 2. Error Handling

- Provide clear error messages for users
- Log authentication failures (but not sensitive information)
- Implement proper retry mechanisms

### 3. MFA Implementation

```javascript
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';

function SetupMFA() {
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const setupMFA = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const totpCode = await Auth.setupTOTP(user);
      const qrCodeURL = `otpauth://totp/PilotForce:${user.username}?secret=${totpCode}&issuer=PilotForce`;
      
      // Convert to QR code image URL (use a library like qrcode.react in a real app)
      setQrCode(qrCodeURL);
    } catch (error) {
      console.error('Error setting up MFA:', error);
      setError(error.message);
    }
  };
  
  const verifyMFA = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.verifyTotpToken(user, verificationCode);
      await Auth.setPreferredMFA(user, 'TOTP');
      
      setMessage('MFA setup complete!');
    } catch (error) {
      console.error('Error verifying MFA:', error);
      setError(error.message);
    }
  };
  
  return (
    <div>
      <h2>Setup Multi-Factor Authentication</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="message">{message}</div>}
      
      <button onClick={setupMFA}>Begin MFA Setup</button>
      
      {qrCode && (
        <div>
          <p>Scan this QR code with your authenticator app:</p>
          <img src={qrCode} alt="QR Code for MFA" />
          
          <div>
            <label>Verification Code</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
          </div>
          
          <button onClick={verifyMFA}>Verify and Activate</button>
        </div>
      )}
    </div>
  );
}

export default SetupMFA;
```

## Monitoring and Troubleshooting

### 1. CloudWatch Logs

Set up logging for Cognito events:

```bash
# Enable CloudWatch logs for Cognito User Pool
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --lambda-config '{
    "PreSignUp": "arn:aws:lambda:REGION:ACCOUNT_ID:function:pre-signup-validation",
    "PostConfirmation": "arn:aws:lambda:REGION:ACCOUNT_ID:function:post-confirmation-processing"
  }' \
  --user-pool-add-ons '{
    "AdvancedSecurityMode": "AUDIT"
  }'
```

### 2. Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "User is not confirmed" | User needs to verify their email with the code sent during registration |
| "Password does not meet requirements" | Ensure passwords comply with the policy (e.g., 8+ chars, numbers, symbols) |
| "Not authorized to perform this action" | Check IAM roles and permissions for the identity pool |
| Token expired | Implement refresh token logic or require re-login |
| CORS errors during login | Ensure your app domains are added to the allowed URLs in Cognito App Client settings |

## Next Steps

1. Implement a token refresh strategy
2. Add social identity providers (Google, Facebook, etc.)
3. Set up enhanced security features like risk-based authentication
4. Create admin portal for user management
5. Implement fine-grained access control based on user attributes
