import AWS from 'aws-sdk';

AWS.config.update({
  region: 'eu-north-1',
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
});

const docClient = new AWS.DynamoDB.DocumentClient();

export const fetchBookingsForUser = async (userId: string, companyId: string) => {
  try {
    const params = {
      TableName: 'Bookings',
      KeyConditionExpression: 'CompanyId = :companyId AND UserId = :userId',
      ExpressionAttributeValues: {
        ':companyId': companyId,
        ':userId': userId
      }
    };

    const result = await docClient.query(params).promise();
    return result.Items;
  } catch (error) {
    throw error;
  }
};
