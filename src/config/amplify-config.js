import { Auth } from 'aws-amplify';

const amplifyConfig = {
  Auth: {
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    mandatorySignIn: true,
    authenticationFlowType: 'USER_SRP_AUTH',
  },
  API: {
    endpoints: [
      {
        name: 'PilotForceAPI',
        endpoint: process.env.REACT_APP_API_ENDPOINT || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod',
        region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
        custom_header: async () => {
          return {
            Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
          };
        },
      },
    ],
  },
  Storage: {
    AWSS3: {
      bucket: process.env.REACT_APP_S3_BUCKET_NAME,
      region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
    },
  },
};

export default amplifyConfig;