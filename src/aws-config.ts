import { Amplify } from 'aws-amplify';

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || '',
      loginWith: {
        email: true,
        username: true
      }
    }
  },
  API: {
    REST: {
      PilotForceAPI: {
        endpoint: 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod',
        region: 'eu-north-1'
      }
    }
  },
  Storage: {
    S3: {
      bucket: process.env.REACT_APP_S3_BUCKET_NAME || '',
      region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
    }
  }
};

const configureAmplify = () => {
  Amplify.configure(awsConfig);
};

export default configureAmplify;
