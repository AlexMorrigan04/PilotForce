"""
This script tests the API endpoints for company management
to verify they are accessible and functioning correctly.
"""
import requests
import json
import boto3
import os
from datetime import datetime
import time

# Base URL of your API Gateway
API_BASE_URL = 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com/prod'

def get_id_token():
    """
    Gets an ID token for authentication
    """
    try:
        # Use AWS SDK to get credentials
        cognito = boto3.client('cognito-idp', region_name='eu-north-1')
        
        # You'll need to provide these values
        username = input("Enter your username/email: ")
        password = input("Enter your password: ")
        client_id = input("Enter your Cognito client ID: ")
        
        response = cognito.initiate_auth(
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters={
                'USERNAME': username,
                'PASSWORD': password
            },
            ClientId=client_id
        )
        
        return response['AuthenticationResult']['IdToken']
    except Exception as e:
        print(f"Error getting ID token: {str(e)}")
        return None

def test_get_company_by_domain():
    """
    Tests the GET /companies/domain/{domain} endpoint
    """
    domain = input("Enter email domain to lookup (e.g., gmail.com): ")
    
    # Get the ID token
    id_token = get_id_token()
    
    if not id_token:
        print("Cannot proceed without authentication")
        return
    
    # Set up headers
    headers = {
        'Authorization': f'Bearer {id_token}',
        'Content-Type': 'application/json'
    }
    
    # Make the request
    try:
        response = requests.get(
            f"{API_BASE_URL}/companies/domain/{domain}",
            headers=headers
        )
        
        print(f"Status code: {response.status_code}")
        print(f"Response body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Successfully retrieved company!")
        else:
            print("❌ Failed to retrieve company")
    except Exception as e:
        print(f"Error calling API: {str(e)}")

def test_create_company():
    """
    Tests the POST /companies endpoint
    """
    domain = input("Enter email domain for new company (e.g., example.com): ")
    company_name = input("Enter company name (leave empty to derive from domain): ")
    
    # Get the ID token
    id_token = get_id_token()
    
    if not id_token:
        print("Cannot proceed without authentication")
        return
    
    # Set up headers
    headers = {
        'Authorization': f'Bearer {id_token}',
        'Content-Type': 'application/json'
    }
    
    # Set up request body
    body = {
        'EmailDomain': domain,
        'CompanyName': company_name
    }
    
    if not company_name:
        del body['CompanyName']
    
    # Make the request
    try:
        response = requests.post(
            f"{API_BASE_URL}/companies",
            headers=headers,
            json=body
        )
        
        print(f"Status code: {response.status_code}")
        print(f"Response body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code in [200, 201]:
            print("✅ Successfully created/found company!")
        else:
            print("❌ Failed to create company")
    except Exception as e:
        print(f"Error calling API: {str(e)}")

def test_register_with_company():
    """
    Tests the POST /companies/register endpoint
    """
    email = input("Enter email to register with company: ")
    
    # Get the ID token
    id_token = get_id_token()
    
    if not id_token:
        print("Cannot proceed without authentication")
        return
    
    # Set up headers
    headers = {
        'Authorization': f'Bearer {id_token}',
        'Content-Type': 'application/json'
    }
    
    # Set up request body
    body = {
        'email': email
    }
    
    # Make the request
    try:
        response = requests.post(
            f"{API_BASE_URL}/companies/register",
            headers=headers,
            json=body
        )
        
        print(f"Status code: {response.status_code}")
        print(f"Response body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Successfully registered with company!")
        else:
            print("❌ Failed to register with company")
    except Exception as e:
        print(f"Error calling API: {str(e)}")

if __name__ == "__main__":
    print("API Endpoint Testing Tool")
    print("=========================")
    print("1. Test GET company by domain")
    print("2. Test CREATE company")
    print("3. Test REGISTER with company")
    
    choice = input("Select a test to run (1-3): ")
    
    if choice == "1":
        test_get_company_by_domain()
    elif choice == "2":
        test_create_company()
    elif choice == "3":
        test_register_with_company()
    else:
        print("Invalid choice")
