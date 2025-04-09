# Lambda Deployment Instructions for PilotForce API

## Issue and Fix

You were experiencing errors with the Lambda functions because they were using ES module syntax (`import` statements) which isn't compatible with the AWS SDK in the way you were trying to use it. 

The main error was:
