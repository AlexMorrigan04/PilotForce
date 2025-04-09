import json
import boto3
import os
import logging
from typing import Dict, Any, List
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Get environment variables
COMPANY_TABLE = os.environ.get('COMPANY_TABLE', 'Companies')
USER_TABLE = os.environ.get('USER_TABLE', 'Users')
USER_POOL_ID = os.environ.get('USER_POOL_ID')

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
company_table = dynamodb.Table(COMPANY_TABLE)
user_table = dynamodb.Table(USER_TABLE)
cognito = boto3.client('cognito-idp')

# Helper function to check admin status
def is_admin_user(event) -> bool:
    try:
        # Extract token from the Authorization header
        auth_header = event.get('headers', {}).get('Authorization')
        if not auth_header:
            return False
        
        # Verify user has admin role (simplified for demo)
        return True
    except Exception as e:
        logger.error(f"Error checking admin status: {str(e)}")
        return False

# Helper function for API response
def generate_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

# Lambda handler function
def lambda_handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    
    # Check if the request is an OPTIONS preflight request
    if event.get('httpMethod') == 'OPTIONS':
        return generate_response(200, {})
    
    # Check if the user is an admin
    if not is_admin_user(event):
        return generate_response(403, {'message': 'Unauthorized. Admin access required'})
    
    try:
        # Route the request based on path and method
        path = event.get('resource', '')
        method = event.get('httpMethod', '')
        
        # Handle GET /admin/companies
        if path == '/admin/companies' and method == 'GET':
            return get_all_companies(event)
        
        # Handle GET /admin/companies/{companyId}
        elif path == '/admin/companies/{companyId}' and method == 'GET':
            return get_company_by_id(event)
        
        # Handle PUT /admin/companies/{companyId}
        elif path == '/admin/companies/{companyId}' and method == 'PUT':
            return update_company(event)
        
        # Handle DELETE /admin/companies/{companyId}
        elif path == '/admin/companies/{companyId}' and method == 'DELETE':
            return delete_company(event)
        
        # Handle POST /admin/companies
        elif path == '/admin/companies' and method == 'POST':
            return create_company(event)
        
        # Unknown route
        return generate_response(404, {'message': 'Not Found'})
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return generate_response(500, {'message': f'Internal Server Error: {str(e)}'})

# Get all companies
def get_all_companies(event):
    try:
        # Get query parameters for filtering
        query_params = event.get('queryStringParameters', {}) or {}
        status_filter = query_params.get('status', '')
        
        # Scan the Companies table
        response = company_table.scan()
        companies_data = response.get('Items', [])
        
        # Handle pagination for large company lists
        while 'LastEvaluatedKey' in response:
            response = company_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            companies_data.extend(response.get('Items', []))
        
        logger.info(f"Found {len(companies_data)} companies in DynamoDB")
        
        # Get all users from the Users table to count per company
        user_counts = {}
        try:
            # Scan Users table
            users_response = user_table.scan()
            users_data = users_response.get('Items', [])
            
            # Handle pagination for large user lists
            while 'LastEvaluatedKey' in users_response:
                users_response = user_table.scan(ExclusiveStartKey=users_response['LastEvaluatedKey'])
                users_data.extend(users_response.get('Items', []))
            
            # Count users by company
            for user in users_data:
                company_id = user.get('CompanyId')
                if company_id:
                    if company_id in user_counts:
                        user_counts[company_id] += 1
                    else:
                        user_counts[company_id] = 1
            
            logger.info(f"Counted users for {len(user_counts)} companies from Users table")
        except Exception as e:
            logger.error(f"Error getting user counts from Users table: {str(e)}")
        
        # Process companies and apply filters
        companies = []
        for company in companies_data:
            company_id = company.get('CompanyId', '')
            
            # Map DynamoDB attributes to our company model
            company_obj = {
                'CompanyId': company_id,
                'Name': company.get('CompanyName', ''),
                'PrimaryDomain': company.get('EmailDomain', ''),
                'Status': company.get('Status', 'Active'),
                'CreatedAt': company.get('CreatedAt', ''),
                'UpdatedAt': company.get('UpdatedAt', '')
            }
            
            # Get user count for the company from our pre-counted data
            company_obj['UserCount'] = user_counts.get(company_id, 0)
            
            # If we didn't find users in DynamoDB, try Cognito as fallback
            if company_obj['UserCount'] == 0:
                try:
                    user_count_response = cognito.list_users(
                        UserPoolId=USER_POOL_ID,
                        Filter=f'custom:companyId = "{company_id}"'
                    )
                    company_obj['UserCount'] = len(user_count_response.get('Users', []))
                except Exception as e:
                    logger.error(f"Error getting user count from Cognito for company {company_id}: {str(e)}")
            
            # Apply filters
            if not status_filter or company_obj['Status'] == status_filter:
                companies.append(company_obj)
        
        logger.info(f"Returning {len(companies)} companies after filtering")
        # Log sample company data for debugging
        if companies:
            logger.info(f"Sample company data: {json.dumps(companies[0])}")
        
        return generate_response(200, {'companies': companies})
    
    except Exception as e:
        logger.error(f"Error getting all companies: {str(e)}")
        return generate_response(500, {'message': f'Error retrieving companies: {str(e)}'})

# Get a specific company by ID
def get_company_by_id(event):
    try:
        company_id = event['pathParameters']['companyId']
        
        # Get company from DynamoDB
        response = company_table.get_item(
            Key={'CompanyId': company_id}
        )
        
        if 'Item' not in response:
            return generate_response(404, {'message': 'Company not found'})
        
        company = response['Item']
        
        # Map DynamoDB attributes to our company model
        company_obj = {
            'CompanyId': company.get('CompanyId', ''),
            'Name': company.get('CompanyName', ''),
            'PrimaryDomain': company.get('EmailDomain', ''),
            'Status': company.get('Status', 'Active'),
            'CreatedAt': company.get('CreatedAt', ''),
            'UpdatedAt': company.get('UpdatedAt', '')
        }
        
        # Count users from Users table
        user_count = 0
        try:
            # Query Users table for users with this company ID
            user_response = user_table.scan(
                FilterExpression="CompanyId = :companyId",
                ExpressionAttributeValues={':companyId': company_id}
            )
            user_count = len(user_response.get('Items', []))
            
            # Handle pagination if needed
            while 'LastEvaluatedKey' in user_response:
                user_response = user_table.scan(
                    FilterExpression="CompanyId = :companyId",
                    ExpressionAttributeValues={':companyId': company_id},
                    ExclusiveStartKey=user_response['LastEvaluatedKey']
                )
                user_count += len(user_response.get('Items', []))
                
            company_obj['UserCount'] = user_count
        except Exception as e:
            logger.error(f"Error counting users from Users table for company {company_id}: {str(e)}")
            
            # Try Cognito as fallback if DynamoDB scan fails
            try:
                user_count_response = cognito.list_users(
                    UserPoolId=USER_POOL_ID,
                    Filter=f'custom:companyId = "{company_id}"'
                )
                company_obj['UserCount'] = len(user_count_response.get('Users', []))
            except Exception as e2:
                logger.error(f"Error getting user count from Cognito for company {company_id}: {str(e2)}")
                company_obj['UserCount'] = 0
        
        return generate_response(200, {'company': company_obj})
    
    except Exception as e:
        logger.error(f"Error getting company by ID: {str(e)}")
        return generate_response(500, {'message': f'Error retrieving company: {str(e)}'})

# Create a new company
def create_company(event):
    try:
        body = json.loads(event['body'])
        
        # Validate required fields
        if not body.get('name'):
            return generate_response(400, {'message': 'Company name is required'})
        
        # Create a new company in DynamoDB
        import uuid
        from datetime import datetime
        
        company_id = body.get('id') or str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        company_item = {
            'CompanyId': company_id,
            'CompanyName': body.get('name', ''),
            'EmailDomain': body.get('domain', ''),
            'Status': body.get('status', 'Active'),
            'CreatedAt': timestamp,
            'UpdatedAt': timestamp
        }
        
        # Note: Industry field is intentionally removed
        
        # Save to DynamoDB
        company_table.put_item(Item=company_item)
        
        logger.info(f"Created new company: {company_id}")
        
        return generate_response(201, {
            'message': 'Company created successfully',
            'company': {
                'CompanyId': company_id,
                'Name': company_item['CompanyName'],
                'PrimaryDomain': company_item['EmailDomain'],
                'Status': company_item['Status'],
                'CreatedAt': company_item['CreatedAt'],
                'UserCount': 0  # New company has no users yet
            }
        })
    
    except Exception as e:
        logger.error(f"Error creating company: {str(e)}")
        return generate_response(500, {'message': f'Error creating company: {str(e)}'})

# Update an existing company
def update_company(event):
    try:
        company_id = event['pathParameters']['companyId']
        body = json.loads(event['body'])
        
        # Check if company exists
        response = company_table.get_item(
            Key={'CompanyId': company_id}
        )
        
        if 'Item' not in response:
            return generate_response(404, {'message': 'Company not found'})
        
        # Build update expression
        update_expression = "SET "
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        # Map API fields to DynamoDB attributes (removed Industry)
        field_mappings = {
            'name': 'CompanyName',
            'domain': 'EmailDomain',
            'status': 'Status'
        }
        
        # Add fields to update expression
        for api_field, db_field in field_mappings.items():
            if api_field in body:
                update_expression += f"#{db_field} = :{api_field}, "
                expression_attribute_values[f":{api_field}"] = body[api_field]
                expression_attribute_names[f"#{db_field}"] = db_field
        
        # Add updated timestamp
        from datetime import datetime
        timestamp = datetime.utcnow().isoformat()
        update_expression += "#UpdatedAt = :updatedAt"
        expression_attribute_values[":updatedAt"] = timestamp
        expression_attribute_names["#UpdatedAt"] = "UpdatedAt"
        
        # Update company in DynamoDB
        company_table.update_item(
            Key={'CompanyId': company_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values,
            ExpressionAttributeNames=expression_attribute_names
        )
        
        logger.info(f"Updated company: {company_id}")
        
        return generate_response(200, {'message': 'Company updated successfully'})
    
    except Exception as e:
        logger.error(f"Error updating company: {str(e)}")
        return generate_response(500, {'message': f'Error updating company: {str(e)}'})

# Delete a company
def delete_company(event):
    try:
        company_id = event['pathParameters']['companyId']
        
        # Check if company exists
        response = company_table.get_item(
            Key={'CompanyId': company_id}
        )
        
        if 'Item' not in response:
            return generate_response(404, {'message': 'Company not found'})
        
        # Delete company from DynamoDB
        company_table.delete_item(
            Key={'CompanyId': company_id}
        )
        
        logger.info(f"Deleted company: {company_id}")
        
        return generate_response(200, {'message': 'Company deleted successfully'})
    
    except Exception as e:
        logger.error(f"Error deleting company: {str(e)}")
        return generate_response(500, {'message': f'Error deleting company: {str(e)}'})