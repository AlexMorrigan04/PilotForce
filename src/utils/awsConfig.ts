import AWS from 'aws-sdk';

// Initialize AWS with environment variables
const configureAWS = () => {
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

  AWS.config.update({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: awsRegion
  });

  return {
    s3: new AWS.S3({
      region: awsRegion,
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    }),
    dynamoDb: new AWS.DynamoDB.DocumentClient({
      region: awsRegion,
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    }),
    region: awsRegion
  };
};

export const awsServices = configureAWS();
export default configureAWS;
