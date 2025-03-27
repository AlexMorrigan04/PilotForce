const AWS = require('aws-sdk');

/**
 * Serverless function to proxy S3 requests
 * This helps avoid CORS issues and keeps credentials secure
 */
exports.handler = async function(event) {
  // Set CORS headers to allow requests from any origin
  // You can restrict this to specific domains in production
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  // Check if request method is GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  // Parse query string parameters
  const params = event.queryStringParameters || {};
  const key = params.key;
  const bucket = params.bucket || 'drone-images-bucket';
  
  if (!key) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required parameter: key' })
    };
  }
  
  // Check for expected environment variables
  const requiredEnvVars = [
    'REACT_APP_AWS_ACCESS_KEY_ID', 
    'REACT_APP_AWS_SECRET_ACCESS_KEY', 
    'REACT_APP_AWS_REGION'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing environment variable: ${envVar}`);
    }
  }
  
  try {
    // Configure AWS
    const s3 = new AWS.S3({
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      region: process.env.REACT_APP_AWS_REGION
    });
    
    console.log(`Processing S3 request for bucket: ${bucket}, key: ${key}`);
    
    try {
      // First, check if the object exists
      await s3.headObject({ Bucket: bucket, Key: key }).promise();
    } catch (headError) {
      console.log(`Object not found: ${key}`, headError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Image not found' })
      };
    }
    
    // Generate a signed URL with a reasonable expiration time
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: 900 // 15 minutes
    });
    
    console.log(`Generated signed URL for key: ${key}`);
    
    // For image files, try to serve directly for better performance
    if (key.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      try {
        // Get the object directly
        const s3Object = await s3.getObject({
          Bucket: bucket,
          Key: key
        }).promise();
        
        // Get content type or default to application/octet-stream
        const contentType = s3Object.ContentType || 'application/octet-stream';
        
        // Convert the body to base64
        const bodyBase64 = s3Object.Body.toString('base64');
        
        // Return success with the image data
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
          },
          body: bodyBase64,
          isBase64Encoded: true
        };
      } catch (directError) {
        console.log('Error getting object directly, falling back to redirect:', directError);
        // Fall back to redirect if direct serving fails
      }
    }
    
    // Return redirect to the signed URL if we couldn't serve directly
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': signedUrl,
        'Cache-Control': 'no-cache'
      },
      body: ''
    };
  } catch (error) {
    console.log('Error generating signed URL:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate signed URL for S3 object',
        details: error.message
      })
    };
  }
};
