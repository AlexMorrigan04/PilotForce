# Authentication Setup for Beginners

## Introduction

This guide will help you set up user login and registration for your PilotForce application using AWS Cognito. Even if you're new to authentication systems, this step-by-step guide will walk you through the process.

## What is AWS Cognito?

AWS Cognito is a service that handles user sign-up, sign-in, and access control. Think of it as a complete user management system that you can add to your application without building everything from scratch.

## Why We're Using Cognito

1. **Security**: Cognito follows security best practices
2. **Scalability**: It can handle many users
3. **Features**: It provides email verification, password reset, and more
4. **Integration**: It works well with other AWS services we're using

## Step 1: Creating a User Pool

A User Pool is like a database of users for your app.

```bash
# First, create a file with our password requirements
echo '{
  "PasswordPolicy": {
    "MinimumLength": 8,
    "RequireUppercase": true,
    "RequireLowercase": true,
    "RequireNumbers": true,
    "RequireSymbols": false,
    "TemporaryPasswordValidityDays": 7
  }
}' > password-policy.json

# Create the User Pool
aws cognito-idp create-user-pool \
  --pool-name PilotForceUserPool \
  --policies file://password-policy.json \
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
    }
  ]' \
  --verification-message-template '{
    "DefaultEmailOption": "CONFIRM_WITH_CODE",
    "EmailMessage": "Your verification code is {####}.",
    "EmailSubject": "PilotForce - Verification code"
  }'

# Save the User Pool ID - you'll need it later
# Look for "Id" in the output and copy it
USER_POOL_ID=your-user-pool-id-from-the-output
echo "User Pool ID: $USER_POOL_ID"

# For Windows Command Prompt, use this instead:
# set USER_POOL_ID=your-user-pool-id-from-the-output

# For Windows PowerShell, use this instead:
# $env:USER_POOL_ID="your-user-pool-id-from-the-output"
```

This creates a user pool where:
- Passwords must be at least 8 characters, with uppercase, lowercase, and numbers
- Users must verify their email address
- We collect name and email (required) and phone number (optional)

## Step 2: Creating a User Pool Client

A User Pool Client represents your application that will connect to Cognito.

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
  --prevent-user-existence-errors ENABLED

# Save the App Client ID - you'll need it later
# Look for "ClientId" in the output and copy it
CLIENT_ID=your-client-id-from-the-output
echo "App Client ID: $CLIENT_ID"
```

This creates a client application that:
- Doesn't have a client secret (appropriate for browser-based applications)
- Uses secure authentication flows
- Has tokens that expire after 1 hour (but can refresh for up to 30 days)

## Step 3: Creating User Groups

User groups help you manage permissions in your app.

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

This creates three user groups:
- Administrators: Users with full access to all features
- Staff: Users with some administrative abilities
- Customers: Regular users of your application

## Step 4: Setting Up a Domain

Cognito needs a domain for hosting the login page and handling OAuth flows.

```bash
# Setup a domain for your User Pool
aws cognito-idp create-user-pool-domain \
  --domain pilotforce-auth \
  --user-pool-id $USER_POOL_ID

# The resulting login page will be at this URL:
echo "User Pool Login Page: https://pilotforce-auth.auth.us-east-1.amazoncognito.com/login?client_id=$CLIENT_ID&response_type=code&redirect_uri=http://localhost:3000/callback"
```

This creates a Cognito-hosted domain at pilotforce-auth.auth.us-east-1.amazoncognito.com.

> **Note**: If "pilotforce-auth" is already taken, try another name like "pilotforce-auth-app" or "my-pilotforce-auth".

## Step 5: Integrating with Your Frontend

Now you'll need to add Cognito to your React frontend. First, install the required packages:

```bash
# Navigate to your frontend project directory
cd /Users/alexh/Documents/Internship/PilotForce

# Install AWS Amplify libraries
npm install aws-amplify @aws-amplify/ui-react
```

Then, create a configuration file:

```javascript
// Create a file at src/aws-config.js with this content
const awsConfig = {
  Auth: {
    region: 'us-east-1',                                 // Replace with your region if different
    userPoolId: 'us-east-1_xxxxxxxx',                    // Replace with your User Pool ID
    userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',   // Replace with your App Client ID
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  }
};

export default awsConfig;
```

Make sure to replace:
- `us-east-1_xxxxxxxx` with your actual User Pool ID
- `xxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual App Client ID

Finally, initialize Amplify in your app:

```javascript
// Add this to your src/index.js file
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';

// Configure Amplify with your AWS resources
Amplify.configure(awsConfig);
```

## Step 6: Adding Login UI to Your React App

AWS Amplify provides pre-built UI components that you can use. Here's a simple login page:

```javascript
// Create a file at src/pages/Login.js
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    
    try {
      // Sign in the user
      const user = await Auth.signIn(username, password);
      console.log('Login success', user);
      
      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('Login error', err);
      setError(err.message);
    }
  };
  
  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Sign In</h2>
        {error && <div className="error">{error}</div>}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">Sign In</button>
        <div className="login-links">
          <a href="/signup">Create account</a> | 
          <a href="/forgot-password">Forgot password?</a>
        </div>
      </form>
    </div>
  );
}

export default Login;
```

## Step 7: Creating a Sign-Up Page

Here's a simple registration page to go with your login:

```javascript
// Create a file at src/pages/SignUp.js
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const navigate = useNavigate();
  
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
      navigate('/login');
    } catch (err) {
      console.error('Error confirming sign up:', err);
      setError(err.message);
    }
  };
  
  if (needsConfirmation) {
    return (
      <div className="signup-container">
        <form onSubmit={handleConfirmation} className="signup-form">
          <h2>Confirm Sign Up</h2>
          <p>We've sent a code to your email. Please enter it below.</p>
          {error && <div className="error">{error}</div>}
          <div className="form-group">
            <label>Confirmation Code</label>
            <input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="signup-button">Confirm</button>
        </form>
      </div>
    );
  }
  
  return (
    <div className="signup-container">
      <form onSubmit={handleSignUp} className="signup-form">
        <h2>Sign Up</h2>
        {error && <div className="error">{error}</div>}
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="signup-button">Sign Up</button>
        <div className="signup-links">
          <a href="/login">Already have an account? Sign in</a>
        </div>
      </form>
    </div>
  );
}

export default SignUp;
```

## Step 8: Checking If a User Is Logged In

To protect routes that require login:

```javascript
// Create a file at src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';

class ProtectedRoute extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      isLoading: true
    };
  }

  async componentDidMount() {
    try {
      await Auth.currentAuthenticatedUser();
      this.setState({ isAuthenticated: true, isLoading: false });
    } catch (error) {
      this.setState({ isAuthenticated: false, isLoading: false });
    }
  }

  render() {
    const { isAuthenticated, isLoading } = this.state;
    const { children } = this.props;

    if (isLoading) {
      return <div>Loading...</div>;
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
  }
}

export default ProtectedRoute;
```

Use this component in your routes:

```javascript
// In your routes file
import ProtectedRoute from './components/ProtectedRoute';

// Then in your routes definition
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

## Step 9: Updating Your .env File

To keep your configuration separate from your code, add these values to your .env file:

```
# Add to .env.local or .env file
REACT_APP_USER_POOL_ID=us-east-1_xxxxxxxx
REACT_APP_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_AWS_REGION=us-east-1
```

Then update your aws-config.js file to use these environment variables:

```javascript
// Update src/aws-config.js
const awsConfig = {
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH'
  }
};

export default awsConfig;
```

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "User is not confirmed" | The user hasn't verified their email address. They need to enter the verification code sent to their email. |
| "Password does not meet requirements" | Make sure passwords contain at least 8 characters, including uppercase, lowercase, and numbers. |
| "Username/client id combination not found" | Double-check your User Pool ID and App Client ID in your config. |
| "Network error" | Check your internet connection and make sure the Cognito endpoint is reachable. |

## Next Steps

Now that you have authentication set up:

1. Create a logout button using `Auth.signOut()`
2. Add a "Forgot Password" flow
3. Move on to the [API Gateway Configuration](/Users/alexh/Documents/Internship/PilotForce/docs/backend/api-gateway-configuration.md) to set up your API

## Resources for Further Learning

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [React Router Documentation](https://reactrouter.com/en/main) (for understanding the routing examples)
