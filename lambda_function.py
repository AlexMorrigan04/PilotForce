import json
import boto3
import os
import uuid
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime

# Import from the common layer
from pilotforce_common.utils import (
    standardize_cors_headers,
    create_response,
    handle_options_request,
    get_users_by_company_id,
    extract_path_parameter
)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Get table names from environment variables or use defaults
USERS_TABLE = os.environ.get('USERS_TABLE', 'Users')
COMPANIES_TABLE = os.environ.get('COMPANIES_TABLE', 'Companies')

def extract_email_domain(email):
    """
    Extracts the domain from an email address
    Example: from 'user@example.com' returns 'example.com'
    
    Args:
        email (str): The email address to extract domain from
        
    Returns:
        str: The email domain
    """
    if not email or '@' not in email:
        return ''
    
    # Split on @ and take the part after it - no replacement of @ with _at_
    return email.split('@')[1]

def get_company_name_from_domain(domain):
    """
    Gets the company name from the domain
    Example: from 'example.com' returns 'example'
    
    Args:
        domain (str): The full domain to extract company name from
        
    Returns:
        str: The company name portion of the domain
    """
    if not domain or '.' not in domain:
        return domain
    
    # Take the part before the first dot
    return domain.split('.')[0]

def get_company_by_id(company_id):
    """
    Retrieve company details by CompanyId
    """
    if not company_id:
        return None
        
    try:
        # Get the Companies table
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        
        # Get the company by ID
        response = companies_table.get_item(Key={'CompanyId': company_id})
        
        if 'Item' in response:
            return response['Item']
            
        return None
    except Exception as e:
        print(f"Error retrieving company: {str(e)}")
        return None

def get_company_by_domain(email_domain):
    """
    Retrieve company by email domain
    """
    if not email_domain:
        print("No email domain provided")
        return None
        
    # Normalize the domain
    normalized_domain = email_domain.lower()
    print(f"Looking up company with normalized domain: '{normalized_domain}'")
    
    try:
        # Get the Companies table
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        
        # First, try a direct query using the GSI
        try:
            print(f"Attempting GSI query for domain: '{normalized_domain}'")
            response = companies_table.query(
                IndexName='EmailDomainIndex',
                KeyConditionExpression=Key('EmailDomain').eq(normalized_domain)
            )
            
            print(f"Query stats - Count: {response.get('Count', 0)}, ScannedCount: {response.get('ScannedCount', 0)}")
            
            if 'Items' in response and response['Items']:
                company = response['Items'][0]
                print(f"Found company via index: {company['CompanyId']} for domain '{normalized_domain}'")
                return company
            print(f"No results in GSI query for domain '{normalized_domain}'")
        except Exception as e:
            print(f"Error querying by domain index: {str(e)}")
        
        # As a fallback, scan the table
        try:
            print(f"Scanning Companies table for domain: '{normalized_domain}'")
            scan_response = companies_table.scan(
                FilterExpression=Attr('EmailDomain').eq(normalized_domain)
            )
            
            print(f"Scan stats - Count: {scan_response.get('Count', 0)}, ScannedCount: {scan_response.get('ScannedCount', 0)}")
            
            if 'Items' in scan_response and scan_response['Items']:
                company = scan_response['Items'][0]
                print(f"Found company via scan: {company['CompanyId']} for domain '{normalized_domain}'")
                
                # Check for GSI consistency issues
                if 'Count' in response and response['Count'] == 0:
                    print(f"Warning: GSI inconsistency detected. Found in scan but not in GSI query.")
                return company
            
            print(f"No companies found in scan for domain '{normalized_domain}'")
        except Exception as e:
            print(f"Error scanning for domain: {str(e)}")
        
        # If still not found, try case-insensitive comparison
        try:
            print(f"Attempting case-insensitive search")
            all_companies = companies_table.scan().get('Items', [])
            
            matches = [c for c in all_companies if 
                      c.get('EmailDomain', '').lower() == normalized_domain]
            
            if matches:
                company = matches[0]
                print(f"Found company via case-insensitive match: {company['CompanyId']}")
                
                # Fix the company record to use normalized domain
                try:
                    companies_table.update_item(
                        Key={'CompanyId': company['CompanyId']},
                        UpdateExpression="SET EmailDomain = :domain, UpdatedAt = :updated",
                        ExpressionAttributeValues={
                            ':domain': normalized_domain,
                            ':updated': datetime.now().isoformat()
                        }
                    )
                    print(f"Updated company domain to normalized form: '{normalized_domain}'")
                except Exception as update_error:
                    print(f"Error updating company domain: {str(update_error)}")
                
                return company
            
            print(f"No company found via case-insensitive search")
        except Exception as e:
            print(f"Error in case-insensitive search: {str(e)}")
        
        print(f"No company found for domain: '{normalized_domain}'")
        return None
    except Exception as e:
        print(f"Error in get_company_by_domain: {str(e)}")
        return None

def create_company(email_domain, company_name=None):
    """
    Create a new company
    """
    if not email_domain:
        return None
    
    # Ensure consistent case handling
    normalized_domain = email_domain.lower()
    
    # Check if company already exists before creating
    existing_company = get_company_by_domain(normalized_domain)
    if existing_company:
        print(f"Company already exists for domain '{normalized_domain}', returning existing ID: {existing_company['CompanyId']}")
        return existing_company['CompanyId']
    
    try:
        # If company_name not provided, extract it from the domain
        if not company_name:
            company_name = get_company_name_from_domain(normalized_domain)
        
        # Get the Companies table
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        
        # Generate a unique ID and timestamp
        company_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create the company object
        company = {
            'CompanyId': company_id,
            'EmailDomain': normalized_domain,  # Store as lowercase for consistency
            'CompanyName': company_name,
            'CreatedAt': timestamp,
            'UpdatedAt': timestamp
        }
        
        # Save to DynamoDB
        companies_table.put_item(Item=company)
        
        print(f"Created new company: {company_id} for domain {normalized_domain}")
        return company_id
    except Exception as e:
        print(f"Error creating company: {str(e)}")
        return None

def update_company(company_id, updates):
    """
    Update company attributes
    """
    if not company_id or not updates:
        return False
        
    try:
        # Get the Companies table
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        
        # Create update expression and attribute values
        update_expr = "SET UpdatedAt = :updated"
        expr_attr_vals = {
            ':updated': datetime.now().isoformat()
        }
        
        # Add each update to the expression
        for key, value in updates.items():
            if key != 'CompanyId':  # Skip the primary key
                update_expr += f", #{key} = :{key}"
                expr_attr_vals[f":{key}"] = value
        
        # Create expression attribute names
        expr_attr_names = {f"#{key}": key for key in updates.keys() if key != 'CompanyId'}
        
        # Update the company
        response = companies_table.update_item(
            Key={'CompanyId': company_id},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_attr_vals,
            ExpressionAttributeNames=expr_attr_names,
            ReturnValues='UPDATED_NEW'
        )
        
        return True
    except Exception as e:
        print(f"Error updating company: {str(e)}")
        return False

def process_user_company_registration(email):
    """
    Process user registration with their company based on email domain
    """
    if not email:
        return None, "Email is required"
    
    try:
        # Extract the domain from the email
        email_domain = extract_email_domain(email)
        
        if not email_domain:
            return None, "Invalid email format"
        
        # Normalize domain to lowercase
        normalized_domain = email_domain.lower()
        
        print(f"Extracted email domain: '{normalized_domain}'")
        
        # Get the Companies table
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        
        # First, check if there are multiple companies with this domain
        try:
            response = companies_table.query(
                IndexName='EmailDomainIndex',
                KeyConditionExpression=Key('EmailDomain').eq(normalized_domain)
            )
            
            companies = response.get('Items', [])
            
            if len(companies) > 1:
                print(f"WARNING: Found {len(companies)} companies with domain '{normalized_domain}'")
                
                # Use the oldest company (assuming it's the primary one)
                sorted_companies = sorted(companies, key=lambda x: x.get('CreatedAt', ''))
                company = sorted_companies[0]
                
                print(f"Selected oldest company: {company['CompanyId']} created at {company.get('CreatedAt')}")
                return company, None
            elif len(companies) == 1:
                company = companies[0]
                print(f"Found existing company: {company['CompanyId']} for domain '{normalized_domain}'")
                return company, None
            
            # No company found, create a new one
            company_name = get_company_name_from_domain(normalized_domain)
            print(f"Creating new company with domain: '{normalized_domain}', name: '{company_name}'")
            company_id = create_company(normalized_domain, company_name)
            
            if not company_id:
                return None, "Failed to create company"
                
            # Get the newly created company
            new_company_response = companies_table.get_item(Key={'CompanyId': company_id})
            if 'Item' in new_company_response:
                return new_company_response['Item'], None
            else:
                return None, "Created company but couldn't retrieve it"
                
        except Exception as query_error:
            print(f"Error querying companies: {str(query_error)}")
            
            # Fall back to scan if query fails
            company = get_company_by_domain(normalized_domain)
            if company:
                return company, None
                
            # If company doesn't exist, create it
            company_name = get_company_name_from_domain(normalized_domain)
            print(f"Creating new company with domain: '{normalized_domain}', name: '{company_name}'")
            company_id = create_company(normalized_domain, company_name)
            
            if not company_id:
                return None, "Failed to create company"
                
            # Get the newly created company
            company = get_company_by_domain(normalized_domain)
            if not company:
                return None, "Created company but couldn't retrieve it"
            
            return company, None
            
    except Exception as e:
        print(f"Error in user company registration: {str(e)}")
        return None, str(e)

def lambda_handler(event, context):
    # Add logging to see the raw event
    print("Received event:", json.dumps(event, default=str))
    
    # Use standard headers from common layer
    headers = standardize_cors_headers()
    
    # Handle OPTIONS request (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return handle_options_request(event)
    
    try:
        # Extract path parameters using helper from common layer
        company_id = extract_path_parameter(event, 'companyId')
        
        # Extract HTTP method
        http_method = event.get('httpMethod', '')
        
        # Parse query parameters
        query_params = event.get('queryStringParameters') or {}
        
        # Parse request body if present
        body = None
        if event.get('body'):
            try:
                if isinstance(event['body'], str):
                    body = json.loads(event['body'])
                else:
                    body = event['body']
            except Exception as e:
                return create_response(400, {
                    'message': 'Invalid request body',
                    'error': str(e)
                })
        
        # Extract JWT token from headers for authorization
        auth_token = event.get('headers', {}).get('Authorization', '')
        if auth_token.startswith('Bearer '):
            auth_token = auth_token[7:]  # Remove 'Bearer ' prefix
        
        # 1. GET /companies/{companyId} - Get company details
        if http_method == 'GET' and '/companies/' in path and company_id:
            company = get_company_by_id(company_id)
            
            if company:
                return create_response(200, {
                    'message': 'Company retrieved successfully',
                    'company': company
                })
            else:
                return create_response(404, {
                    'message': 'Company not found'
                })
        
        # 2. GET /companies/{companyId}/users - Get users for a company
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Invalid request body',
                        'error': str(e)
                    })
                }
        
        # Extract JWT token from headers for authorization
        auth_token = event.get('headers', {}).get('Authorization', '')
        if auth_token.startswith('Bearer '):
            auth_token = auth_token[7:]  # Remove 'Bearer ' prefix
        
        # 1. GET /companies/{companyId} - Get company details
        if http_method == 'GET' and len(path_parts) > 2 and path_parts[-2] == 'companies':
            company_id = path_parts[-1]
            company = get_company_by_id(company_id)
            
            if company:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company retrieved successfully',
                        'company': company
                    })
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company not found'
                    })
                }
        
        # 2. GET /companies/{companyId}/users - Get users for a company
        if http_method == 'GET' and len(path_parts) > 3 and path_parts[-3] == 'companies' and path_parts[-1] == 'users':
            company_id = path_parts[-2]
            users = get_users_by_company_id(company_id)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Company users retrieved successfully',
                    'users': users,
                    'count': len(users)
                })
            }
        
        # 3. GET /companies/domain/{domain} - Get company by email domain
        if http_method == 'GET' and len(path_parts) > 3 and path_parts[-3] == 'companies' and path_parts[-2] == 'domain':
            domain = path_parts[-1]
            print(f"Looking up company by domain: {domain}")
            company = get_company_by_domain(domain)
            
            if company:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company retrieved successfully',
                        'company': company
                    })
                }
            else:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company not found for domain'
                    })
                }
        
        # 4. POST /companies - Create a new company
        if http_method == 'POST' and len(path_parts) >= 1 and path_parts[-1] == 'companies':
            print(f"Processing POST /companies request with body: {json.dumps(body, default=str)}")
            
            if not body:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Request body is required'
                    })
                }
            
            email_domain = body.get('EmailDomain')
            if not email_domain:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'EmailDomain is required'
                    })
                }
            
            # Check if company already exists
            existing_company = get_company_by_domain(email_domain)
            if existing_company:
                print(f"Company already exists for domain '{email_domain}': {existing_company['CompanyId']}")
                return {
                    'statusCode': 200,  # Changed from 409 to 200 to be more client-friendly
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company with this email domain already exists',
                        'company': existing_company
                    })
                }
            
            # Create new company
            company_name = body.get('CompanyName', get_company_name_from_domain(email_domain))
            company_id = create_company(email_domain, company_name)
            
            if company_id:
                # Fetch the created company to return complete details
                created_company = get_company_by_id(company_id)
                print(f"Successfully created company: {json.dumps(created_company, default=str)}")
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company created successfully',
                        'company': created_company
                    })
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Failed to create company'
                    })
                }
        
        # 5. POST /companies/register - Register user with company
        if http_method == 'POST' and len(path_parts) > 2 and path_parts[-2] == 'companies' and path_parts[-1] == 'register':
            if not body:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Request body is required'
                    })
                }
            
            email = body.get('email')
            print(f"Processing registration for email: {email}")
            
            company, error = process_user_company_registration(email)
            
            if error:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': error
                    })
                }
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'User registered with company successfully',
                    'company': company
                })
            }
        
        # 6. PUT /companies/{companyId} - Update company details
        if http_method == 'PUT' and len(path_parts) > 2 and path_parts[-2] == 'companies':
            if not body:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Request body is required'
                    })
                }
                
            company_id = path_parts[-1]
            success = update_company(company_id, body)
            
            if success:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Company updated successfully',
                        'companyId': company_id
                    })
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Failed to update company'
                    })
                }
        
        # Default response for unmatched routes
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({
                'message': 'Not found',
                'path': path,
                'method': http_method
            })
        }
        
    except Exception as e:
        print(f'Unexpected error: {str(e)}')
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
