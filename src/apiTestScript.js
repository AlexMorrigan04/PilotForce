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
  
  if (AUTH_TOKEN === 'TEST_TOKEN_REQUIRED') {
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
  
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      
      if (error.response) {
      } else {
      }
    }
  }
  
}

// Run the test
testApi().catch(err => {
});
