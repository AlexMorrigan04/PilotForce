import { Auth } from 'aws-amplify';

const amplifyConfig = {
  Auth: {
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    region: process.env.REACT_APP_AWS_REGION || '',
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
  },
  API: {
    endpoints: [
      {
        name: 'PilotForceAPI',
        endpoint: process.env.REACT_APP_API_ENDPOINT || '',
        region: process.env.REACT_APP_AWS_REGION || '',
        custom_header: async () => {
          try {
            const session = await Auth.currentSession();
            const token = session.getIdToken().getJwtToken();
            
            // Validate that we have a proper token
            if (!token) {
              return {};
            }

            // Ensure token is properly formatted
            return {
              Authorization: `Bearer ${token.trim()}`,
            };
          } catch (error) {
            // Return empty headers if we can't get a valid token
            return {};
          }
        },
      },
    ],
  },
  Storage: {
    AWSS3: {
      bucket: process.env.REACT_APP_S3_BUCKET_NAME,
      region: process.env.REACT_APP_AWS_REGION || '',
    },
  },
};

export default amplifyConfig;