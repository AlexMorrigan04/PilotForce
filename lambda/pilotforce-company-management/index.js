const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const ddb = new AWS.DynamoDB.DocumentClient();

/**
 * Extracts the domain from an email address
 * 
 * @param {string} email - Email to extract domain from
 * @returns {string} Domain portion of the email
 */
function extractEmailDomain(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '';
  }
  return email.split('@')[1];
}

/**
 * Processes a company creation request
 */
async function createCompany(event) {
  const body = JSON.parse(event.body);
  
  // Validate required fields
  if (!body.EmailDomain) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'EmailDomain is required' })
    };
  }
  
  // Use EmailDomain as CompanyName if not provided
  const companyName = body.CompanyName || body.EmailDomain.split('.')[0];
  
  try {
    // Check if company already exists
    const existingCompany = await ddb.query({
      TableName: 'Companies',
      IndexName: 'EmailDomainIndex',
      KeyConditionExpression: 'EmailDomain = :domain',
      ExpressionAttributeValues: {
        ':domain': body.EmailDomain
      }
    }).promise();
    
    if (existingCompany.Items && existingCompany.Items.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ 
          message: 'Company with this email domain already exists',
          company: existingCompany.Items[0]
        })
      };
    }
    
    // Create new company
    const companyId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const company = {
      CompanyId: companyId,
      EmailDomain: body.EmailDomain,
      CompanyName: companyName,
      CreatedAt: timestamp,
      UpdatedAt: timestamp
    };
    
    await ddb.put({
      TableName: 'Companies',
      Item: company
    }).promise();
    
    return {
      statusCode: 201,
      body: JSON.stringify(company)
    };
  } catch (error) {
    console.error('Error creating company:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
}

/**
 * Handles company user registration or sign-in
 */
async function processUserCompany(event) {
  const { email } = JSON.parse(event.body);
  
  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Email is required' })
    };
  }
  
  try {
    const emailDomain = extractEmailDomain(email);
    
    if (!emailDomain) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid email format' })
      };
    }
    
    // Find company by domain
    const companyResult = await ddb.query({
      TableName: 'Companies',
      IndexName: 'EmailDomainIndex',
      KeyConditionExpression: 'EmailDomain = :domain',
      ExpressionAttributeValues: {
        ':domain': emailDomain
      }
    }).promise();
    
    let company;
    
    // Create company if not found
    if (!companyResult.Items || companyResult.Items.length === 0) {
      const companyId = uuidv4();
      const timestamp = new Date().toISOString();
      const companyName = emailDomain.split('.')[0]; // Extract name from domain
      
      company = {
        CompanyId: companyId,
        EmailDomain: emailDomain,
        CompanyName: companyName,
        CreatedAt: timestamp,
        UpdatedAt: timestamp
      };
      
      await ddb.put({
        TableName: 'Companies',
        Item: company
      }).promise();
    } else {
      company = companyResult.Items[0];
    }
    
    // Process user association with company
    // ...existing code...
    
    return {
      statusCode: 200,
      body: JSON.stringify({ company })
    };
  } catch (error) {
    console.error('Error processing company user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
}

module.exports = {
  createCompany,
  processUserCompany
};