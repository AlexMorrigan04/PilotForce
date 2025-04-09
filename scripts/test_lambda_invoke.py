"""
This script directly invokes the Lambda function to test if it works correctly,
bypassing API Gateway to verify that the Lambda function itself is working.
"""
import boto3
import json
import time

# Initialize the Lambda client
lambda_client = boto3.client('lambda', region_name='eu-north-1')

def invoke_company_management_lambda(test_case="get_company_domain"):
    """
    Directly invoke the company management Lambda function
    """
    payload = None
    
    if test_case == "get_company_domain":
        # Test getting a company by domain
        payload = {
            "path": "/companies/domain/gmail.com",
            "httpMethod": "GET",
            "headers": {
                "Authorization": "Bearer YOUR_TOKEN_HERE"
            }
        }
    elif test_case == "create_company":
        # Test creating a company
        payload = {
            "path": "/companies",
            "httpMethod": "POST",
            "body": json.dumps({
                "EmailDomain": "testdomain.com",
                "CompanyName": "Test Company"
            }),
            "headers": {
                "Authorization": "Bearer YOUR_TOKEN_HERE"
            }
        }
    elif test_case == "register_company":
        # Test registering with a company
        payload = {
            "path": "/companies/register",
            "httpMethod": "POST",
            "body": json.dumps({
                "email": "test@testcompany.com"
            }),
            "headers": {
                "Authorization": "Bearer YOUR_TOKEN_HERE"
            }
        }
    
    print(f"Invoking Lambda with payload: {json.dumps(payload, indent=2)}")
    
    try:
        # Invoke the Lambda function
        response = lambda_client.invoke(
            FunctionName='pilotforce_company_management',
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        # Parse the response
        response_payload = json.loads(response['Payload'].read())
        
        print(f"Lambda response status code: {response_payload.get('statusCode')}")
        print(f"Lambda response headers: {json.dumps(response_payload.get('headers', {}), indent=2)}")
        
        # Parse the body if it exists
        if 'body' in response_payload:
            try:
                body = json.loads(response_payload['body'])
                print(f"Lambda response body: {json.dumps(body, indent=2)}")
            except:
                print(f"Lambda response body (raw): {response_payload['body']}")
        
        return response_payload
    except Exception as e:
        print(f"Error invoking Lambda: {str(e)}")
        return None

if __name__ == "__main__":
    print("Lambda Function Direct Invocation Test")
    print("=====================================")
    print("1. Test Get Company by Domain")
    print("2. Test Create Company")
    print("3. Test Register with Company")
    
    choice = input("Select a test (1-3): ")
    
    if choice == "1":
        invoke_company_management_lambda("get_company_domain")
    elif choice == "2":
        invoke_company_management_lambda("create_company")
    elif choice == "3":
        invoke_company_management_lambda("register_company")
    else:
        print("Invalid choice")
