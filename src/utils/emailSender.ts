/**
 * Utility for reliable email sending via Formspree
 */

// Constants for email sending
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mvgkqjvr';
const ADMIN_EMAIL = 'admin@pilotforce.com';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Sends an email with retry logic similar to the shell script approach
 * 
 * @param emailData The data for the email
 * @returns Promise resolving to success status
 */
export async function sendReliableEmail(emailData: any): Promise<boolean> {
  const recipient = emailData.to || ADMIN_EMAIL;
  const ccRecipients = emailData.cc ? emailData.cc.join(', ') : '';
  const bccRecipients = emailData.bcc ? emailData.bcc.join(', ') : '';


  // Create a standardized payload for Formspree
  const payload: any = {
    name: emailData.name || '',
    email: emailData.email || '',
    subject: emailData.subject || 'PilotForce Notification',
    message: emailData.message || '',
    to: recipient, // Main recipient
    cc: emailData.cc || [], // CC recipients
    bcc: emailData.bcc || [], // BCC recipients
    ...emailData,
  };

  let attempts = 0;
  let success = false;

  while (attempts <= MAX_RETRIES && !success) {
    try {
      attempts++;

      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        success = true;
        break;
      } else {
        const errorText = await response.text();
        if (attempts <= MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    } catch (error) {
      if (attempts <= MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  return success;
}

/**
 * Send a new company registration notification
 */
export async function sendNewCompanyNotification(userData: any): Promise<boolean> {
  const { username, email, companyId, companyName, emailDomain, phoneNumber } = userData;
  
  // Plain text content instead of HTML
  const textContent = `
New Company Registration

A new company has registered on PilotForce and needs your approval.

Company Details:
Company Name: ${companyName}
Company ID: ${companyId}
Email Domain: ${emailDomain}

Admin User Details:
Username: ${username}
Email: ${email}
Phone: ${phoneNumber || 'Not provided'}
  `;
  
  return await sendReliableEmail({
    name: username,
    email: email,
    to: 'Mike@morriganconsulting.co.uk', // Primary system admin
    cc: [email], // CC the user so they know their request was received
    subject: `New Company Registration: ${companyName}`,
    message: textContent,
    type: 'newCompany',
    companyId,
    companyName,
    emailDomain,
    phoneNumber
  });
}

/**
 * Send a new user registration notification
 * @param userData - User data including company information
 * @returns Promise resolving to success status
 */
export async function sendNewUserNotification(userData: any): Promise<boolean> {
  const { username, email, companyId, companyName, phoneNumber, adminEmails } = userData;
  
  // Plain text content instead of HTML
  const textContent = `
New User Registration

A new user has requested to join your PilotForce company account and needs your approval.

User Details:
Username: ${username}
Email: ${email}
Phone: ${phoneNumber || 'Not provided'}
Company ID: ${companyId}
Company Name: ${companyName || 'Unknown'}
  `;

  // Get admin emails either from provided data or fetch them
  const companyAdmins = adminEmails || await getCompanyAdminEmails(companyId);
  
  // Log the email delivery plan
  if (companyAdmins.length > 0) {
  }
  
  try {
    // If we have company admins, notify them (with system admin in BCC)
    if (companyAdmins.length > 0) {
      return await sendReliableEmail({
        name: username,
        email: email,
        to: companyAdmins[0], // Primary admin as main recipient
        cc: [email], // CC the user so they know their request was received
        bcc: companyAdmins.length > 1 ? 
          ['Mike@morriganconsulting.co.uk', ...companyAdmins.slice(1)] : 
          ['Mike@morriganconsulting.co.uk'], // BCC other admins and system admin
        subject: `New User Registration: ${username}`,
        message: textContent,
        type: 'newUser',
        companyId,
        companyName,
        phoneNumber
      });
    }
    
    // If no company admins found, notify system admin with user in CC
    return await sendReliableEmail({
      name: username,
      email: email,
      to: 'Mike@morriganconsulting.co.uk', // System admin
      cc: [email], // CC the user so they know their request was received
      subject: `New User Registration (No Company Admin): ${username}`,
      message: textContent,
      type: 'newUser',
      companyId,
      companyName,
      phoneNumber
    });
  } catch (error) {
    
    // Fallback - send directly to system admin as a last resort
    return await sendReliableEmail({
      name: username,
      email: email,
      to: 'Mike@morriganconsulting.co.uk',
      cc: [email],
      subject: `New User Registration (Error Recovery): ${username}`,
      message: textContent,
      type: 'newUser',
      companyId,
      companyName,
      phoneNumber
    });
  }
}

/**
 * Get admin emails for a company from DynamoDB
 */
async function getCompanyAdminEmails(companyId: string): Promise<string[]> {
  try {
    
    // Use AWS SDK with environment variables
    const AWS = require('aws-sdk');
    const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
      region: process.env.REACT_APP_AWS_REGION,
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
    });
    
    // Query for company admins
    const params = {
      TableName: 'Users',
      FilterExpression: 'CompanyId = :companyId AND (UserRole = :adminRole OR UserRole = :accountAdminRole) AND UserAccess = :access',
      ExpressionAttributeValues: {
        ':companyId': companyId,
        ':adminRole': 'Admin',
        ':accountAdminRole': 'AccountAdmin',
        ':access': true
      }
    };
    
    const result = await dynamoDb.scan(params).promise();
    
    if (result.Items && result.Items.length > 0) {
      // Extract admin emails
      const adminEmails = result.Items
        .map((admin: { Email?: string; email?: string }) => admin.Email || admin.email)
        .filter(Boolean) as string[];
      
      return adminEmails;
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}

// Example utility function that could be used for debugging or testing
export async function notifyAdminOfNewUser(username: string, email: string, companyId: string, companyName: string, phoneNumber: string) {
  const adminEmails = ['Mike@morriganconsulting.co.uk'];
  const textContent = `New user ${username} has registered with company ${companyName}.`;

  await sendReliableEmail({
    name: username,
    email: email,
    to: ADMIN_EMAIL, // Primary recipient
    cc: adminEmails, // CC admins
    bcc: ['audit@pilotforce.com'], // BCC example
    subject: `New User Registration: ${username}`,
    message: textContent,
    type: 'newUser',
    companyId,
    companyName,
    phoneNumber,
  });
}
