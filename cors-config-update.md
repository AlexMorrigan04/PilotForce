# CORS Configuration Update for API Gateway

## Issue
The current API Gateway configuration is causing CORS errors because the required headers are not properly allowed in the preflight response.

## Steps to Fix

1. Login to AWS Console and navigate to API Gateway
2. Select your PilotForceAPI
3. Go to Resources

### For the `/assets` endpoint:

1. Select the OPTIONS method
2. Click on Method Response
3. Expand the 200 response
4. Make sure the following headers are listed:
   - Access-Control-Allow-Headers
   - Access-Control-Allow-Methods
   - Access-Control-Allow-Origin

5. Go back to the OPTIONS method and click on Integration Response
6. Expand the default mapping
7. Update the Access-Control-Allow-Headers mapping to include all needed headers:
   ```
   'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Company-ID'
   ```

8. Click Save

### For all other endpoints with OPTIONS methods:

Repeat the same process to ensure consistent CORS configuration across your API.

### Deploy the API

1. Click on the "Actions" dropdown
2. Select "Deploy API"
3. Select the "prod" stage (or create a new one if needed)
4. Click "Deploy"

## Alternative: Update API via OpenAPI Specification

You can also update your OpenAPI specification JSON file and import it:

1. Modify the header configurations in your API specification to include 'X-Company-ID'
2. For example, find patterns like this and update them:
   ```json
   "responseParameters" : {
     "method.response.header.Access-Control-Allow-Methods" : "'GET,OPTIONS,POST'",
     "method.response.header.Access-Control-Allow-Headers" : "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
     "method.response.header.Access-Control-Allow-Origin" : "'*'"
   }
   ```

   Update to:
   ```json
   "responseParameters" : {
     "method.response.header.Access-Control-Allow-Methods" : "'GET,OPTIONS,POST'",
     "method.response.header.Access-Control-Allow-Headers" : "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Company-ID'",
     "method.response.header.Access-Control-Allow-Origin" : "'*'"
   }
   ```

3. Import the updated API definition

## Testing

After making these changes, test your API by:

1. Running your React application
2. Opening the browser dev tools
3. Checking the Network tab for API requests
4. Verify no CORS errors appear
