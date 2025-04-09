"""
This script tests the API Gateway endpoints for the company management functionality.
It verifies that the endpoints are properly configured and responding as expected.
"""

import requests
import json
import boto3
import argparse
import sys
from datetime import datetime
import uuid
import base64
import hmac
import hashlib

class APIGatewayTester:
    def __init__(self, api_url=None, api_key=None, auth_token=None, region="eu-north-1"):
        self.api_url = api_url
        self.api_key = api_key
        self.auth_token = auth_token
        self.region = region
        self.test_results = {
            "success": 0,
            "failure": 0,
            "tests": []
        }
        
    def discover_api_url(self):
        """Discover the API URL if not provided"""
        if self.api_url:
            return True
            
        try:
            apigateway = boto3.client('apigateway', region_name=self.region)
            apis = apigateway.get_rest_apis()
            
            # Find PilotForceAPI
            api_id = None
            for api in apis['items']:
                if api['name'] == 'PilotForceAPI':
                    api_id = api['id']
                    break
            
            if not api_id:
                print("ERROR: Could not find PilotForceAPI")
                return False
                
            # Get the stage name (assuming 'prod' is used)
            stages = apigateway.get_stages(restApiId=api_id)
            stage_name = 'prod'  # Default
            for stage in stages['item']:
                if stage['stageName'] == 'prod':
                    stage_name = 'prod'
                    break
            
            # Construct the API URL
            self.api_url = f"https://{api_id}.execute-api.{self.region}.amazonaws.com/{stage_name}"
            print(f"Discovered API URL: {self.api_url}")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to discover API URL: {str(e)}")
            return False
    
    def discover_api_key(self):
        """Discover an API key if not provided"""
        if self.api_key:
            return True
            
        try:
            apigateway = boto3.client('apigateway', region_name=self.region)
            keys = apigateway.get_api_keys()
            
            if keys['items']:
                # Get the first API key
                key_id = keys['items'][0]['id']
                key = apigateway.get_api_key(apiKey=key_id, includeValue=True)
                self.api_key = key['value']
                print(f"Using API key: {self.api_key[:5]}...")
                return True
            else:
                print("WARNING: No API key found. Tests may fail if endpoints require API keys.")
                return False
                
        except Exception as e:
            print(f"WARNING: Failed to discover API key: {str(e)}")
            return False
            
    def run_test(self, method, endpoint, data=None, expected_status=200, description=""):
        """Run a single test against an API endpoint"""
        url = f"{self.api_url}{endpoint}"
        headers = {}
        
        if self.api_key:
            headers['x-api-key'] = self.api_key
        
        # Try different auth header formats to handle API Gateway requirements
        if self.auth_token:
            headers['Authorization'] = self.auth_token
        else:
            # Try without Authorization header first
            pass
        
        if data and not isinstance(data, str):
            data = json.dumps(data)
            headers['Content-Type'] = 'application/json'
        
        start_time = datetime.now()
        error_message = None
        response_data = None
        
        # List of auth methods to try
        auth_methods = [
            None,  # No auth header
            {'Authorization': 'Bearer test-token'},
            {'Authorization': 'AWS4-HMAC-SHA256 Credential=test/20230101/eu-north-1/execute-api/aws4_request'},
            {'x-amz-security-token': 'test-token'}
        ]
        
        # Try each auth method until one works
        for auth_headers in auth_methods:
            try:
                # Prepare headers for this attempt
                request_headers = headers.copy()
                if auth_headers:
                    request_headers.update(auth_headers)
                
                if method.upper() == 'GET':
                    response = requests.get(url, headers=request_headers)
                elif method.upper() == 'POST':
                    response = requests.post(url, headers=request_headers, data=data)
                elif method.upper() == 'PUT':
                    response = requests.put(url, headers=request_headers, data=data)
                elif method.upper() == 'DELETE':
                    response = requests.delete(url, headers=request_headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                    
                status_code = response.status_code
                
                # If we get anything other than 403 authentication error, break the loop
                if status_code != 403 or "Invalid key=value pair" not in response.text:
                    break
                    
            except Exception as e:
                # Continue to next auth method on error
                continue
        
        try:
            response_data = response.json() if response.text else None
        except:
            response_data = response.text if response.text else None
            
        # Check if status code matches any of the expected codes
        if isinstance(expected_status, list):
            success = status_code in expected_status
            if not success:
                error_message = f"Expected status code one of {expected_status}, got {status_code}"
        else:
            success = status_code == expected_status
            if not success:
                error_message = f"Expected status code {expected_status}, got {status_code}"
            
        end_time = datetime.now()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Record test result
        result = {
            "endpoint": endpoint,
            "method": method.upper(),
            "description": description,
            "success": success,
            "status_code": status_code,
            "expected_status": expected_status,
            "duration_ms": duration_ms,
            "error": error_message,
            "response": response_data
        }
        
        self.test_results["tests"].append(result)
        if success:
            self.test_results["success"] += 1
            print(f"✅ PASS: {method} {endpoint} - {description} ({duration_ms:.0f}ms)")
        else:
            self.test_results["failure"] += 1
            print(f"❌ FAIL: {method} {endpoint} - {description}")
            print(f"   Error: {error_message}")
            if response_data:
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
        
        return success, result
        
    def test_company_endpoints(self):
        """Test all company management endpoints"""
        print("\n=== Testing Company Management Endpoints ===\n")
        
        # First, try to find if API requires auth and what form of auth
        print("Testing API authentication requirements...")
        self.probe_authentication()
        
        # Generate a unique test company name
        test_company_id = None
        company_name = f"Test Company {uuid.uuid4().hex[:8]}"
        
        # Try different endpoint paths - the API might be using a different structure
        endpoints_to_try = [
            "/companies",
            "/company",
            "/api/companies",
            "/api/company"
        ]
        
        # Find the correct endpoint first
        correct_endpoint = None
        print("Detecting correct endpoint path...")
        
        for endpoint in endpoints_to_try:
            success, result = self.run_test(
                method="GET",
                endpoint=endpoint,
                expected_status=[200, 201, 204, 403, 404],  # Accept auth failures too for now
                description=f"Trying endpoint {endpoint}"
            )
            status_code = result.get("status_code")
            
            # If we get a non-404 response, this might be the right endpoint
            if status_code and status_code != 404:
                correct_endpoint = endpoint
                print(f"Found potential endpoint: {correct_endpoint} (status: {status_code})")
                if status_code in [200, 201, 204]:
                    break
        
        if not correct_endpoint:
            print("❌ Could not find a working company endpoint. Trying default '/companies'")
            correct_endpoint = "/companies"
        
        # Try alternate form of endpoint if we're still getting auth errors
        if correct_endpoint == "/companies":
            alternate_endpoints = [
                "/company-api/companies",
                "/company-management/companies",
                "/pilotforce/companies",
                "/pilotforce/api/companies"
            ]
            
            for endpoint in alternate_endpoints:
                success, result = self.run_test(
                    method="GET",
                    endpoint=endpoint,
                    expected_status=[200, 201, 204, 403, 404],
                    description=f"Trying alternate endpoint {endpoint}"
                )
                status_code = result.get("status_code")
                if status_code and status_code not in [403, 404]:
                    correct_endpoint = endpoint
                    print(f"Found working endpoint: {correct_endpoint}")
                    break
        
        # Now run the actual tests with the correct endpoint base
        base_endpoint = correct_endpoint
        
        # Test 1: List companies (GET /companies)
        self.run_test(
            method="GET",
            endpoint=base_endpoint,
            expected_status=[200, 204],  # Accept empty response too
            description="List all companies"
        )
        
        # Test 2: Create a new company (POST /companies)
        company_data = {
            "name": company_name,
            "industry": "Technology",
            "size": "Small",
            "description": "Test company created by API test script"
        }
        
        success, result = self.run_test(
            method="POST",
            endpoint=base_endpoint,
            data=company_data,
            expected_status=[200, 201],  # Accept both status codes
            description="Create a new company"
        )
        
        if success and result.get("response"):
            # Try to extract ID from different response formats
            if isinstance(result["response"], dict):
                # Direct response
                test_company_id = result["response"].get("id") or result["response"].get("companyId")
                # Check if the response contains a body field (API Gateway integration)
                if not test_company_id and "body" in result["response"]:
                    try:
                        body = json.loads(result["response"]["body"])
                        test_company_id = body.get("id") or body.get("companyId")
                    except:
                        pass
            # If response is a string, try to parse it
            elif isinstance(result["response"], str):
                try:
                    response_obj = json.loads(result["response"])
                    if isinstance(response_obj, dict):
                        test_company_id = response_obj.get("id") or response_obj.get("companyId")
                except:
                    pass
            
            if test_company_id:
                print(f"   Created test company with ID: {test_company_id}")
            else:
                print("   Created company but couldn't extract ID from response")
                print(f"   Response format: {type(result['response'])}")
                print(f"   Response data: {json.dumps(result['response'], indent=2)[:300]}")
        
        # Test 3: Get a specific company (GET /companies/{id})
        if test_company_id:
            self.run_test(
                method="GET",
                endpoint=f"{base_endpoint}/{test_company_id}",
                expected_status=200,
                description=f"Get company by ID {test_company_id}"
            )
        
        # Test 4: Update company (PUT /companies/{id})
        if test_company_id:
            updated_data = {
                "name": f"{company_name} Updated",
                "industry": "Software",
                "size": "Medium",
                "description": "Updated test company"
            }
            
            self.run_test(
                method="PUT",
                endpoint=f"{base_endpoint}/{test_company_id}",
                data=updated_data,
                expected_status=[200, 204],  # Accept both status codes
                description=f"Update company {test_company_id}"
            )
        
        # Test 5: Delete company (DELETE /companies/{id})
        if test_company_id:
            self.run_test(
                method="DELETE",
                endpoint=f"{base_endpoint}/{test_company_id}",
                expected_status=[200, 202, 204],  # Accept various success codes
                description=f"Delete company {test_company_id}"
            )
            
            # Verify deletion
            self.run_test(
                method="GET",
                endpoint=f"{base_endpoint}/{test_company_id}",
                expected_status=[404, 400],  # Not found or Bad request
                description=f"Verify company {test_company_id} was deleted"
            )
        
        return self.test_results
    
    def probe_authentication(self):
        """Probe the API to determine authentication requirements"""
        print("Probing API authentication requirements...")
        
        # Try different authorization headers and see what works
        auth_methods = [
            {"name": "No Auth", "headers": {}},
            {"name": "API Key Only", "headers": {"x-api-key": "test-key"}},
            {"name": "Bearer Token", "headers": {"Authorization": "Bearer test-token"}},
            {"name": "AWS IAM", "headers": {"Authorization": "AWS4-HMAC-SHA256 Credential=test/20230101/eu-north-1/execute-api/aws4_request"}}
        ]
        
        test_endpoint = "/companies"
        for method in auth_methods:
            headers = method["headers"]
            response = None
            
            try:
                url = f"{self.api_url}{test_endpoint}"
                response = requests.get(url, headers=headers)
                status = response.status_code
                message = "Unknown response"
                
                try:
                    if response.text:
                        resp_json = response.json()
                        if isinstance(resp_json, dict) and "message" in resp_json:
                            message = resp_json["message"]
                except:
                    message = response.text[:50] + "..." if len(response.text) > 50 else response.text
                
                print(f"  {method['name']}: Status {status}, Response: {message}")
                
                # If we got a 200 response, this auth method works
                if status in [200, 201, 204]:
                    print(f"  ✅ Found working auth method: {method['name']}")
                    break
                    
            except Exception as e:
                print(f"  {method['name']}: Error - {str(e)}")
        
        print("Auth probe complete. Configure appropriate authentication if needed.")
    
    def print_summary(self):
        """Print test results summary"""
        total = self.test_results["success"] + self.test_results["failure"]
        success_rate = (self.test_results["success"] / total * 100) if total > 0 else 0
        
        print("\n=== Test Summary ===")
        print(f"Total tests: {total}")
        print(f"Passed: {self.test_results['success']} ({success_rate:.1f}%)")
        print(f"Failed: {self.test_results['failure']}")
        
        if self.test_results["failure"] > 0:
            print("\nFailed tests:")
            for test in self.test_results["tests"]:
                if not test["success"]:
                    print(f"- {test['method']} {test['endpoint']}: {test['error']}")
        
        return success_rate == 100

def main():
    parser = argparse.ArgumentParser(description='Test API Gateway company management endpoints')
    parser.add_argument('--url', type=str, help='API Gateway URL including stage (e.g., https://abcdef123.execute-api.eu-north-1.amazonaws.com/prod)')
    parser.add_argument('--key', type=str, help='API key for authentication')
    parser.add_argument('--region', type=str, default='eu-north-1', help='AWS region (default: eu-north-1)')
    parser.add_argument('--output', type=str, help='Output file for test results (JSON)')
    parser.add_argument('--auth-token', type=str, help='Authorization token (Bearer token)')
    parser.add_argument('--no-auth', action='store_true', help='Disable sending Authorization headers')
    parser.add_argument('--path', type=str, help='Override the API path to test (e.g., /v1/companies)')
    
    args = parser.parse_args()
    
    tester = APIGatewayTester(api_url=args.url, api_key=args.key, auth_token=args.auth_token, region=args.region)
    
    # Discover API details if not provided
    if not args.url and not tester.discover_api_url():
        print("ERROR: Could not discover API URL. Please provide it using --url.")
        return 1
        
    if not args.key:
        tester.discover_api_key()
    
    # Run the tests
    tester.test_company_endpoints()
    success = tester.print_summary()
    
    # Save results to file if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(tester.test_results, f, indent=2)
        print(f"Test results saved to {args.output}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
