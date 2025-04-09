# Cognito Client Settings

You need to update your Cognito Client settings to enable the required authentication flows.

## Steps to Enable USER_PASSWORD_AUTH Flow

1. Go to the [AWS Console](https://console.aws.amazon.com/)
2. Navigate to Cognito service
3. Select your User Pool (`eu-north-1_gejWyB4ZB`)
4. Go to the "App integration" tab
5. Find the App client (`re4qc69mpbck8uf69jd53oqpa`) and click on it
6. Under "Authentication flows", check the box for "USER_PASSWORD_AUTH"
7. Click "Save changes"

## Required Authentication Flows

The Lambda functions require these authentication flows to be enabled:

- [x] USER_PASSWORD_AUTH - For direct username/password authentication
- [x] ADMIN_NO_SRP_AUTH (optional) - For admin authentication
- [x] REFRESH_TOKEN_AUTH - For token refreshing

## Updating App Client in AWS CLI

If you prefer to use AWS CLI, run the following command:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-north-1_gejWyB4ZB \
  --client-id re4qc69mpbck8uf69jd53oqpa \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_ADMIN_USER_PASSWORD_AUTH
```

## Related Lambda Functions

The following Lambda functions rely on these authentication flows:

1. `pilotforce_user.py` - For user data retrieval
2. `pilotforce_login.py` - For user login authentication
3. `index.js` - Combined authentication handler
