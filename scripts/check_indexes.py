"""
This script checks the Global Secondary Index status and helps verify 
if all company records are properly indexed by the EmailDomainIndex
"""
import boto3
import json
import time
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')
companies_table = dynamodb.Table('Companies')
table_name = 'Companies'

# Custom JSON encoder to handle Decimal types
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)

def check_gsi_status():
    """Check the status of the Global Secondary Index"""
    try:
        response = dynamodb_client.describe_table(TableName=table_name)
        
        if 'Table' in response and 'GlobalSecondaryIndexes' in response['Table']:
            indexes = response['Table']['GlobalSecondaryIndexes']
            print(f"Found {len(indexes)} Global Secondary Indexes:")
            
            for index in indexes:
                index_name = index['IndexName']
                status = index['IndexStatus']
                print(f"Index: {index_name}, Status: {status}")
                
                if 'Backfilling' in index:
                    print(f"  Backfilling: {index['Backfilling']}")
                
                if 'ProvisionedThroughput' in index:
                    print(f"  Read Capacity Units: {index['ProvisionedThroughput']['ReadCapacityUnits']}")
                    print(f"  Write Capacity Units: {index['ProvisionedThroughput']['WriteCapacityUnits']}")
                
                print(f"  Projection Type: {index['Projection']['ProjectionType']}")
                if 'NonKeyAttributes' in index['Projection']:
                    print(f"  Projected Attributes: {', '.join(index['Projection']['NonKeyAttributes'])}")
        else:
            print(f"No GSIs found for table {table_name}")
            
        return True
    except Exception as e:
        print(f"Error checking GSI status: {str(e)}")
        return False

def verify_index_consistency():
    """Verify that all companies are properly indexed"""
    try:
        # Get all companies
        all_companies = []
        response = companies_table.scan()
        all_companies.extend(response.get('Items', []))
        
        while 'LastEvaluatedKey' in response:
            response = companies_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_companies.extend(response.get('Items', []))
        
        print(f"Found {len(all_companies)} companies in the table.")
        
        # Group by domain
        domain_map = {}
        for company in all_companies:
            domain = company.get('EmailDomain', '')
            if domain:
                domain_lower = domain.lower()
                if domain_lower not in domain_map:
                    domain_map[domain_lower] = []
                domain_map[domain_lower].append(company)
        
        # Check for duplicates
        duplicates = {domain: companies for domain, companies in domain_map.items() if len(companies) > 1}
        if duplicates:
            print(f"Found {len(duplicates)} domains with multiple companies:")
            for domain, companies in duplicates.items():
                print(f"  Domain '{domain}' has {len(companies)} companies:")
                for company in companies:
                    print(f"    - CompanyId: {company['CompanyId']}, Domain: {company.get('EmailDomain')}")
        else:
            print("No duplicate domains found.")
        
        # Verify domains are all lowercase
        uppercase_domains = [company for company in all_companies if 
                            company.get('EmailDomain') and 
                            company.get('EmailDomain') != company.get('EmailDomain').lower()]
        
        if uppercase_domains:
            print(f"Found {len(uppercase_domains)} companies with non-lowercase domains:")
            for company in uppercase_domains:
                print(f"  CompanyId: {company['CompanyId']}, Domain: {company.get('EmailDomain')}")
            
            fix = input("Would you like to normalize these domains to lowercase? (y/n): ")
            if fix.lower() == 'y':
                fix_uppercase_domains(uppercase_domains)
        else:
            print("All domains are properly lowercase.")
            
        # Test index lookups for each domain
        print("\nTesting index lookups for each domain...")
        for domain, companies in domain_map.items():
            try:
                response = companies_table.query(
                    IndexName='EmailDomainIndex',
                    KeyConditionExpression='EmailDomain = :domain',
                    ExpressionAttributeValues={
                        ':domain': domain
                    }
                )
                
                if 'Items' in response and response['Items']:
                    print(f"  ✓ Domain '{domain}' found in index")
                else:
                    print(f"  ✕ Domain '{domain}' NOT found in index!")
                    
                    # Try to fix the index
                    fix = input(f"Would you like to update company for domain '{domain}' to fix index? (y/n): ")
                    if fix.lower() == 'y':
                        for company in companies:
                            try:
                                companies_table.update_item(
                                    Key={'CompanyId': company['CompanyId']},
                                    UpdateExpression="SET EmailDomain = :domain, UpdatedAt = :updated",
                                    ExpressionAttributeValues={
                                        ':domain': domain,
                                        ':updated': time.strftime('%Y-%m-%dT%H:%M:%S')
                                    }
                                )
                                print(f"    Updated company {company['CompanyId']}")
                            except Exception as update_error:
                                print(f"    Error updating company: {str(update_error)}")
            except Exception as e:
                print(f"  Error testing index for domain '{domain}': {str(e)}")
        
        return True
    except Exception as e:
        print(f"Error verifying index consistency: {str(e)}")
        return False

def fix_uppercase_domains(companies):
    """Fix companies with uppercase domains by normalizing them to lowercase"""
    for company in companies:
        try:
            company_id = company['CompanyId']
            old_domain = company.get('EmailDomain', '')
            new_domain = old_domain.lower()
            
            companies_table.update_item(
                Key={'CompanyId': company_id},
                UpdateExpression="SET EmailDomain = :domain, UpdatedAt = :updated",
                ExpressionAttributeValues={
                    ':domain': new_domain,
                    ':updated': time.strftime('%Y-%m-%dT%H:%M:%S')
                }
            )
            print(f"Updated domain for company {company_id} from '{old_domain}' to '{new_domain}'")
        except Exception as e:
            print(f"Error updating company {company.get('CompanyId')}: {str(e)}")

if __name__ == "__main__":
    print("Checking Global Secondary Index status...")
    check_gsi_status()
    
    print("\nVerifying index consistency...")
    verify_index_consistency()
