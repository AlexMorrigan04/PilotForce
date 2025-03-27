#!/bin/bash

# Update S3 bucket CORS configuration to allow image access from Netlify
# Replace YOUR_NETLIFY_DOMAIN with your actual Netlify domain

BUCKET_NAME=drone-images-bucket

# Create CORS configuration file
cat > cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
      "MaxAgeSeconds": 3000,
      "ExposeHeaders": ["ETag", "Content-Type", "Content-Length"]
    }
  ]
}
EOF

echo "Applying CORS configuration to S3 bucket: $BUCKET_NAME"
aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json

echo "CORS configuration applied successfully!"
echo "Note: You may need to wait a few minutes for the changes to propagate."
