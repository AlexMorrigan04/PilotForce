/**
 * Test script for Company Users Lambda function
 * Exactly matching API Gateway integration
 */

// Replace with your actual company ID
const companyId = "96173b87-d836-4e54-b212-ef2f30c77762";

module.exports = {
  // This format exactly matches how API Gateway invokes Lambda per your config
  apiGatewayEvent: {
    "resource": "/companies/{companyId}/users",
    "path": `/companies/${companyId}/users`,
    "httpMethod": "GET",
    "headers": {
      "Accept": "application/json",
      "Authorization": "Bearer YOUR_TOKEN_HERE"
    },
    "multiValueHeaders": {
      "Accept": ["application/json"],
      "Authorization": ["Bearer YOUR_TOKEN_HERE"]
    },
    "pathParameters": {
      "companyId": companyId
    },
    "stageVariables": null,
    "requestContext": {
      "resourcePath": "/companies/{companyId}/users",
      "httpMethod": "GET",
      "stage": "prod"
    },
    "body": null,
    "isBase64Encoded": false
  }
};
