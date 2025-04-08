/**
 * Helper file to test Cognito attribute formats
 * This demonstrates the correct format for Cognito attributes
 */

// This is how attributes should be formatted for the AWS SDK v3
const formatAttributesForSDKv3 = (attributes) => {
  // For AWS SDK v3 SignUp operation, attributes should be an array of { Name, Value } objects
  return Object.entries(attributes).map(([key, value]) => ({
    Name: key,
    Value: String(value)
  }));
};

// This is how attributes should be formatted for the AWS SDK v2
const formatAttributesForSDKv2 = (attributes) => {
  // For AWS SDK v2, attributes can be passed as an object
  return attributes;
};

// Example valid attributes for your schema
const getValidAttributes = () => {
  return {
    'email': 'test@example.com',
    'name': 'Test User',  // This standard attribute must be included
    'phone_number': '+447865746189',  // Standard attribute for phone number
    'custom:companyId': 'test-company-id',
    'custom:userRole': 'User'
  };
};

// Export these helpers
module.exports = {
  formatAttributesForSDKv3,
  formatAttributesForSDKv2,
  getValidAttributes
};
