# S3 Storage Setup Guide for Beginners

## Introduction

This guide will help you set up Amazon S3 (Simple Storage Service) to store and manage files for your PilotForce application. Even if you're new to cloud storage, this step-by-step guide will walk you through the process.

## What is Amazon S3?

Amazon S3 is a service that lets you store files in the cloud. Think of it as a giant, reliable hard drive in the cloud where you can store and retrieve any amount of data, anytime, from anywhere.

## Why We're Using S3

1. **Reliable**: Files are stored securely and redundantly
2. **Scalable**: You can store as much data as you need
3. **Affordable**: You pay only for what you use
4. **Fast**: Files can be accessed quickly from anywhere

## Step 1: Creating S3 Buckets

We'll create two S3 buckets:
- One for application assets (images, logos, etc.)
- One for user uploads (documents, profile pictures, etc.)

```bash
# Create a bucket for application assets (replace "my-pilotforce-assets" with a unique name)
aws s3 mb s3://my-pilotforce-assets --region us-east-1

# Create a bucket for user uploads (replace "my-pilotforce-uploads" with a unique name)
aws s3 mb s3://my-pilotforce-uploads --region us-east-1

# Remember these bucket names - you'll need them later
ASSETS_BUCKET=my-pilotforce-assets
UPLOADS_BUCKET=my-pilotforce-uploads

# For Windows Command Prompt, use this instead:
# set ASSETS_BUCKET=my-pilotforce-assets
# set UPLOADS_BUCKET=my-pilotforce-uploads

# For Windows PowerShell, use this instead:
# $env:ASSETS_BUCKET="my-pilotforce-assets"
# $env:UPLOADS_BUCKET="my-pilotforce-uploads"
```

> **Important**: S3 bucket names must be globally unique across all of AWS. If you get an error saying the bucket name is taken, try a different name with your company or username as a prefix.

## Step 2: Setting Up CORS for Your Buckets

CORS (Cross-Origin Resource Sharing) allows your frontend to directly upload files to S3.

```bash
# Create a CORS configuration file
echo '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "MaxAgeSeconds": 3000,
      "ExposeHeaders": ["ETag"]
    }
  ]
}' > cors-config.json

# Apply CORS configuration to both buckets
aws s3api put-bucket-cors \
  --bucket $ASSETS_BUCKET \
  --cors-configuration file://cors-config.json

aws s3api put-bucket-cors \
  --bucket $UPLOADS_BUCKET \
  --cors-configuration file://cors-config.json
```

This allows requests from your local development server (localhost:3000). For production, you would add your actual domain to AllowedOrigins.

## Step 3: Setting Up Bucket Permissions

### Asset Bucket (Public Read)

```bash
# Create a policy file for the assets bucket
echo '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForGetBucketObjects",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'$ASSETS_BUCKET'/*"
    }
  ]
}' > assets-policy.json

# Apply the policy to the assets bucket
aws s3api put-bucket-policy \
  --bucket $ASSETS_BUCKET \
  --policy file://assets-policy.json
```

This allows anyone to read files from your assets bucket, which is appropriate for images and other public assets.

### Uploads Bucket (Private)

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create a policy file for the uploads bucket
echo '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LimitedAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::'$ACCOUNT_ID':role/lambda-execution-role"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::'$UPLOADS_BUCKET'/*"
    }
  ]
}' > uploads-policy.json

# Apply the policy to the uploads bucket
aws s3api put-bucket-policy \
  --bucket $UPLOADS_BUCKET \
  --policy file://uploads-policy.json
```

This allows only your Lambda functions (using the lambda-execution-role) to access files in the uploads bucket, keeping user uploads secure.

## Step 4: Setting Up Encryption for Sensitive Data

It's a good practice to encrypt sensitive data:

```bash
# Enable default encryption for the uploads bucket
aws s3api put-bucket-encryption \
  --bucket $UPLOADS_BUCKET \
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

This ensures that all files uploaded to the uploads bucket are automatically encrypted.

## Step 5: Creating a Lambda Function for Generating Upload URLs

To allow users to upload files directly to S3, we'll create a Lambda function that generates pre-signed URLs:

```bash
# Create a file for our Lambda function
echo 'const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { fileName, fileType, directory = "uploads" } = body;
    
    // Get the user ID from the Cognito authorizer
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Create a unique file key
    const fileKey = `${directory}/${userId}/${uuidv4()}-${fileName}`;
    
    // Generate a pre-signed URL
    const s3Params = {
      Bucket: process.env.UPLOADS_BUCKET,
      Key: fileKey,
      ContentType: fileType,
      Expires: 300 // URL expires in 5 minutes
    };
    
    const uploadURL = s3.getSignedUrl("putObject", s3Params);
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({
        uploadURL,
        fileKey
      })
    };
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ error: "Error generating upload URL" })
    };
  }
};' > generate-upload-url.js

# Create a zip file for the Lambda function
# First, install the uuid dependency
npm install uuid
zip -r generate-upload-url.zip generate-upload-url.js node_modules/

# Create the Lambda function
aws lambda create-function \
  --function-name PilotForce-GenerateUploadURL \
  --runtime nodejs18.x \
  --handler generate-upload-url.handler \
  --role arn:aws:iam::$ACCOUNT_ID:role/lambda-execution-role \
  --zip-file fileb://generate-upload-url.zip \
  --environment "Variables={UPLOADS_BUCKET=$UPLOADS_BUCKET}"

# Create an API Gateway method for this Lambda function
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='PilotForce API'].id" --output text)
ASSETS_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/assets'].id" --output text)

# Create a URL endpoint resource
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ASSETS_RESOURCE_ID \
  --path-part "upload-url"

UPLOAD_URL_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/assets/upload-url'].id" --output text)

# Get your Cognito authorizer ID
AUTHORIZER_ID=$(aws apigateway get-authorizers --rest-api-id $API_ID --query "items[?name=='PilotForceCognitoAuthorizer'].id" --output text)

# Create a POST method for getting an upload URL
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $UPLOAD_URL_RESOURCE_ID \
  --http-method POST \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --request-parameters "method.request.header.Authorization=true"

# Connect the method to your Lambda function
REGION=$(aws configure get region)
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $UPLOAD_URL_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:PilotForce-GenerateUploadURL/invocations"

# Add method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $UPLOAD_URL_RESOURCE_ID \
  --http-method POST \
  --status-code 200

# Give API Gateway permission to invoke your Lambda function
aws lambda add-permission \
  --function-name PilotForce-GenerateUploadURL \
  --statement-id apigateway-post-upload-url \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/POST/api/v1/assets/upload-url"

# Enable CORS for the upload-url resource
# (Using the enable_cors function from the API Gateway guide)
```

This Lambda function generates a pre-signed URL that allows your frontend to upload files directly to S3 without exposing your AWS credentials.

## Step 6: Deploying Your Updated API

```bash
# Create a new deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name dev \
  --description "Added file upload functionality"
```

## Step 7: Creating a React Component for File Uploads

Now let's create a file upload component for your frontend:

```javascript
// src/components/FileUploader.js
import React, { useState } from 'react';
import { API } from 'aws-amplify';
import axios from 'axios';

function FileUploader({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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
      // 1. Get a pre-signed URL from your API
      const response = await API.post('PilotForceAPI', '/api/v1/assets/upload-url', {
        body: {
          fileName: file.name,
          fileType: file.type,
          directory: 'uploads'
        }
      });
      
      const { uploadURL, fileKey } = response;
      
      // 2. Upload the file directly to S3 using the pre-signed URL
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
      
      // 3. Call the success callback with the file key
      if (onUploadSuccess) {
        onUploadSuccess({
          fileKey,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        });
      }
      
      // Reset the form
      setFile(null);
      
      console.log('Upload successful');
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="file-uploader">
      <h3>Upload File</h3>
      {error && <div className="error-message">{error}</div>}
      
      <div className="file-input-container">
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading}
          className="file-input"
        />
        
        {file && (
          <div className="selected-file">
            <p>Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
          </div>
        )}
      </div>
      
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      )}
      
      {uploading && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
```

This component:
1. Lets users select a file
2. Gets a pre-signed URL from your API
3. Uploads the file directly to S3
4. Shows upload progress
5. Calls a callback function when the upload is complete

## Step 8: Creating a Lambda Function for Downloading Files

For files that aren't public, you'll need an API endpoint to generate download URLs:

```bash
# Create a file for our Lambda function
echo 'const AWS = require("aws-sdk");
const s3 = new AWS.S3();

exports.handler = async (event) => {
  try {
    // Get file key from query parameters
    const fileKey = event.queryStringParameters.key;
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Simple security check - ensure the file belongs to the user
    // This assumes files are stored with the user ID in the path
    if (!fileKey.includes(userId) && !isUserAdmin(event)) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify({ error: "Access denied to this file" })
      };
    }
    
    // Generate a pre-signed URL for downloading
    const s3Params = {
      Bucket: process.env.UPLOADS_BUCKET,
      Key: fileKey,
      Expires: 3600 // URL expires in 1 hour
    };
    
    const downloadURL = s3.getSignedUrl("getObject", s3Params);
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ downloadURL })
    };
  } catch (error) {
    console.error("Error generating download URL:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ error: "Error generating download URL" })
    };
  }
};

function isUserAdmin(event) {
  const groups = event.requestContext.authorizer.claims["cognito:groups"] || [];
  return groups.includes("Administrators");
}' > generate-download-url.js

# Create a zip file for the Lambda function
zip -r generate-download-url.zip generate-download-url.js

# Create the Lambda function
aws lambda create-function \
  --function-name PilotForce-GenerateDownloadURL \
  --runtime nodejs18.x \
  --handler generate-download-url.handler \
  --role arn:aws:iam::$ACCOUNT_ID:role/lambda-execution-role \
  --zip-file fileb://generate-download-url.zip \
  --environment "Variables={UPLOADS_BUCKET=$UPLOADS_BUCKET}"

# Create an API endpoint for this function
aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ASSETS_RESOURCE_ID \
  --path-part "download-url"

DOWNLOAD_URL_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/api/v1/assets/download-url'].id" --output text)

# Create a GET method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $DOWNLOAD_URL_RESOURCE_ID \
  --http-method GET \
  --authorization-type COGNITO_USER_POOLS \
  --authorizer-id $AUTHORIZER_ID \
  --request-parameters "method.request.header.Authorization=true,method.request.querystring.key=true"

# Connect the method to your Lambda function
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $DOWNLOAD_URL_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:PilotForce-GenerateDownloadURL/invocations"

# Add method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $DOWNLOAD_URL_RESOURCE_ID \
  --http-method GET \
  --status-code 200

# Give API Gateway permission to invoke your Lambda function
aws lambda add-permission \
  --function-name PilotForce-GenerateDownloadURL \
  --statement-id apigateway-get-download-url \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/GET/api/v1/assets/download-url"

# Enable CORS for the download-url resource
# (Using the enable_cors function from the API Gateway guide)

# Redeploy the API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name dev \
  --description "Added file download functionality"
```

## Step 9: Creating a React Component for Displaying Files

Now let's create a component to display files from S3:

```javascript
// src/components/FileViewer.js
import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';

function FileViewer({ fileKey }) {
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!fileKey) return;
    
    async function getFileUrl() {
      try {
        setLoading(true);
        // Get a download URL from your API
        const response = await API.get(
          'PilotForceAPI', 
          `/api/v1/assets/download-url?key=${encodeURIComponent(fileKey)}`
        );
        
        setFileUrl(response.downloadURL);
        setError('');
      } catch (err) {
        console.error('Error getting file URL:', err);
        setError('Could not load file: ' + (err.message || 'Unknown error'));
        setFileUrl('');
      } finally {
        setLoading(false);
      }
    }
    
    getFileUrl();
  }, [fileKey]);
  
  if (loading) return <div>Loading file...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!fileUrl) return <div>No file to display</div>;
  
  // Determine file type by the extension
  const extension = fileKey.split('.').pop().toLowerCase();
  
  // Display different content based on file type
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
    return <img src={fileUrl} alt="File preview" style={{ maxWidth: '100%' }} />;
  } else if (extension === 'pdf') {
    return (
      <iframe 
        src={fileUrl} 
        title="PDF Document" 
        width="100%" 
        height="500px" 
        style={{ border: 'none' }}
      />
    );
  } else if (['mp4', 'webm', 'ogg'].includes(extension)) {
    return (
      <video controls width="100%">
        <source src={fileUrl} type={`video/${extension}`} />
        Your browser does not support the video tag.
      </video>
    );
  } else {
    // For other file types, just offer a download link
    return (
      <div className="file-download">
        <p>
          File ready: <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
            Download {fileKey.split('/').pop()}
          </a>
        </p>
      </div>
    );
  }
}

export default FileViewer;
```

This component:
1. Takes a file key as a prop
2. Gets a download URL from your API
3. Displays the file appropriately based on its type (image, PDF, video, or download link)

## Step 10: Uploading Public Assets to Your Assets Bucket

For public assets like logos and images that are part of your application:

```bash
# Upload a sample image to your assets bucket
echo "This is a placeholder for a real image file" > logo.png
aws s3 cp logo.png s3://$ASSETS_BUCKET/images/logo.png --content-type image/png

# Get the public URL
echo "Your logo is available at: https://$ASSETS_BUCKET.s3.amazonaws.com/images/logo.png"
```

You can then use these assets in your React code like this:

```javascript
// In your React component
function Header() {
  return (
    <header>
      <img 
        src={`https://${process.env.REACT_APP_ASSETS_BUCKET}.s3.amazonaws.com/images/logo.png`} 
        alt="PilotForce Logo" 
      />
      <h1>PilotForce</h1>
    </header>
  );
}
```

## Step 11: Updating Your .env File

To keep your bucket names in your frontend code, add them to your .env file:

```
# Add to .env.local or .env file
REACT_APP_ASSETS_BUCKET=my-pilotforce-assets
REACT_APP_UPLOADS_BUCKET=my-pilotforce-uploads
```

## Step 12: Setting Up CloudFront (Optional)

For better performance and security, you can set up a CloudFront distribution in front of your S3 buckets:

```bash
# Create a CloudFront distribution for your assets bucket
aws cloudfront create-distribution \
  --origin-domain-name $ASSETS_BUCKET.s3.amazonaws.com \
  --default-root-object index.html \
  --query "Distribution.DomainName" \
  --output text

# Save the output domain name - this is your CloudFront URL
```

Then update your code to use the CloudFront URL instead of the direct S3 URL:

```javascript
// Instead of this:
const imageUrl = `https://${process.env.REACT_APP_ASSETS_BUCKET}.s3.amazonaws.com/images/logo.png`;

// Use this:
const imageUrl = `https://your-cloudfront-domain.cloudfront.net/images/logo.png`;
```

## Example: Using the File Components in Your Application

Here's an example of how to use these components in a profile page:

```javascript
// src/pages/ProfilePage.js
import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import FileViewer from '../components/FileViewer';

function ProfilePage() {
  const [profileImage, setProfileImage] = useState(null);
  
  const handleUploadSuccess = (fileInfo) => {
    setProfileImage(fileInfo.fileKey);
    
    // In a real app, you'd also update the user's profile in your database
    // to store the fileKey so it persists across page reloads
  };
  
  return (
    <div className="profile-page">
      <h1>Your Profile</h1>
      
      <div className="profile-section">
        <h2>Profile Picture</h2>
        
        {profileImage ? (
          <div className="profile-image-container">
            <FileViewer fileKey={profileImage} />
            <button onClick={() => setProfileImage(null)}>Change Picture</button>
          </div>
        ) : (
          <FileUploader onUploadSuccess={handleUploadSuccess} />
        )}
      </div>
      
      <div className="profile-details">
        <h2>Your Information</h2>
        {/* Other profile fields here */}
      </div>
    </div>
  );
}

export default ProfilePage;
```

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Access Denied" when accessing files | Check your bucket policies and CORS settings |
| Upload fails | Make sure your presigned URL hasn't expired and CORS is configured correctly |
| Can't see uploaded images | Verify the file path and bucket name are correct |
| Slow uploads for large files | Consider using the S3 multipart upload API for files over 10MB |

## Best Practices for S3 Usage

1. **Security**:
   - Always use presigned URLs for uploads/downloads from private buckets
   - Never expose AWS credentials in your frontend code
   - Set up appropriate bucket policies

2. **Performance**:
   - Use CloudFront for frequently accessed assets
   - Compress images before uploading when possible
   - For user uploads, validate file types and sizes on the client side

3. **Organization**:
   - Use a consistent folder structure (e.g., `/uploads/userId/fileId-filename.ext`)
   - Keep metadata about files in your database
   - Use different buckets for different types of data

## Next Steps

Now that you have S3 set up:

1. Create a file management interface for users to see their uploaded files
2. Set up image processing to create thumbnails or resize images
3. Implement file type validation and virus scanning for uploads
4. Move on to [Frontend Integration](/Users/alexh/Documents/Internship/PilotForce/docs/backend/frontend-integration.md) to connect everything together

## Resources for Further Learning

- [S3 Documentation](https://docs.aws.amazon.com/s3/)
- [S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS Amplify Storage Documentation](https://docs.amplify.aws/lib/storage/getting-started/q/platform/js/)