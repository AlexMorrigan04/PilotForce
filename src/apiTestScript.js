/**
 * API Gateway Test Script
 * 
 * This script directly tests your Lambda function via API Gateway
 * Run with: node apiTestScript.js
 */

const axios = require('axios');
require('dotenv').config(); // Add dotenv to load environment variables

// Configuration constants from environment variables
const API_URL = process.env.REACT_APP_API_ENDPOINT || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
// Use command line arguments or default test values
const BOOKING_ID = process.argv[2] || 'TEST_BOOKING_ID'; 
// Never hardcode tokens - get from environment or command line
const AUTH_TOKEN = process.argv[3] || process.env.TEST_AUTH_TOKEN || 'TEST_TOKEN_REQUIRED';

async function testApi() {
  console.log('🔍 API Gateway Test Script');
  console.log('==========================');
  
  if (AUTH_TOKEN === 'TEST_TOKEN_REQUIRED') {
    console.log('⚠️ WARNING: No auth token provided. Please provide a token as the second argument:');
    console.log('node apiTestScript.js <booking_id> <auth_token>');
    console.log('Or set the TEST_AUTH_TOKEN environment variable.');
    return;
  }
  
  // Test all possible endpoint variations
  const endpoints = [
    `${API_URL}/get-booking-details/${BOOKING_ID}`,        // Direct Lambda function
    `${API_URL}/bookings/${BOOKING_ID}`,                   // RESTful pattern
    `${API_URL}/get-bookings-details/${BOOKING_ID}`,       // Plural variant
    `${API_URL}/bookings?BookingId=${BOOKING_ID}`,         // Query param uppercase
    `${API_URL}/bookings?bookingId=${BOOKING_ID}`          // Query param lowercase
  ];
  
  console.log(`Testing endpoints for booking ID: ${BOOKING_ID}\n`);
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ SUCCESS: Status ${response.status}`);
      console.log(`Response data: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Response: ${JSON.stringify(error.response.data)}\n`);
      } else {
        console.log('No response received\n');
      }
    }
  }
  
  console.log('Test complete!');
}

// Run the test
testApi().catch(err => {
  console.error('Unhandled error:', err);
});
