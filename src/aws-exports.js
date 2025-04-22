const awsmobile = {
    "aws_project_region": process.env.REACT_APP_AWS_REGION || "eu-north-1",
    "aws_cognito_region": process.env.REACT_APP_AWS_REGION || "eu-north-1",
    "aws_user_pools_id": process.env.REACT_APP_USER_POOL_ID || "",
    "aws_user_pools_web_client_id": process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID || "",
    "aws_appsync_graphqlEndpoint": process.env.REACT_APP_APPSYNC_ENDPOINT || "",
    "aws_appsync_region": process.env.REACT_APP_AWS_REGION || "eu-north-1",
    "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
    "aws_cloud_logic_custom": [
      {
        "name": "PilotForceAPI",
        "endpoint": process.env.REACT_APP_API_URL || process.env.REACT_APP_API_ENDPOINT || "",
        "region": process.env.REACT_APP_AWS_REGION || "eu-north-1"
      }
    ]
  };
  
  export default awsmobile;