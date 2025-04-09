// Use this script in AWS Lambda console to test the function properly

// Replace with your actual company ID
const companyId = "96173b87-d836-4e54-b212-ef2f30c77762";

const testEvent = {
  "path": `/companies/${companyId}/users`,
  "httpMethod": "GET",
  "headers": {
    "Authorization": "Bearer test-token" // Replace with a real token for actual API testing
  },
  "pathParameters": {
    "companyId": companyId
  },
  "queryStringParameters": null,
  "body": null
};

// In Lambda console, replace the test event with this JSON and click "Test"
console.log(JSON.stringify(testEvent, null, 2));
