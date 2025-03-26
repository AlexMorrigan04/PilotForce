import AWS from 'aws-sdk';

const configureAWS = async (userCredentials: any = null) => {
  if (userCredentials) {
    // Use credentials passed from authenticated session
    AWS.config.update({
      accessKeyId: userCredentials.accessKeyId,
      secretAccessKey: userCredentials.secretAccessKey,
      sessionToken: userCredentials.sessionToken,
      region: process.env.REACT_APP_AWS_REGION
    });
  } else {
    // Use IAM role credentials or environment variables as fallback
    AWS.config.update({
      region: process.env.REACT_APP_AWS_REGION
    });
    
    // For development environments only
    if (process.env.NODE_ENV === 'development') {
      AWS.config.update({
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
      });
    }
  }

  return {
    s3: new AWS.S3(),
    dynamoDb: new AWS.DynamoDB.DocumentClient(),
    region: process.env.REACT_APP_AWS_REGION
  };
};

export default configureAWS;
