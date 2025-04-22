import { Amplify } from 'aws-amplify';

// Configure Amplify with environment variables
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '', 
      loginWith: {
        username: true,
        oauth: {
          domain: process.env.REACT_APP_COGNITO_DOMAIN || '',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [(process.env.REACT_APP_COGNITO_REDIRECT_URI || 'http://localhost:3000/')],
          redirectSignOut: [(process.env.REACT_APP_COGNITO_REDIRECT_URI || 'http://localhost:3000/')],
          responseType: 'code'
        }
      }
    }
  }
});

export { Amplify };
