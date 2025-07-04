import { Amplify } from 'aws-amplify';

const configureAmplify = () => {
  // Get environment variables
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const userPoolId = process.env.REACT_APP_USER_POOL_ID;
  const userPoolWebClientId = process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID;
  const apiEndpoint = process.env.REACT_APP_API_ENDPOINT;
  
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId || '',
        userPoolClientId: userPoolWebClientId || '',
        loginWith: {
          email: true,
          username: true
        }
      }
    },
    API: {
      REST: {
        pilotforce: {
          endpoint: apiEndpoint || process.env.REACT_APP_API_URL || '',
          region: awsRegion || 'eu-north-1',
        }
      }
    }
  });
};

export default configureAmplify;
