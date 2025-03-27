# S3 Storage Configuration for PilotForce

## Introduction

Amazon S3 (Simple Storage Service) will be used for storing all static assets and user-uploaded files in the PilotForce application. This guide provides detailed instructions on setting up, configuring, and using S3 buckets securely with your React frontend and Lambda backend.

## S3 Architecture Overview

We'll set up the following S3 buckets:

1. **Asset Bucket**: For storing application assets (images, documents, videos)
2. **User Upload Bucket**: For securely handling user uploads
3. **Logs Bucket**: For storing access logs (optional but recommended)

## Setting Up S3 Buckets

### 1. Create Main Asset Bucket

```bash
# Create the main bucket for application assets
aws s3 mb s3://pilotforce-assets --region us-east-1

# Enable versioning (optional but recommended)
aws s3api put-bucket-versioning \
  --bucket pilotforce-assets \
  --versioning-configuration Status=Enabled
```

### 2. Create User Upload Bucket

```bash
# Create the user uploads bucket
aws s3 mb s3://pilotforce-user-uploads --region us-east-1

# Enable versioning for user uploads
aws s3api put-bucket-versioning \
  --bucket pilotforce-user-uploads \
  --versioning-configuration Status=Enabled
```

### 3. Create Logs Bucket (Optional)

```bash
# Create bucket for access logs
aws s3 mb s3://pilotforce-access-logs --region us-east-1

# Set lifecycle policy to expire logs after 90 days
cat > lifecycle-config.json << EOF
{
  "Rules": [
    {
      "ID": "ExpireLogs",
      "Status": "Enabled",
      "Prefix": "",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket pilotforce-access-logs \
  --lifecycle-configuration file://lifecycle-config.json
```

## Security Configuration

### 1. Bucket Policies

#### Asset Bucket Policy (Public Read Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForGetBucketObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pilotforce-assets/*"
    }
  ]
}
```

To apply this policy:

```bash
# Save the policy to a file
cat > asset-bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForGetBucketObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pilotforce-assets/*"
    }
  ]
}
EOF

# Apply the policy
aws s3api put-bucket-policy \
  --bucket pilotforce-assets \
  --policy file://asset-bucket-policy.json
```

#### User Upload Bucket Policy (Restricted Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAuthenticatedUploads",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:role/pilotforce-lambda-execution-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::pilotforce-user-uploads/*"
    }
  ]
}
```

To apply this policy:

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Save the policy to a file
cat > upload-bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAuthenticatedUploads",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::$ACCOUNT_ID:role/pilotforce-lambda-execution-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::pilotforce-user-uploads/*"
    }
  ]
}
EOF

# Apply the policy
aws s3api put-bucket-policy \
  --bucket pilotforce-user-uploads \
  --policy file://upload-bucket-policy.json
```

### 2. CORS Configuration for User Uploads

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "MaxAgeSeconds": 3000,
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

To apply CORS configuration:

```bash
# Save CORS configuration to a file
cat > cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "MaxAgeSeconds": 3000,
      "ExposeHeaders": ["ETag"]
    }
  ]
}
EOF

# Apply CORS configuration to both buckets
aws s3api put-bucket-cors \
  --bucket pilotforce-assets \
  --cors-configuration file://cors-config.json

aws s3api put-bucket-cors \
  --bucket pilotforce-user-uploads \
  --cors-configuration file://cors-config.json
```

### 3. Enable Access Logging

```bash
# Configure access logging
aws s3api put-bucket-logging \
  --bucket pilotforce-assets \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "pilotforce-access-logs",
      "TargetPrefix": "assets-logs/"
    }
  }'

aws s3api put-bucket-logging \
  --bucket pilotforce-user-uploads \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "pilotforce-access-logs",
      "TargetPrefix": "uploads-logs/"
    }
  }'
```

### 4. Server-Side Encryption

```bash
# Enable default encryption
aws s3api put-bucket-encryption \
  --bucket pilotforce-user-uploads \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

aws s3api put-bucket-encryption \
  --bucket pilotforce-assets \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

## Uploading Files to S3

### 1. Direct Browser Upload with Pre-signed URLs

The most secure way to handle user uploads is using pre-signed URLs. This allows users to upload directly to S3 without needing AWS credentials.

#### Lambda Function to Generate Pre-signed URLs

```javascript
// Lambda function to generate pre-signed upload URLs
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  try {
    // Get upload details from request
    const { fileName, fileType, directory = 'uploads' } = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Create a unique file key
    const fileKey = `${directory}/${userId}/${uuidv4()}-${fileName}`;
    
    // Generate a pre-signed URL
    const s3Params = {
      Bucket: 'pilotforce-user-uploads',
      Key: fileKey,
      ContentType: fileType,
      Expires: 300 // URL expires in 5 minutes
    };
    
    const uploadURL = s3.getSignedUrl('putObject', s3Params);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        uploadURL,
        fileKey
      })
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: 'Error generating upload URL' })
    };
  }
};
```

#### React Component for File Upload

```javascript
import React, { useState } from 'react';
import { API } from 'aws-amplify';
import axios from 'axios';

function FileUploader() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [error, setError] = useState('');
  
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setUploading(true);
    setProgress(0);
    setError('');
    
    try {
      // 1. Get pre-signed URL from your API
      const response = await API.post('PilotForceAPI', '/api/v1/assets/upload-url', {
        body: {
          fileName: file.name,
          fileType: file.type,
          directory: 'documents' // or 'images', 'videos', etc.
        }
      });
      
      const { uploadURL, fileKey } = response;
      
      // 2. Upload file directly to S3 using the pre-signed URL
      await axios.put(uploadURL, file, {
        headers: {
          'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });
      
      // 3. Get the public URL or record the file upload in your database
      const fileUrl = `https://pilotforce-user-uploads.s3.amazonaws.com/${fileKey}`;
      setUploadedFileUrl(fileUrl);
      
      // 4. Record the asset in your database
      await API.post('PilotForceAPI', '/api/v1/assets', {
        body: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          s3Key: fileKey,
          s3Url: fileUrl
        }
      });
      
      console.log('Upload successful');
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <h2>Upload File</h2>
      {error && <div className="error">{error}</div>}
      
      <div>
        <input type="file" onChange={handleFileChange} disabled={uploading} />
        <button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      
      {uploading && (
        <div>
          <progress value={progress} max="100" />
          <span>{progress}%</span>
        </div>
      )}
      
      {uploadedFileUrl && (
        <div>
          <p>File uploaded successfully!</p>
          <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer">
            View Uploaded File
          </a>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
```

### 2. File Processing with Lambda

For files that need processing after upload (e.g., image resizing, document parsing):

```javascript
// Lambda function triggered by S3 upload event
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const sharp = require('sharp'); // For image processing

exports.handler = async (event) => {
  try {
    // Get bucket and key information from the event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    
    // Get file metadata
    const s3Object = await s3.headObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    const contentType = s3Object.ContentType;
    
    // Process based on file type
    if (contentType.startsWith('image/')) {
      // Process image (e.g., create thumbnail)
      const originalImage = await s3.getObject({
        Bucket: bucket,
        Key: key
      }).promise();
      
      // Resize image to create thumbnail
      const thumbnail = await sharp(originalImage.Body)
        .resize(200, 200)
        .toBuffer();
      
      // Generate thumbnail key
      const thumbnailKey = key.replace(/^(.+)(\..+?)$/, '$1-thumbnail$2');
      
      // Upload thumbnail
      await s3.putObject({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: contentType
      }).promise();
      
      // Update asset record in DynamoDB
      const userId = key.split('/')[1]; // Assuming key format: directory/userId/filename
      const assetId = key.split('/')[2].split('-')[0]; // Assuming format: directory/userId/uuid-filename
      
      await dynamoDB.update({
        TableName: 'PilotForce-Assets',
        Key: { assetId },
        UpdateExpression: 'SET thumbnailKey = :thumbnailKey, thumbnailUrl = :thumbnailUrl, processedAt = :processedAt',
        ExpressionAttributeValues: {
          ':thumbnailKey': thumbnailKey,
          ':thumbnailUrl': `https://${bucket}.s3.amazonaws.com/${thumbnailKey}`,
          ':processedAt': new Date().toISOString()
        }
      }).promise();
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'File processed successfully' })
    };
  } catch (error) {
    console.error('Error processing file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error processing file' })
    };
  }
};
```

## Downloading and Displaying Files

### 1. Public Files

For publicly accessible files in the assets bucket:

```javascript
import React from 'react';

function ImageDisplay({ imageUrl }) {
  return (
    <div>
      <img 
        src={imageUrl} 
        alt="Asset" 
        style={{ maxWidth: '100%' }} 
      />
    </div>
  );
}

export default ImageDisplay;
```

### 2. Private Files with Pre-signed URLs

For private files that require authenticated access:

```javascript
import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';

function PrivateFileViewer({ fileKey }) {
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    async function getSignedUrl() {
      try {
        const response = await API.get('PilotForceAPI', `/api/v1/assets/download-url?key=${encodeURIComponent(fileKey)}`);
        setFileUrl(response.downloadURL);
      } catch (err) {
        console.error('Error getting download URL:', err);
        setError('Failed to get file access: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    getSignedUrl();
  }, [fileKey]);
  
  if (loading) return <div>Loading file...</div>;
  if (error) return <div className="error">{error}</div>;
  
  // Determine the file type to render it appropriately
  const fileExtension = fileKey.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
    return <img src={fileUrl} alt="File preview" style={{ maxWidth: '100%' }} />;
  } else if (['pdf'].includes(fileExtension)) {
    return (
      <iframe 
        src={fileUrl} 
        title="PDF Document" 
        width="100%" 
        height="600px" 
      />
    );
  } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
    return (
      <video controls width="100%">
        <source src={fileUrl} type={`video/${fileExtension}`} />
        Your browser does not support the video tag.
      </video>
    );
  } else {
    // For other file types, provide a download link
    return (
      <div>
        <p>File ready for download:</p>
        <a href={fileUrl} download>
          Download File
        </a>
      </div>
    );
  }
}

export default PrivateFileViewer;
```

### Lambda Function to Generate Download URLs

```javascript
// Lambda function to generate pre-signed download URLs
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  try {
    // Get file key from query parameters
    const fileKey = event.queryStringParameters.key;
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Check if user has access to this file
    // For this example, we'll check if the file key contains the user's ID
    // In a real application, you'd check against your database
    if (!fileKey.includes(userId) && !isUserAdmin(event)) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({ error: 'Access denied to this file' })
      };
    }
    
    // Generate a pre-signed URL for downloading
    const s3Params = {
      Bucket: 'pilotforce-user-uploads',
      Key: fileKey,
      Expires: 3600 // URL expires in 1 hour
    };
    
    const downloadURL = s3.getSignedUrl('getObject', s3Params);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ downloadURL })
    };
  } catch (error) {
    console.error('Error generating download URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: 'Error generating download URL' })
    };
  }
};

function isUserAdmin(event) {
  const groups = event.requestContext.authorizer.claims['cognito:groups'] || [];
  return groups.includes('Administrators');
}
```

## Content Delivery with CloudFront

For improved performance and security, set up a CloudFront distribution in front of your S3 buckets:

```bash
# Create CloudFront origin access identity
aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config CallerReference=pilotforce-assets,Comment="Access identity for PilotForce assets"

# Note the ID and Canonical User ID from the response
OAI_ID="E2QWRUHAPOMQZL"
OAI_S3_USER_ID="cd14b1afba5fb7f310c3f0a8bc490d8f32663e1ae5c26d4002ba12169a3f7e1ac3c5354e073c0ace3182460983e192b3"

# Update bucket policy to grant access to CloudFront OAI
cat > cf-bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "CanonicalUser": "$OAI_S3_USER_ID"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pilotforce-assets/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket pilotforce-assets \
  --policy file://cf-bucket-policy.json

# Create CloudFront distribution
cat > cf-distribution-config.json << EOF
{
  "CallerReference": "pilotforce-assets-$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": ["assets.yourdomain.com"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-pilotforce-assets",
        "DomainName": "pilotforce-assets.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/$OAI_ID"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-pilotforce-assets",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "DefaultTTL": 86400,
    "MinTTL": 0,
    "MaxTTL": 31536000,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    }
  },
  "PriceClass": "PriceClass_100",
  "Enabled": true,
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  }
}
EOF

aws cloudfront create-distribution \
  --distribution-config file://cf-distribution-config.json
```

After setting up CloudFront, update your application to use the CloudFront URL for assets:

```javascript
// Before: directly using S3
const imageUrl = `https://pilotforce-assets.s3.amazonaws.com/images/logo.png`;

// After: using CloudFront
const imageUrl = `https://assets.yourdomain.com/images/logo.png`;
```

## Handling File Deletion

```javascript
// Lambda function to delete files
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    // Get asset ID from path parameters
    const assetId = event.pathParameters.assetId;
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Get asset details from DynamoDB
    const getParams = {
      TableName: 'PilotForce-Assets',
      Key: { assetId }
    };
    
    const { Item: asset } = await dynamoDB.get(getParams).promise();
    
    if (!asset) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({ error: 'Asset not found' })
      };
    }
    
    // Check if user has permission to delete
    if (asset.userId !== userId && !isUserAdmin(event)) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({ error: 'You do not have permission to delete this asset' })
      };
    }
    
    // Delete the file from S3
    await s3.deleteObject({
      Bucket: 'pilotforce-user-uploads',
      Key: asset.s3Key
    }).promise();
    
    // Also delete thumbnail if it exists
    if (asset.thumbnailKey) {
      await s3.deleteObject({
        Bucket: 'pilotforce-user-uploads',
        Key: asset.thumbnailKey
      }).promise();
    }
    
    // Delete the asset record from DynamoDB
    const deleteParams = {
      TableName: 'PilotForce-Assets',
      Key: { assetId }
    };
    
    await dynamoDB.delete(deleteParams).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ message: 'Asset deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: 'Error deleting asset' })
    };
  }
};

function isUserAdmin(event) {
  const groups = event.requestContext.authorizer.claims['cognito:groups'] || [];
  return groups.includes('Administrators');
}
```

## Cleanup and Maintenance

### 1. Lifecycle Policies

```bash
# Create lifecycle policy for user uploads
cat > user-uploads-lifecycle.json << EOF
{
  "Rules": [
    {
      "ID": "DeleteTempUploads",
      "Status": "Enabled",
      "Prefix": "temp/",
      "Expiration": {
        "Days": 1
      }
    },
    {
      "ID": "MoveOldUploads",
      "Status": "Enabled",
      "Prefix": "uploads/",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket pilotforce-user-uploads \
  --lifecycle-configuration file://user-uploads-lifecycle.json
```

### 2. Setting Up Event Notifications

To trigger Lambda functions when files are uploaded:

```bash
# Create event notification configuration
cat > event-notification.json << EOF
{
  "LambdaFunctionConfigurations": [
    {
      "Id": "ProcessUploadedImages",
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:process-uploaded-image",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "prefix",
              "Value": "uploads/"
            },
            {
              "Name": "suffix",
              "Value": ".jpg"
            }
          ]
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-notification-configuration \
  --bucket pilotforce-user-uploads \
  --notification-configuration file://event-notification.json
```

## Monitoring and Troubleshooting

### 1. CloudWatch Metrics

```bash
# Create CloudWatch alarm for bucket size
aws cloudwatch put-metric-alarm \
  --alarm-name PilotForce-UserUploads-BucketSize \
  --alarm-description "Alarm when bucket size exceeds 5GB" \
  --metric-name BucketSizeBytes \
  --namespace AWS/S3 \
  --statistic Maximum \
  --period 86400 \
  --threshold 5368709120 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=BucketName,Value=pilotforce-user-uploads Name=StorageType,Value=StandardStorage \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:$ACCOUNT_ID:S3Alerts
```

### 2. Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| Access Denied | Check bucket policies, IAM permissions, and CORS settings |
| Slow Uploads | Consider using multipart uploads for large files |
| Failed Uploads | Implement retry logic in your frontend |
| Missing Files | Check lifecycle policies and deletion scripts |
| URL Expiration | Monitor pre-signed URL expiration, refresh as needed |

## Best Practices

1. **Security**:
   - Use pre-signed URLs for all user uploads and downloads
   - Implement strict bucket policies
   - Enable encryption for sensitive data
   - Regularly audit bucket permissions

2. **Performance**:
   - Use CloudFront for content delivery
   - Implement client-side image resizing before upload
   - Use multipart uploads for large files
   - Set appropriate cache headers

3. **Cost Optimization**:
   - Implement lifecycle policies to transition infrequently accessed data
   - Set up bucket size monitoring and alerts
   - Consider request pricing when designing your application
   - Use S3 Select for efficient data querying (if applicable)

4. **Resilience**:
   - Enable versioning for critical data
   - Consider cross-region replication for disaster recovery
   - Implement retry logic in your application
   - Test backup and restore procedures regularly

## Next Steps

1. Implement client-side validation and file type checking
2. Set up more advanced file processing (e.g., virus scanning, content moderation)
3. Create a file management UI for administrators
4. Integrate with a CDN like CloudFront for better performance
5. Implement backup and archival strategies for long-term storage
