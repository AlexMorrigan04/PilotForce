"""
This script updates the API Gateway configuration to properly call the Lambda function
with the correct name (pilotforce_company_management).
"""
import boto3
import json
import os
import argparse

def get_rest_api_id():
    """Get the REST API ID for PilotForceAPI"""
    apigateway = boto3.client('apigateway', region_name='eu-north-1')
    
    try:
        # List all REST APIs
        apis = apigateway.get_rest_apis()
        
        # Find PilotForceAPI
        for api in apis['items']:
            if api['name'] == 'PilotForceAPI':
                return api['id']
        
        print("PilotForceAPI not found")
        return None
    except Exception as e:
        print(f"Error getting REST APIs: {str(e)}")
        return None

def get_resource_ids(api_id):
    """Get resource IDs for company endpoints"""
    apigateway = boto3.client('apigateway', region_name='eu-north-1')
    
    try:
        # Get all resources for the API
        resources = apigateway.get_resources(restApiId=api_id)
        
        company_resources = {}
        
        # Find relevant resources
        for resource in resources['items']:
            path = resource.get('path', '')
            
            if '/companies' in path:
                company_resources[path] = resource['id']
                print(f"Found resource: {path} (ID: {resource['id']})")
        
        return company_resources
    except Exception as e:
        print(f"Error getting resources: {str(e)}")
        return {}

def update_lambda_integration(api_id, resource_id, http_method):
    """Update the Lambda integration to use pilotforce_company_management"""
    apigateway = boto3.client('apigateway', region_name='eu-north-1')
    
    try:
        # Get the current integration
        integration = apigateway.get_integration(
            restApiId=api_id,
            resourceId=resource_id,
            httpMethod=http_method
        )
        
        # Check if the integration is using the wrong Lambda function name
        current_uri = integration.get('uri', '')
        
        if 'pilotforce-company-management' in current_uri:
            # Update to use correct Lambda function name
            new_uri = current_uri.replace('pilotforce-company-management', 'pilotforce_company_management')
            
            # Update the integration
            apigateway.update_integration(
                restApiId=api_id,
                resourceId=resource_id,
                httpMethod=http_method,
                patchOperations=[
                    {
                        'op': 'replace',
                        'path': '/uri',
                        'value': new_uri
                    }
                ]
            )
            
            print(f"Updated integration for {http_method} on resource {resource_id}")
            return True
        else:
            print(f"Integration for {http_method} on resource {resource_id} already uses correct Lambda function")
            return False
    except Exception as e:
        print(f"Error updating integration for {http_method} on resource {resource_id}: {str(e)}")
        return False

def update_all_company_integrations():
    """Update all company endpoint integrations"""
    api_id = get_rest_api_id()
    
    if not api_id:
        print("Could not find API ID")
        return False
    
    print(f"Found API ID: {api_id}")
    
    company_resources = get_resource_ids(api_id)
    
    if not company_resources:
        print("No company resources found")
        return False
    
    updated = False
    
    # Update integrations for each resource
    for path, resource_id in company_resources.items():
        try:
            apigateway = boto3.client('apigateway', region_name='eu-north-1')
            
            # Get methods for this resource
            methods = apigateway.get_resource(
                restApiId=api_id,
                resourceId=resource_id
            ).get('resourceMethods', {})
            
            for method in methods:
                if method != 'OPTIONS':  # Skip OPTIONS methods
                    if update_lambda_integration(api_id, resource_id, method):
                        updated = True
        except Exception as e:
            print(f"Error processing resource {path}: {str(e)}")
    
    if updated:
        # Deploy the API to apply changes
        try:
            apigateway = boto3.client('apigateway', region_name='eu-north-1')
            
            # Create a deployment
            deployment = apigateway.create_deployment(
                restApiId=api_id,
                stageName='prod',
                description='Update Lambda function names'
            )
            
            print(f"Deployed API to prod stage")
            return True
        except Exception as e:
            print(f"Error deploying API: {str(e)}")
            return False
    else:
        print("No updates needed")
        return True

def upload_api_definition():
    """Upload the API definition from a file"""
    parser = argparse.ArgumentParser(description='Update API Gateway configuration')
    parser.add_argument('--definition', type=str, help='Path to API definition file')
    args = parser.parse_args()
    
    if not args.definition:
        print("Using default API definition file: apigateway-update.json")
        definition_file = 'apigateway-update.json'
    else:
        definition_file = args.definition
    
    # Check if file exists
    if not os.path.exists(definition_file):
        print(f"Definition file {definition_file} not found")
        return False
    
    try:
        # Load the API definition
        with open(definition_file, 'r') as f:
            definition = json.load(f)
        
        # Get the API ID
        api_id = get_rest_api_id()
        
        if not api_id:
            print("Could not find API ID")
            return False
        
        # Update the API
        apigateway = boto3.client('apigateway', region_name='eu-north-1')
        
        response = apigateway.put_rest_api(
            restApiId=api_id,
            mode='merge',
            body=json.dumps(definition).encode('utf-8')
        )
        
        print(f"API definition updated")
        
        # Deploy the API
        deployment = apigateway.create_deployment(
            restApiId=api_id,
            stageName='prod',
            description='Updated API definition'
        )
        
        print(f"Deployed API to prod stage")
        return True
    except Exception as e:
        print(f"Error updating API definition: {str(e)}")
        return False

if __name__ == "__main__":
    print("API Gateway Lambda Integration Update Tool")
    print("=========================================")
    print("1. Update all company endpoint integrations")
    print("2. Upload API definition from file")
    
    choice = input("Select an option (1-2): ")
    
    if choice == "1":
        update_all_company_integrations()
    elif choice == "2":
        upload_api_definition()
    else:
        print("Invalid choice")
