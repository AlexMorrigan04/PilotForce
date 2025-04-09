import json
import boto3
import os
import hmac
import hashlib
import base64
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

# Initialize AWS clients
cognito = boto3.client('cognito-idp')
dynamodb = boto3.resource('dynamodb')

# Get table names from environment variables or use defaults
USERS_TABLE = os.environ.get('USERS_TABLE', 'Users')
COMPANIES_TABLE = os.environ.get('COMPANIES_TABLE', 'Companies')

def get_secret_hash(username, client_id, client_secret):
    """Calculate the SECRET_HASH required by Cognito when client secret is configured"""
    message = username + client_id
    dig = hmac.new(
        str(client_secret).encode('utf-8'),
        msg=str(message).encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

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
    
    return domain.split('.')[0]

def get_company_by_id(company_id):
    """
    Retrieve company details by CompanyId
    """
    if not company_id:
        return None
        
    try:
        companies_table = dynamodb.Table(COMPANIES_TABLE)
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
        print("No email domain provided to lookup")
        return None
        
    normalized_domain = email_domain.lower()
    print(f"Looking up company with normalized domain: '{normalized_domain}'")
    
    try:
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        
        # Print all companies for debugging
        try:
            print("DEBUG: Listing all companies in database:")
            all_companies = companies_table.scan()
            for comp in all_companies.get('Items', []):
                print(f"  Company: {comp.get('CompanyId')}, Domain: {comp.get('EmailDomain')}")
        except Exception as e:
            print(f"Error listing all companies: {str(e)}")
        
        # Check GSI status
        try:
            describe_table = dynamodb.meta.client.describe_table(TableName=COMPANIES_TABLE)
            for gsi in describe_table.get('Table', {}).get('GlobalSecondaryIndexes', []):
                if gsi['IndexName'] == 'EmailDomainIndex':
                    print(f"DEBUG: GSI status: {gsi.get('IndexStatus')}")
                    print(f"DEBUG: GSI key schema: {gsi.get('KeySchema')}")
        except Exception as e:
            print(f"Error checking GSI: {str(e)}")
            
        try:
            print(f"Attempting query on EmailDomainIndex for domain: '{normalized_domain}'")
            response = companies_table.query(
                IndexName='EmailDomainIndex',
                KeyConditionExpression=Key('EmailDomain').eq(normalized_domain)
            )
            print(f"Query response: {json.dumps(response, default=str)}")
            if 'Items' in response and response['Items']:
                company = response['Items'][0]
                print(f"Found company via index: {company['CompanyId']} for domain '{normalized_domain}'")
                return company
            print(f"No results found in index query for domain '{normalized_domain}'")
        except Exception as e:
            print(f"Error querying by domain index: {str(e)}")
        
        try:
            print(f"Scanning for domain: '{normalized_domain}'")
            scan_response = companies_table.scan(
                FilterExpression=Attr('EmailDomain').eq(normalized_domain)
            )
            if 'Items' in scan_response and scan_response['Items']:
                company = scan_response['Items'][0]
                print(f"Found company via scan: {company['CompanyId']} for domain '{normalized_domain}'")
                print(f"Warning: Found company via scan but not via index. GSI may need verification.")
                return company
            print(f"No companies found via scan for domain '{normalized_domain}'")
        except Exception as e:
            print(f"Error scanning for domain: {str(e)}")
        
        try:
            print(f"Attempting case-insensitive search for any domain containing: '{normalized_domain}'")
            all_companies = companies_table.scan().get('Items', [])
            matches = [c for c in all_companies if 
                      c.get('EmailDomain','').lower() == normalized_domain]
            if matches:
                company = matches[0]
                print(f"Found company via case-insensitive comparison: {company['CompanyId']}")
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
            print(f"No companies found with case-insensitive matching for '{normalized_domain}'")
        except Exception as e:
            print(f"Error in case-insensitive search: {str(e)}")
        
        return None
    except Exception as e:
        print(f"Error in get_company_by_domain: {str(e)}")
        return None

def create_company(email_domain, company_name=None):
    """
    Create a new company
    """
    if not email_domain:
        print("Cannot create company with empty domain")
        return None
    
    normalized_domain = email_domain.lower()
    existing_company = get_company_by_domain(normalized_domain)
    if existing_company:
        print(f"Company already exists for domain '{normalized_domain}', returning existing ID: {existing_company['CompanyId']}")
        return existing_company['CompanyId']
    
    try:
        if not company_name:
            company_name = get_company_name_from_domain(normalized_domain)
        
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        company_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        company = {
            'CompanyId': company_id,
            'EmailDomain': normalized_domain,
            'CompanyName': company_name,
            'CreatedAt': timestamp,
            'UpdatedAt': timestamp,
            'Status': 'ACTIVE'
        }
        companies_table.put_item(Item=company)
        print(f"Created new company {company_id} for domain '{normalized_domain}' with name '{company_name}'")
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
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        update_expr = "SET UpdatedAt = :updated"
        expr_attr_vals = {
            ':updated': datetime.now().isoformat()
        }
        for key, value in updates.items():
            if key != 'CompanyId':
                update_expr += f", #{key} = :{key}"
                expr_attr_vals[f":{key}"] = value
        expr_attr_names = {f"#{key}": key for key in updates.keys() if key != 'CompanyId'}
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

def get_or_create_company_for_user(email):
    """
    Gets or creates a company based on the user's email domain
    """
    if not email:
        print("No email provided to get_or_create_company_for_user")
        return None
    
    email_domain = extract_email_domain(email)
    if not email_domain:
        print(f"Could not extract domain from email: '{email}'")
        return None
    
    normalized_domain = email_domain.lower()
    print(f"Processing company for email domain: '{normalized_domain}'")
    
    try:
        companies_table = dynamodb.Table(COMPANIES_TABLE)
        company_response = companies_table.query(
            IndexName='EmailDomainIndex',
            KeyConditionExpression=Key('EmailDomain').eq(normalized_domain)
        )
        companies = company_response.get('Items', [])
        if len(companies) > 1:
            print(f"WARNING: Found {len(companies)} companies with domain '{normalized_domain}'")
            sorted_companies = sorted(companies, key=lambda x: x.get('CreatedAt', ''))
            company = sorted_companies[0]
            print(f"Selected oldest company: {company['CompanyId']} created at {company.get('CreatedAt')}")
            return company['CompanyId']
        elif len(companies) == 1:
            company = companies[0]
            print(f"Found existing company: {company['CompanyId']} for domain '{normalized_domain}'")
            return company['CompanyId']
        
        print(f"No existing company found for domain '{normalized_domain}', creating new one")
        company_name = get_company_name_from_domain(email_domain)
        company_id = create_company(normalized_domain, company_name)
        if company_id:
            print(f"Successfully created company {company_id} for domain '{normalized_domain}'")
        else:
            print(f"Failed to create company for domain '{normalized_domain}'")
        return company_id
    except Exception as e:
        print(f"Error in get_or_create_company_for_user: {str(e)}")
        try:
            company_name = get_company_name_from_domain(email_domain)
            return create_company(normalized_domain, company_name)
        except Exception as create_error:
            print(f"Error in fallback company creation: {str(create_error)}")
            return None

def lambda_handler(event, context):
    # Set up CORS headers for all responses
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }
    
    print("Received event:", json.dumps(event, default=str))
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'CORS preflight successful'})
        }
    
    try:
        body = None
        if 'body' in event:
            try:
                if isinstance(event['body'], str):
                    body = json.loads(event['body'])
                else:
                    body = event['body']
            except Exception as e:
                print(f"Error parsing event body: {str(e)}")
                print("Event body received:", event['body'])
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'Unable to parse request body',
                        'error': str(e),
                        'receivedEventType': str(type(event['body']))
                    })
                }
        else:
            body = event
        
        username = body.get('username', '')
        password = body.get('password', '')
        attributes = body.get('attributes', {})
        email = attributes.get('email', '')
        company_id = attributes.get('custom:companyId', '')
        phone_number = attributes.get('phone_number', '')
        user_role = attributes.get('custom:userRole', 'User')
        company_name = attributes.get('custom:companyName', '')
        
        print(f'Extracted signup data: username="{username}", email="{email}", companyId="{company_id}", role="{user_role}"')
        print(f'Body data type: {type(body)}')
        print(f'Attributes: {json.dumps(attributes, default=str)}')
        
        if not username or not password:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Username and password are required',
                    'receivedData': {
                        'username': username != '',
                        'password': password != '',
                        'bodyFormat': str(type(body))
                    }
                })
            }
        
        if not email:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Email is required',
                    'receivedData': {
                        'email': email != '',
                        'attributes': json.dumps(attributes)
                    }
                })
            }
        
        print(f'Attempting signup for user: {username}')
        
        client_id = os.environ.get('USER_POOL_CLIENT_ID')
        client_secret = os.environ.get('USER_POOL_CLIENT_SECRET')
        user_pool_id = os.environ.get('USER_POOL_ID')
        
        # Check if a company ID is provided or if we need to assign one from email domain
        if not company_id and email:
            print(f"No company ID provided in request, determining from email: '{email}'")
            email_domain = extract_email_domain(email)
            
            if email_domain:
                print(f"Looking up company for domain: '{email_domain}'")
                company_id = get_or_create_company_for_user(email)
                
                if company_id:
                    print(f"Assigned company ID: {company_id} to user: '{username}' with email: '{email}'")
                    attributes['custom:companyId'] = company_id
                else:
                    print(f"WARNING: Failed to assign company for email: '{email}'")
            else:
                print(f"Could not extract domain from email: '{email}'")
        else:
            print(f"Using provided company ID: {company_id}")
            # Validate the provided company ID against the email domain
            if email:
                email_domain = extract_email_domain(email)
                if email_domain:
                    # Check if there's an existing company with this domain
                    existing_company = get_company_by_domain(email_domain)
                    if existing_company and existing_company['CompanyId'] != company_id:
                        print(f"WARNING: Provided company ID {company_id} doesn't match existing company {existing_company['CompanyId']} for domain {email_domain}")
                        print(f"Using existing company instead")
                        company_id = existing_company['CompanyId']
                        attributes['custom:companyId'] = company_id
        
        user_attributes = []
        
        if email:
            user_attributes.append({'Name': 'email', 'Value': email})
        
        if 'name' in attributes:
            user_attributes.append({'Name': 'name', 'Value': attributes['name']})
        elif 'name.formatted' in attributes:
            user_attributes.append({'Name': 'name', 'Value': attributes['name.formatted']})
        else:
            user_attributes.append({'Name': 'name', 'Value': username})
        
        user_name = next((attr['Value'] for attr in user_attributes if attr['Name'] == 'name'), username)
        
        if 'phone_number' in attributes:
            user_attributes.append({'Name': 'phone_number', 'Value': attributes['phone_number']})
            phone_number = attributes['phone_number']
        elif 'phoneNumbers' in attributes:
            user_attributes.append({'Name': 'phone_number', 'Value': attributes['phoneNumbers']})
            phone_number = attributes['phoneNumbers']
        else:
            user_attributes.append({'Name': 'phone_number', 'Value': '+15555555555'})
            phone_number = '+15555555555'
        
        if company_id:
            user_attributes.append({'Name': 'custom:companyId', 'Value': company_id})
        
        if user_role:
            user_attributes.append({'Name': 'custom:userRole', 'Value': user_role})
        
        print(f'User attributes being sent to Cognito: {json.dumps(user_attributes)}')
        
        sign_up_params = {
            'ClientId': client_id,
            'Username': username,
            'Password': password,
            'UserAttributes': user_attributes
        }
        
        if client_secret:
            sign_up_params['SecretHash'] = get_secret_hash(username, client_id, client_secret)
        
        try:
            response = cognito.sign_up(**sign_up_params)
            user_sub = response["UserSub"]
            
            print(f'User created successfully in Cognito, user sub: {user_sub}')
            
            current_time = datetime.now().isoformat()
            
            companies_table = dynamodb.Table(COMPANIES_TABLE)
            
            try:
                # Check for existing company record and double-check email domain
                if company_id:
                    # Double-check against domain first
                    email_domain = extract_email_domain(email)
                    existing_company = None
                    if email_domain:
                        # Try all lookup methods - first by GSI
                        try:
                            query_response = companies_table.query(
                                IndexName='EmailDomainIndex',
                                KeyConditionExpression=Key('EmailDomain').eq(email_domain.lower())
                            )
                            if 'Items' in query_response and query_response['Items']:
                                existing_company = query_response['Items'][0]
                                print(f"Found existing company via GSI: {existing_company['CompanyId']} for domain '{email_domain}'")
                        except Exception as e:
                            print(f"GSI lookup error: {str(e)}")
                            
                        # If GSI failed, try direct scan
                        if not existing_company:
                            try:
                                scan_response = companies_table.scan(
                                    FilterExpression=Attr('EmailDomain').eq(email_domain.lower())
                                )
                                if 'Items' in scan_response and scan_response['Items']:
                                    existing_company = scan_response['Items'][0]
                                    print(f"Found existing company via scan: {existing_company['CompanyId']} for domain '{email_domain}'")
                            except Exception as e:
                                print(f"Scan lookup error: {str(e)}")
                    
                    # If we found an existing company with the same domain but different ID
                    if existing_company and existing_company['CompanyId'] != company_id:
                        print(f"WARNING: Using existing company {existing_company['CompanyId']} instead of provided {company_id}")
                        company_id = existing_company['CompanyId']
                    
                    # Now check if the company exists by ID
                    company_response = companies_table.get_item(Key={'CompanyId': company_id})
                    
                    if 'Item' not in company_response:
                        print(f"Company ID {company_id} was provided but company doesn't exist. Creating company.")
                        email_domain = extract_email_domain(email)
                        company_name = company_name or get_company_name_from_domain(email_domain)
                        
                        # Create company with the provided ID instead of generating a new one
                        new_company = {
                            'CompanyId': company_id,
                            'EmailDomain': email_domain.lower(),
                            'CompanyName': company_name,
                            'CreatedAt': datetime.now().isoformat(),
                            'UpdatedAt': datetime.now().isoformat(),
                            'Status': 'ACTIVE'
                        }
                        
                        companies_table.put_item(Item=new_company)
                        print(f"Created company: {json.dumps(new_company, default=str)}")
                        
                        user_role = 'CompanyAdmin'
                    else:
                        print(f"Company exists: {json.dumps(company_response.get('Item', {}), default=str)}")
                else:
                    print("No company ID was assigned to user.")
            except Exception as company_error:
                print(f'Error checking/creating company: {str(company_error)}')
            
            try:
                users_table = dynamodb.Table(USERS_TABLE)
                
                user_item = {
                    'UserId': user_sub,
                    'Username': username,
                    'Email': email,
                    'Name': user_name,
                    'PhoneNumber': phone_number,
                    'CompanyId': company_id,
                    'UserRole': user_role,
                    'CreatedAt': current_time,
                    'UpdatedAt': current_time,
                    'Status': 'UNCONFIRMED'
                }
                
                if company_name:
                    user_item['CompanyName'] = company_name
                
                users_table.put_item(Item=user_item)
                print(f'User data stored in DynamoDB: {json.dumps(user_item, default=str)}')
                
            except Exception as db_error:
                print(f'Error storing user in DynamoDB: {str(db_error)}')
            
            if user_pool_id:
                try:
                    cognito.admin_confirm_sign_up(
                        UserPoolId=user_pool_id,
                        Username=username
                    )
                    
                    try:
                        users_table.update_item(
                            Key={'UserId': user_sub},
                            UpdateExpression="SET #status = :status, UpdatedAt = :updated",
                            ExpressionAttributeNames={'#status': 'Status'},
                            ExpressionAttributeValues={
                                ':status': 'CONFIRMED',
                                ':updated': datetime.now().isoformat()
                            }
                        )
                        print(f'Updated user status to CONFIRMED in DynamoDB')
                    except Exception as update_error:
                        print(f'Error updating user status in DynamoDB: {str(update_error)}')
                    
                    try:
                        cognito.admin_update_user_attributes(
                            UserPoolId=user_pool_id,
                            Username=username,
                            UserAttributes=[
                                {
                                    'Name': 'email_verified',
                                    'Value': 'true'
                                }
                            ]
                        )
                        print(f'Set email_verified attribute for user {username}')
                    except Exception as attr_error:
                        print(f'Could not set email_verified attribute: {str(attr_error)}')
                    
                    print(f'User {username} auto-confirmed')
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'User created and confirmed successfully',
                            'userId': user_sub,
                            'isSignUpComplete': True,
                            'confirmationRequired': False,
                            'username': username
                        })
                    }
                except Exception as confirm_error:
                    print(f'Could not auto-confirm user: {str(confirm_error)}')
                    
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps({
                            'message': 'User created successfully but requires confirmation',
                            'userId': user_sub,
                            'isSignUpComplete': False,
                            'confirmationRequired': True,
                            'username': username,
                            'email': email,
                            'companyId': company_id,
                            'companyName': company_name,
                            'userRole': user_role
                        })
                    }
            else:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'message': 'User created successfully but requires confirmation',
                        'userId': user_sub,
                        'isSignUpComplete': False,
                        'confirmationRequired': True,
                        'username': username,
                        'email': email,
                        'companyId': company_id,
                        'companyName': company_name,
                        'userRole': user_role
                    })
                }
        except cognito.exceptions.UsernameExistsException:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Username already exists',
                    'type': 'UsernameExistsException'
                })
            }
        except cognito.exceptions.InvalidPasswordException as e:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Password does not meet requirements',
                    'type': 'InvalidPasswordException',
                    'details': str(e)
                })
            }
        
    except Exception as e:
        print(f'Unexpected error during signup: {str(e)}')
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
