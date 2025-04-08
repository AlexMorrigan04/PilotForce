/**
 * API Gateway Test Script
 * 
 * This script directly tests your Lambda function via API Gateway
 * Run with: node apiTestScript.js
 */

const axios = require('axios');

// Configuration constants
const API_URL = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod';
const BOOKING_ID = 'YOUR_BOOKING_ID_HERE'; // Replace with an actual booking ID
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with an actual token from localStorage

async function testApi() {
  console.log('🔍 API Gateway Test Script');
  console.log('==========================');
  
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
