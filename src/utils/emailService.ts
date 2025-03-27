import { Resend } from 'resend';

// Use environment variable for API key
const resend = new Resend(process.env.REACT_APP_RESEND_API_KEY || '');

/**
 * Send an email notification to the admin when a new user signs up
 * @param adminEmail - The email address of the admin to notify
 * @param newUser - Object containing details of the new user
 * @returns Promise resolving to the response from Resend API
 */
export const sendNewUserNotification = async (
  adminEmail: string,
  newUser: {
    username: string;
    email: string;
    companyId: string;
    companyName?: string;
    role?: string;
    phoneNumber?: string;
  }
) => {
  try {
    const { username, email, companyId, companyName, role, phoneNumber } = newUser;
    
    // Create HTML content for the email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #3182ce; margin-bottom: 20px;">New User Registration</h2>
        <p>A new user has requested to join your PilotForce company account and needs your approval.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4a5568;">User Details:</h3>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone Number:</strong> ${phoneNumber || 'Not provided'}</p>
          <p><strong>Company ID:</strong> ${companyId}</p>
          ${companyName ? `<p><strong>Company:</strong> ${companyName}</p>` : ''}
          <p><strong>Requested Role:</strong> ${role || 'Standard User'}</p>
        </div>
        
        <p>Please log in to your PilotForce admin dashboard to approve or reject this request.</p>
        
        <div style="margin-top: 30px;">
          <a href="https://pilotforce.vercel.app/dashboard" 
             style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #718096;">
          This is an automated message from PilotForce. Please do not reply directly to this email.
        </p>
      </div>
    `;

    // If using Formspree instead of Resend
    const formspreeResponse = await fetch('https://formspree.io/f/mvgkqjvr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: adminEmail,
        subject: 'New User Registration Requires Your Approval',
        message: html,
        replyTo: email,
        username,
        userEmail: email,
        phoneNumber: phoneNumber || 'Not provided',
        companyId,
        companyName,
        role
      })
    });

    return formspreeResponse;
  } catch (error) {
    console.error('Error sending new user notification:', error);
    throw error;
  }
};

/**
 * Get admin email addresses for a specific company
 * @param companyId - The company ID to find admins for
 * @param dynamoDb - DynamoDB Document Client instance
 * @returns Promise resolving to an array of admin email addresses
 */
export const getCompanyAdminEmails = async (companyId: string, dynamoDb: AWS.DynamoDB.DocumentClient) => {
  try {
    console.log(`Fetching admin emails for company: ${companyId}`);
    
    // First try to get admins by company ID
    const companyParams = {
      TableName: 'Users',
      FilterExpression: 'CompanyId = :companyId AND (UserRole = :adminRole OR UserRole = :accountAdminRole) AND UserAccess = :access',
      ExpressionAttributeValues: {
        ':companyId': companyId,
        ':adminRole': 'Admin',
        ':accountAdminRole': 'AccountAdmin',
        ':access': true
      }
    };
    
    const companyAdmins = await dynamoDb.scan(companyParams).promise();
    console.log(`Found ${companyAdmins.Items?.length || 0} admins by company ID`);
    
    if (companyAdmins.Items && companyAdmins.Items.length > 0) {
      // Extract email addresses
      const adminEmails = companyAdmins.Items
        .map(admin => admin.Email || admin.email)
        .filter(Boolean) as string[];
      
      console.log(`Admin emails by company ID: ${adminEmails.join(', ')}`);
      return adminEmails;
    }
    
    // If no admins found by company ID, try to find a matching domain
    // First get a user from this company to get their email domain
    const userParams = {
      TableName: 'Users',
      FilterExpression: 'CompanyId = :companyId',
      ExpressionAttributeValues: {
        ':companyId': companyId
      },
      Limit: 1
    };
    
    const companyUsers = await dynamoDb.scan(userParams).promise();
    
    if (companyUsers.Items && companyUsers.Items.length > 0) {
      const userEmail = companyUsers.Items[0].Email || companyUsers.Items[0].email;
      
      if (userEmail && userEmail.includes('@')) {
        const emailDomain = userEmail.split('@')[1];
        console.log(`Trying to find admins by email domain: ${emailDomain}`);
        
        // Try to find admins with the same email domain
        const domainParams = {
          TableName: 'Users',
          FilterExpression: 'contains(Email, :domain) AND (UserRole = :adminRole OR UserRole = :accountAdminRole) AND UserAccess = :access',
          ExpressionAttributeValues: {
            ':domain': '@' + emailDomain,
            ':adminRole': 'Admin',
            ':accountAdminRole': 'AccountAdmin',
            ':access': true
          }
        };
        
        const domainAdmins = await dynamoDb.scan(domainParams).promise();
        console.log(`Found ${domainAdmins.Items?.length || 0} admins by email domain`);
        
        if (domainAdmins.Items && domainAdmins.Items.length > 0) {
          // Extract email addresses
          const adminEmails = domainAdmins.Items
            .map(admin => admin.Email || admin.email)
            .filter(Boolean) as string[];
          
          console.log(`Admin emails by domain: ${adminEmails.join(', ')}`);
          return adminEmails;
        }
      }
    }
    
    console.log("No admin emails found for company, using system admin email");
    // Fallback to system admin email
    return ['Mike@morriganconsulting.co.uk'];
  } catch (error) {
    console.error('Error getting company admin emails:', error);
    // Fallback to system admin email in case of error
    return ['Mike@morriganconsulting.co.uk'];
  }
};

/**
 * Send an email notification to the system admin for a new company registration
 * @param newCompany - Object containing details of the new company and admin
 * @returns Promise resolving to the response from Formspree
 */
export const sendNewCompanyNotification = async (
  newCompany: {
    username: string;
    email: string;
    companyId: string;
    companyName: string;
    emailDomain: string;
    phoneNumber?: string;
  }
) => {
  try {
    const { username, email, companyId, companyName, emailDomain, phoneNumber } = newCompany;

    // Create HTML content for the email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #3182ce; margin-bottom: 20px;">New Company Registration</h2>
        <p>A new company has been registered on PilotForce and needs your approval.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4a5568;">Company Details:</h3>
          <p><strong>Company Name:</strong> ${companyName}</p>
          <p><strong>Company ID:</strong> ${companyId}</p>
          <p><strong>Email Domain:</strong> ${emailDomain}</p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4a5568;">Admin User Details:</h3>
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone Number:</strong> ${phoneNumber || 'Not provided'}</p>
        </div>
        
        <p>Please log in to your PilotForce system admin dashboard to approve or reject this company registration.</p>
        
        <div style="margin-top: 30px;">
          <a href="https://pilotforce.vercel.app/admin" 
             style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Go to Admin Dashboard
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #718096;">
          This is an automated message from PilotForce. Please do not reply directly to this email.
        </p>
      </div>
    `;

    // Send via Formspree
    const formspreeResponse = await fetch('https://formspree.io/f/mvgkqjvr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'Mike@morriganconsulting.co.uk', // System admin email
        subject: 'New Company Registration Requires Your Approval',
        message: html,
        replyTo: email,
        username,
        userEmail: email,
        phoneNumber: phoneNumber || 'Not provided',
        companyId,
        companyName,
        emailDomain,
        type: 'new-company-registration'
      })
    });

    return formspreeResponse;
  } catch (error) {
    console.error('Error sending new company notification:', error);
    throw error;
  }
};
