#!/bin/bash

# Configuration - REPLACE THESE VALUES
S3_BUCKET="pilotforce-app"
CLOUDFRONT_DISTRIBUTION_ID="" # Leave empty if not using CloudFront
REGION="us-north-1" # Change to your region

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment to AWS...${NC}"

# 1. Build the React app
echo -e "\n${YELLOW}Building React application...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed! Exiting.${NC}"
  exit 1
fi
echo -e "${GREEN}Build completed successfully.${NC}"

# 2. Configure bucket for website hosting
echo -e "\n${YELLOW}Configuring S3 bucket for website hosting...${NC}"
aws s3 website s3://$S3_BUCKET/ --index-document index.html --error-document index.html --region $REGION
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to configure website hosting. Check if bucket exists and you have permissions.${NC}"
  exit 1
fi

# 3. Apply CORS configuration
echo -e "\n${YELLOW}Applying CORS configuration...${NC}"
aws s3api put-bucket-cors --bucket $S3_BUCKET --cors-configuration file://cors-config.json --region $REGION
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to apply CORS configuration.${NC}"
  exit 1
fi

# 4. Update bucket policy to allow public read
echo -e "\n${YELLOW}Updating bucket policy for public access...${NC}"
# First update the policy file with the correct bucket name
sed -i "s/YOUR-BUCKET-NAME/$S3_BUCKET/g" s3-policy.json
aws s3api put-bucket-policy --bucket $S3_BUCKET --policy file://s3-policy.json --region $REGION
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to update bucket policy. Make sure you have sufficient permissions.${NC}"
  exit 1
fi

# 5. Make sure bucket public access settings allow public access for website hosting
echo -e "\n${YELLOW}Configuring public access settings...${NC}"
aws s3api put-public-access-block --bucket $S3_BUCKET --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" --region $REGION
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to update public access settings.${NC}"
  exit 1
fi

# 6. Upload files with proper caching headers
echo -e "\n${YELLOW}Uploading build files to S3...${NC}"

# Upload HTML files with no-cache for always fresh content
aws s3 sync build/ s3://$S3_BUCKET/ --delete --cache-control "no-cache" --exclude "*" --include "*.html" --region $REGION

# Upload JS and CSS with long cache time (1 year)
aws s3 sync build/ s3://$S3_BUCKET/ --delete --cache-control "public, max-age=31536000" --exclude "*" --include "*.js" --include "*.css" --region $REGION

# Upload everything else with moderate cache time
aws s3 sync build/ s3://$S3_BUCKET/ --delete --cache-control "public, max-age=86400" --exclude "*.js" --exclude "*.css" --exclude "*.html" --region $REGION

if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to upload files to S3.${NC}"
  exit 1
fi

# 7. Invalidate CloudFront distribution if specified
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo -e "\n${YELLOW}Invalidating CloudFront cache...${NC}"
  aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --region $REGION
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to invalidate CloudFront cache.${NC}"
    exit 1
  fi
fi

echo -e "\n${GREEN}Deployment completed successfully!${NC}"

# Print the website URL
echo -e "\n${YELLOW}Your website is now available at:${NC}"
echo -e "${GREEN}http://$S3_BUCKET.s3-website-$REGION.amazonaws.com${NC}"

if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo -e "\n${YELLOW}To find your CloudFront URL, check the AWS Console or run:${NC}"
  echo -e "aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --query 'Distribution.DomainName' --output text"
fi

echo -e "\n${YELLOW}If you're still seeing 403 errors, please check:${NC}"
echo "1. The bucket policy is correctly applied"
echo "2. All public access block settings are disabled"
echo "3. The objects in your bucket have public-read permission"
echo "4. If using CloudFront, check Origin Access settings"