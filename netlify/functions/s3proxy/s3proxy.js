const AWS = require('aws-sdk');

exports.handler = async function(event) {
  // Parse query string parameters
  const params = event.queryStringParameters;
  const key = params.key;
  const bucket = params.bucket || 'drone-images-bucket';
  
  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameter: key' })
    };
  }
  
  // Configure AWS
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || process.env.REACT_APP_AWS_REGION
  });
  
  try {
    // Generate a signed URL with a longer expiration
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: 900 // 15 minutes
    });
    
    // Return redirect to the signed URL
    return {
      statusCode: 302,
      headers: {
        'Location': signedUrl,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      },
      body: ''
    };
  } catch (error) {
    console.log('Error generating signed URL:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate signed URL for S3 object' })
    };
  }
};
