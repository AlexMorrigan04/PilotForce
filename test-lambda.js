// Simple script to test direct Lambda invocation
// Run with: node test-lambda.js

const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: 'eu-north-1',
  // Add your credentials here or configure AWS CLI
});

// Initialize Lambda client
const lambda = new AWS.Lambda();

// Your companyId
const companyId = '96173b87-d836-4e54-b212-ef2f30c77762';

// Function to invoke Lambda
async function invokeGetAssets() {
  console.log('Testing Lambda invocation with companyId:', companyId);
  
  // Prepare Lambda parameters
  const params = {
    FunctionName: 'pilotforce-get-assets',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({ companyId })
  };
  
  try {
    console.log('Sending request to Lambda...');
    const response = await lambda.invoke(params).promise();
    
    console.log('Lambda response status:', response.StatusCode);
    
    // Parse the payload
    const payload = JSON.parse(response.Payload);
    console.log('Lambda response payload:', JSON.stringify(payload, null, 2));
    
    // If payload contains a body, try to parse it
    if (payload.body) {
      try {
        const body = JSON.parse(payload.body);
        console.log('Parsed body:', JSON.stringify(body, null, 2));
        
        if (body.assets) {
          console.log(`Found ${body.assets.length} assets`);
        }
      } catch (e) {
        console.error('Error parsing Lambda response body:', e);
      }
    }
  } catch (error) {
    console.error('Error invoking Lambda:', error);
  }
}

// Execute the function
invokeGetAssets().catch(err => {
  console.error('Unhandled error:', err);
});
