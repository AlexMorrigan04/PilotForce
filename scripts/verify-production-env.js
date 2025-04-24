/**
 * Verify production environment configuration
 * Run this before deployment to check for common issues
 */
const fs = require('fs');
const path = require('path');

// Check if .env.production exists
const envPath = path.join(__dirname, '..', '.env.production');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env.production file missing');
  process.exit(1);
}

// Read .env.production file
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

// Required public environment variables
const requiredVars = [
  'REACT_APP_API_ENDPOINT',
  'REACT_APP_AWS_REGION',
  'REACT_APP_USER_POOL_ID',
  'REACT_APP_USER_POOL_WEB_CLIENT_ID',
  'REACT_APP_S3_BUCKET'
];

// Check if all required variables are present
const missingVars = requiredVars.filter(varName => {
  const pattern = new RegExp(`^${varName}=.+`);
  return !envLines.some(line => pattern.test(line));
});

if (missingVars.length > 0) {
  console.error('ERROR: Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Check for potentially sensitive information
const sensitiveVars = [
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'COGNITO_CLIENT_SECRET',
  'PASSWORD',
  'SECRET',
  'TEST_TOKEN'
];

const sensitiveFound = sensitiveVars.filter(varName => {
  return envLines.some(line => line.includes(varName));
});

if (sensitiveFound.length > 0) {
  console.error('WARNING: Potentially sensitive variables found:', sensitiveFound.join(', '));
  console.error('These should not be included in .env.production');
  process.exit(1);
}

// Check API URLs for HTTPS
const apiUrlLine = envLines.find(line => line.startsWith('REACT_APP_API_ENDPOINT='));
if (apiUrlLine && apiUrlLine.includes('http://')) {
  console.error('ERROR: API endpoint uses insecure HTTP protocol');
  process.exit(1);
}

console.log('✅ Production environment configuration looks good!');
