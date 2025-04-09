"""
This script helps fix company assignment issues by:
1. Finding duplicate companies for the same email domain
2. Merging users from duplicate companies into a single company
3. Removing duplicate company entries
"""
import boto3
import json
from botocore.exceptions import ClientError
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
companies_table = dynamodb.Table('Companies')
users_table = dynamodb.Table('Users')

# Custom JSON encoder to handle Decimal types
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)

def normalize_domain(domain):
    """Normalize email domain to lowercase"""
    return domain.lower() if domain else None

def scan_companies():
    """Scan all companies and group by normalized email domain"""
    companies_by_domain = {}
    
    try:
        response = companies_table.scan()
        items = response.get('Items', [])
        
        for company in items:
            domain = company.get('EmailDomain', '')
            normalized = normalize_domain(domain)
            
            if normalized:
                if normalized not in companies_by_domain:
                    companies_by_domain[normalized] = []
                companies_by_domain[normalized].append(company)
    
        # Find domains with multiple companies
        duplicates = {domain: companies for domain, companies in companies_by_domain.items() if len(companies) > 1}
        
        print(f"Found {len(duplicates)} domains with multiple companies:")
        for domain, companies in duplicates.items():
            print(f"Domain '{domain}' has {len(companies)} companies")
            
        return duplicates
    except Exception as e:
        print(f"Error scanning companies: {e}")
        return {}

def find_users_by_company(company_id):
    """Find all users belonging to a company"""
    users = []
    
    try:
        response = users_table.query(
            IndexName='CompanyIdIndex',
            KeyConditionExpression='CompanyId = :cid',
            ExpressionAttributeValues={
                ':cid': company_id
            }
        )
        users = response.get('Items', [])
        print(f"Found {len(users)} users for company {company_id}")
        return users
    except Exception as e:
        print(f"Error finding users for company {company_id}: {e}")
        return []

def fix_company_duplicates():
    """Fix duplicate companies by merging users into the oldest company"""
    duplicates = scan_companies()
    
    for domain, companies in duplicates.items():
        print(f"\nFixing duplicates for domain '{domain}'")
        
        # Sort companies by creation date, oldest first
        sorted_companies = sorted(companies, key=lambda x: x.get('CreatedAt', ''))
        
        if not sorted_companies:
            continue
        
        # Keep the oldest company
        primary_company = sorted_companies[0]
        primary_id = primary_company['CompanyId']
        
        print(f"Primary company: {primary_id} created at {primary_company.get('CreatedAt')}")
        
        # Process other duplicate companies
        for duplicate in sorted_companies[1:]:
            duplicate_id = duplicate['CompanyId']
            print(f"Processing duplicate: {duplicate_id} created at {duplicate.get('CreatedAt')}")
            
            # Find users of the duplicate company
            duplicate_users = find_users_by_company(duplicate_id)
            
            # Update each user to the primary company
            for user in duplicate_users:
                try:
                    user_id = user['UserId']
                    print(f"  Updating user {user_id} from company {duplicate_id} to {primary_id}")
                    
                    users_table.update_item(
                        Key={'UserId': user_id},
                        UpdateExpression="SET CompanyId = :cid",
                        ExpressionAttributeValues={
                            ':cid': primary_id
                        }
                    )
                except Exception as e:
                    print(f"  Error updating user {user.get('UserId', 'unknown')}: {e}")
            
            # Optionally delete the duplicate company
            try:
                print(f"  Deleting duplicate company {duplicate_id}")
                companies_table.delete_item(
                    Key={'CompanyId': duplicate_id}
                )
            except Exception as e:
                print(f"  Error deleting company {duplicate_id}: {e}")

def print_company_info(email_domain):
    """Print information about companies for a specific domain"""
    domain = normalize_domain(email_domain)
    
    try:
        # Scan for companies with this domain
        response = companies_table.scan(
            FilterExpression='EmailDomain = :domain',
            ExpressionAttributeValues={
                ':domain': domain
            }
        )
        
        companies = response.get('Items', [])
        print(f"Found {len(companies)} companies for domain '{domain}':")
        
        for company in companies:
            company_id = company['CompanyId']
            print(f"\nCompany ID: {company_id}")
            print(json.dumps(company, indent=2, cls=DecimalEncoder))
            
            # Find users for this company
            users = find_users_by_company(company_id)
            print(f"Users for company {company_id}: {len(users)}")
            for user in users:
                print(f"  User: {user.get('Username', 'unknown')} ({user.get('Email', 'no email')})")
    
    except Exception as e:
        print(f"Error retrieving company info: {e}")

if __name__ == "__main__":
    choice = input("Choose an action: (1) Scan for duplicates, (2) Fix duplicates, (3) Print company info: ")
    
    if choice == "1":
        scan_companies()
    elif choice == "2":
        confirm = input("This will modify your database. Are you sure? (y/n): ")
        if confirm.lower() == "y":
            fix_company_duplicates()
        else:
            print("Operation cancelled")
    elif choice == "3":
        domain = input("Enter the email domain to check (e.g., gmail.com): ")
        print_company_info(domain)
    else:
        print("Invalid choice")
