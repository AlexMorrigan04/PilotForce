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

    console.log("Fetching bookings for user ID:", userId, "and company ID:", companyId);
    const result = await docClient.query(params).promise();
    console.log("Bookings result:", result);
    return result.Items;
  } catch (error) {
    console.error("Error fetching bookings for user", userId, ":", error);
    throw error;
  }
};
