import { Amplify } from 'aws-amplify';

// Configure Amplify with environment variables
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '', 
      loginWith: {
        username: true,
        email: true,
        oauth: {
          domain: process.env.REACT_APP_COGNITO_DOMAIN || '',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [process.env.REACT_APP_COGNITO_REDIRECT_URI || ''],
          redirectSignOut: [process.env.REACT_APP_COGNITO_REDIRECT_URI?.replace('/oauth-callback', '/') || ''],
          responseType: 'code'
        }
      }
    }
  }
});

export { Amplify };
