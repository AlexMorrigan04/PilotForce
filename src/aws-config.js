import { Amplify } from 'aws-amplify';

const configureAmplify = () => {
  // Debug environment variables
  console.log('REACT_APP_AWS_REGION:', process.env.REACT_APP_AWS_REGION);
  console.log('REACT_APP_USER_POOL_ID:', process.env.REACT_APP_USER_POOL_ID);
  console.log('REACT_APP_USER_POOL_WEB_CLIENT_ID:', process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID);
  
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.REACT_APP_USER_POOL_ID || 'eu-north-1_gejWyB4ZB',
        userPoolClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || 're4qc69mpbck8uf69jd53oqpa',
        loginWith: {
          email: true,
          username: true
        }
      }
    },
    API: {
      REST: {
        pilotforce: {
          endpoint: process.env.REACT_APP_API_ENDPOINT || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod',
          region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
        }
      }
    }
  });
};

export default configureAmplify;
