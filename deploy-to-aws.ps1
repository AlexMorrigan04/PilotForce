#!/usr/bin/env pwsh

# PilotForce - S3 Deployment Script
# This script builds the React app and deploys it to the specified S3 bucket

# Configuration
$BUCKET_NAME = "pilotforce-app"
$REGION = "eu-north-1"
$DISTRIBUTION_ID = "" # CloudFront distribution ID (if applicable)

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    # Save the current color
    $old = $host.UI.RawUI.ForegroundColor
    # Set the new color
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    # Write the output
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    # Restore the original color
    $host.UI.RawUI.ForegroundColor = $old
}

# Check AWS CLI is installed
try {
    $awsVersion = aws --version
    Write-ColorOutput Green "AWS CLI found: $awsVersion"
} catch {
    Write-ColorOutput Red "AWS CLI not found. Please install it: https://aws.amazon.com/cli/"
    exit 1
}

# Build the React app
Write-ColorOutput Cyan "Building React application..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "Build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-ColorOutput Green "Build completed successfully"

# Check if the build directory exists
if (-Not (Test-Path -Path ".\build")) {
    Write-ColorOutput Red "Build directory not found. Make sure your build outputs to a 'build' directory."
    exit 1
}

# Configure CORS for the S3 bucket
Write-ColorOutput Cyan "Configuring CORS policy for S3 bucket..."
$corsConfig = @'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
      "MaxAgeSeconds": 3000,
      "ExposeHeaders": ["ETag"]
    }
  ]
}
'@
$corsConfig | Out-File -FilePath ".\cors-config.json" -Encoding utf8 -Force

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json --region $REGION
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Yellow "Warning: Failed to set CORS policy. Continuing with deployment."
}

# Upload the build files to S3
Write-ColorOutput Cyan "Uploading files to S3 bucket: $BUCKET_NAME"

# HTML files - no cache
Write-ColorOutput Cyan "Uploading HTML files with no-cache..."
aws s3 sync .\build\ s3://$BUCKET_NAME/ --exclude "*" --include "*.html" --cache-control "no-cache, no-store, must-revalidate" --region $REGION

# JS and CSS files - cache for 1 year (hashed filenames)
Write-ColorOutput Cyan "Uploading JS and CSS assets with 1-year cache..."
aws s3 sync .\build\static\ s3://$BUCKET_NAME/static/ --cache-control "public, max-age=31536000" --region $REGION

# Other assets - cache for 1 day
Write-ColorOutput Cyan "Uploading other assets with 1-day cache..."
aws s3 sync .\build\ s3://$BUCKET_NAME/ --exclude "*.html" --exclude "static/*" --cache-control "public, max-age=86400" --region $REGION

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "Upload failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-ColorOutput Green "Deployment completed successfully!"
Write-ColorOutput White "Your app is available at: http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"

# Configure website hosting
Write-ColorOutput Cyan "Configuring S3 website hosting..."
aws s3 website s3://$BUCKET_NAME/ --index-document index.html --error-document index.html
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Yellow "Warning: Failed to configure website hosting. Please check your AWS permissions."
}

# Set bucket policy for public read access
Write-ColorOutput Cyan "Setting bucket policy for public access..."

$bucketPolicy = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET_NAME/*"
    }
  ]
}
'@
$bucketPolicy = $bucketPolicy -replace "BUCKET_NAME", $BUCKET_NAME
$bucketPolicy | Out-File -FilePath ".\s3-policy.json" -Encoding utf8 -Force
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://s3-policy.json --region $REGION
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Yellow "Warning: Failed to set bucket policy. Please check your AWS permissions."
}

# Invalidate CloudFront distribution cache if applicable
if ($DISTRIBUTION_ID) {
    Write-ColorOutput Cyan "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region $REGION
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Yellow "Warning: Failed to invalidate CloudFront cache."
    } else {
        Write-ColorOutput Green "CloudFront cache invalidation initiated!"
    }
}

Write-ColorOutput Green "===================================================="
Write-ColorOutput Green "Deployment Summary:"
Write-ColorOutput Green "S3 Bucket: $BUCKET_NAME"
Write-ColorOutput Green "Region: $REGION"
Write-ColorOutput Green "Website URL: http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"
Write-ColorOutput Green "===================================================="