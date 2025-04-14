/**
 * This script updates the S3 bucket policy and CORS configuration
 * to ensure proper access to GeoTIFF files even after presigned URLs expire
 */

const { S3Client, PutBucketCorsCommand, GetBucketPolicyCommand, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// S3 bucket name
const BUCKET_NAME = 'pilotforce-resources';

// Configure AWS SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1', 
});

/**
 * Updates the CORS configuration for the S3 bucket
 * to ensure GeoTIFF files can be accessed from the web application
 */
const updateCorsConfiguration = async () => {
  try {
    console.log(`Updating CORS configuration for bucket: ${BUCKET_NAME}`);
    
    // Define new CORS configuration
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
          AllowedOrigins: ['*'], // In production, restrict this to your actual domains
          ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
          MaxAgeSeconds: 86400 // 1 day
        }
      ]
    };
    
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    
    // Apply CORS configuration
    const response = await s3Client.send(command);
    console.log('Successfully updated CORS configuration:', response);
    return true;
  } catch (error) {
    console.error('Error updating CORS configuration:', error);
    return false;
  }
};

/**
 * Updates the bucket policy to allow direct access to GeoTIFF files
 */
const updateBucketPolicy = async () => {
  try {
    console.log(`Updating bucket policy for: ${BUCKET_NAME}`);
    
    // Try to get current policy first
    let currentPolicy = {};
    try {
      const getPolicyCommand = new GetBucketPolicyCommand({
        Bucket: BUCKET_NAME
      });
      const policyResponse = await s3Client.send(getPolicyCommand);
      currentPolicy = JSON.parse(policyResponse.Policy || '{}');
    } catch (e) {
      // Policy might not exist yet
      console.log('No existing policy found or error fetching it:', e);
      currentPolicy = {
        Version: '2012-10-17',
        Statement: []
      };
    }
    
    // Define new policy to allow GetObject for GeoTIFF files
    const geotiffPolicy = {
      Sid: 'AllowGetGeoTIFFObjects',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: [
        `arn:aws:s3:::${BUCKET_NAME}/*/reassembled_geotiff_*`,
        `arn:aws:s3:::${BUCKET_NAME}/*/*.tif`
      ]
    };
    
    // Check if we need to add the new policy
    const existingPolicyIndex = currentPolicy.Statement?.findIndex(
      statement => statement.Sid === 'AllowGetGeoTIFFObjects'
    );
    
    if (existingPolicyIndex >= 0) {
      // Update existing policy
      currentPolicy.Statement[existingPolicyIndex] = geotiffPolicy;
    } else {
      // Add new policy
      if (!currentPolicy.Statement) {
        currentPolicy.Statement = [];
      }
      currentPolicy.Statement.push(geotiffPolicy);
    }
    
    // Apply the updated policy
    const putPolicyCommand = new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(currentPolicy)
    });
    
    const response = await s3Client.send(putPolicyCommand);
    console.log('Successfully updated bucket policy:', response);
    return true;
  } catch (error) {
    console.error('Error updating bucket policy:', error);
    return false;
  }
};

/**
 * Main execution function
 */
const main = async () => {
  console.log('=== S3 Bucket Configuration Update for GeoTIFF Access ===');
  
  // Update CORS configuration
  const corsResult = await updateCorsConfiguration();
  console.log('CORS configuration update:', corsResult ? 'SUCCESS' : 'FAILED');
  
  // Update bucket policy
  const policyResult = await updateBucketPolicy();
  console.log('Bucket policy update:', policyResult ? 'SUCCESS' : 'FAILED');
  
  console.log('===================================================');
  console.log('Next steps:');
  console.log('1. If the script succeeded, your GeoTIFF files should now be accessible');
  console.log('2. If you used "*" for AllowedOrigins, consider restricting it to your actual domains');
  console.log('3. Test accessing a GeoTIFF file directly using its path without query parameters');
};

// Run the script
main().catch(error => {
  console.error('Error executing script:', error);
  process.exit(1);
});