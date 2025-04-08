/**
 * Utility functions for interacting with Formspree
 */

// Formspree endpoint
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mvgkqjvr"; // Replace with your actual token

/**
 * Define types for email notifications
 */
interface EmailData {
  to: string | string[];
  subject: string;
  username: string;
  email: string;
  phoneNumber?: string;
  companyId: string;
  companyName?: string;
  role?: string;
  emailDomain?: string;
  isNewCompany?: boolean;
  url?: string;
  messageType?: string;
  html?: string; // Add the HTML property to fix the TypeScript error
  text?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Send an email notification via Formspree
 * 
 * @param data The data to send in the email
 * @returns Promise with the response
 */
export const sendEmailNotification = async (data: any) => {
  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Formspree error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
};

/**
 * Send an email notification when a user signs up
 * 
 * @param data User and signup details
 * @returns Promise with the Formspree response
 */
export const sendSignupNotification = async (data: any) => {
  try {
    // Determine if this is a new company admin or a regular user
    const isNewCompanyAdmin = data.isNewCompany && data.role === 'AccountAdmin';
    
    // Handle recipient(s)
    let recipients: string | string[];
    let ccRecipients: string | string[] = [];
    
    if (isNewCompanyAdmin) {
      // For new companies, send to system admin
      recipients = 'Mike@morriganconsulting.co.uk';
    } else if (Array.isArray(data.adminEmails) && data.adminEmails.length > 0) {
      // For existing companies with admins, send to all admins
      recipients = data.adminEmails.join(',');
      // Always CC the system admin
      ccRecipients = ['Mike@morriganconsulting.co.uk'];
    } else if (typeof data.to === 'string' && data.to.length > 0) {
      // Alternative way to specify recipients directly
      recipients = data.to;
      // If there's a CC field in the data, use it
      if (data.cc) {
        ccRecipients = typeof data.cc === 'string' ? [data.cc] : data.cc;
      } else {
        // Always CC the system admin
        ccRecipients = ['Mike@morriganconsulting.co.uk'];
      }
    } else {
      // Fallback to system admin
      recipients = 'Mike@morriganconsulting.co.uk';
    }
    
    console.log(`Sending notification to recipients: ${recipients}`);
    if (ccRecipients.length > 0) {
      console.log(`CC recipients: ${Array.isArray(ccRecipients) ? ccRecipients.join(', ') : ccRecipients}`);
    }
    
    // Prepare the email data with explicit _cc field that Formspree understands
    const emailData: EmailData = {
      to: recipients,
      _cc: Array.isArray(ccRecipients) && ccRecipients.length > 0 ? ccRecipients.join(',') : undefined, // Use _cc for Formspree
      subject: isNewCompanyAdmin 
        ? `New Company Registration: ${data.companyName}` 
        : `New User Registration: ${data.username}`,
      username: data.username,
      email: data.email,
      phoneNumber: data.phoneNumber || 'Not provided',
      companyId: data.companyId,
      companyName: data.companyName,
      role: data.role,
      emailDomain: data.emailDomain,
      isNewCompany: data.isNewCompany,
      url: isNewCompanyAdmin 
        ? 'https://pilotforce.vercel.app/admin/companies' 
        : 'https://pilotforce.vercel.app/dashboard/users',
      messageType: isNewCompanyAdmin ? 'new-company' : 'new-user'
    };
    
    // Create HTML email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #3182ce; margin-bottom: 20px;">
          ${isNewCompanyAdmin ? 'New Company Registration' : 'New User Registration'}
        </h2>
        
        <p>
          ${isNewCompanyAdmin 
            ? 'A new company has been registered on PilotForce and needs your approval.' 
            : 'A new user has requested to join your PilotForce company account and needs your approval.'}
        </p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          ${isNewCompanyAdmin ? '<h3 style="margin-top: 0; color: #4a5568;">Company Details:</h3>' : ''}
          ${isNewCompanyAdmin ? `<p><strong>Company Name:</strong> ${data.companyName}</p>` : ''}
          ${isNewCompanyAdmin ? `<p><strong>Company ID:</strong> ${data.companyId}</p>` : ''}
          ${isNewCompanyAdmin ? `<p><strong>Email Domain:</strong> ${data.emailDomain}</p>` : ''}
          
          <h3 style="margin-top: 0; color: #4a5568;">User Details:</h3>
          <p><strong>Username:</strong> ${data.username}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone Number:</strong> ${data.phoneNumber || 'Not provided'}</p>
          ${!isNewCompanyAdmin ? `<p><strong>Company ID:</strong> ${data.companyId}</p>` : ''}
          ${!isNewCompanyAdmin && data.companyName ? `<p><strong>Company:</strong> ${data.companyName}</p>` : ''}
          <p><strong>Requested Role:</strong> ${data.role || 'Standard User'}</p>
        </div>
        
        <p>
          ${isNewCompanyAdmin 
            ? 'Please log in to your PilotForce system admin dashboard to approve or reject this company registration.' 
            : 'Please log in to your PilotForce admin dashboard to approve or reject this request.'}
        </p>
        
        <div style="margin-top: 30px;">
          <a href="${emailData.url}" 
             style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ${isNewCompanyAdmin ? 'Go to Admin Dashboard' : 'Go to Dashboard'}
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #718096;">
          This is an automated message from PilotForce. Please do not reply directly to this email.
        </p>
      </div>
    `;
    
    // Attach the HTML to the email data
    emailData.html = html;
    
    // Log the final payload for debugging
    console.log('Sending email with payload:', {
      to: emailData.to,
      _cc: emailData._cc,
      subject: emailData.subject,
    });
    
    // Send via Formspree with the correct payload structure
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      console.error('Formspree API error:', await response.text());
      throw new Error(`Formspree error: ${response.statusText}`);
    }
    
    console.log('Email notification sent successfully via Formspree');
    return await response.json();
  } catch (error) {
    console.error('Error sending signup notification:', error);
    throw error;
  }
};

/**
 * Format a booking object for Formspree email with HTML formatting
 */
export const formatBookingForEmail = (
  booking: any, 
  asset: any, 
  user: any, 
  scheduleInfo: any, 
  userDetails: any = null,
  companyDetails: any = null
) => {
  // Prepare the data object with all needed information
  const data = {
    bookingId: booking?.id || booking?.BookingId || 'BK-' + Math.floor(Math.random() * 10000),
    timestamp: booking?.createdAt || new Date().toISOString(),
    bookingDetails: {
      jobType: booking?.jobType || 'Standard Inspection',
      status: booking?.status || 'Pending',
      date: booking?.flightDate || scheduleInfo?.date || new Date().toISOString(),
      scheduleType: scheduleInfo?.type || 'One-time'
    },
    assetDetails: {
      name: asset?.name || 'Unnamed Asset',
      type: asset?.type || 'Property',
      id: asset?.id || asset?.AssetId || '',
      area: asset?.area || asset?.size || 'Unknown',
      location: asset?.location || booking?.location || 'No location provided'
    },
    customerName: user?.name || user?.username || userDetails?.name || 'Customer',
    companyName: companyDetails?.name || 'Company',
    emailDomain: userDetails?.email ? userDetails.email.split('@')[1] : 'unknown.com',
    userDetails: userDetails || { email: user?.email || 'No email provided' }
  };

  const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9fafb;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .logo {
          max-width: 200px;
          height: auto;
        }
        .booking-title {
          font-size: 24px;
          color: #2563eb;
          margin-top: 0;
        }
        .section {
          margin: 24px 0;
          padding-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .field-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .field-value {
          font-size: 16px;
          font-weight: 500;
          color: #1f2937;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 500;
          background-color: #fef3c7;
          color: #92400e;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          margin-top: 24px;
        }
        .highlight {
          padding: 16px;
          background-color: #f3f4f6;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        .cta-button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
          margin-top: 16px;
        }
        @media (max-width: 600px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="booking-title">New PilotForce Booking</h1>
          <p>A new drone flight booking has been created</p>
        </div>

        <div class="highlight">
          <div class="field-label">Booking Reference:</div>
          <div class="field-value">${data.bookingId}</div>
          <div class="field-label">Created:</div>
          <div class="field-value">${new Date(data.timestamp).toLocaleString()}</div>
        </div>

        <div class="section">
          <h2 class="section-title">Flight Details</h2>
          <div class="grid">
            <div>
              <div class="field-label">Job Type:</div>
              <div class="field-value">${data.bookingDetails.jobType}</div>
            </div>
            <div>
              <div class="field-label">Status:</div>
              <div class="status-badge">${data.bookingDetails.status}</div>
            </div>
            <div>
              <div class="field-label">Flight Date:</div>
              <div class="field-value">${new Date(data.bookingDetails.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div class="field-label">Schedule Type:</div>
              <div class="field-value">${data.bookingDetails.scheduleType}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Asset Information</h2>
          <div class="grid">
            <div>
              <div class="field-label">Asset Name:</div>
              <div class="field-value">${data.assetDetails.name}</div>
            </div>
            <div>
              <div class="field-label">Asset Type:</div>
              <div class="field-value">${data.assetDetails.type}</div>
            </div>
            <div>
              <div class="field-label">Asset ID:</div>
              <div class="field-value">${data.assetDetails.id}</div>
            </div>
            <div>
              <div class="field-label">Area Size:</div>
              <div class="field-value">${data.assetDetails.area} m²</div>
            </div>
            <div class="field-label">Location:</div>
            <div class="field-value">${data.assetDetails.location}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Customer Information</h2>
          <div class="grid">
            <div>
              <div class="field-label">Customer Name:</div>
              <div class="field-value">${data.customerName}</div>
            </div>
            <div>
              <div class="field-label">Email:</div>
              <div class="field-value">${data.userDetails.email}</div>
            </div>
            <div>
              <div class="field-label">Company:</div>
              <div class="field-value">${data.companyName}</div>
            </div>
            <div>
              <div class="field-label">Email Domain:</div>
              <div class="field-value">${data.emailDomain}</div>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="https://dashboard.pilotforceapp.com/bookings/${data.bookingId}" class="cta-button">
            View Booking Details
          </a>
        </div>

        <div class="footer">
          <p>This is an automated notification from PilotForce.</p>
          <p>&copy; ${new Date().getFullYear()} PilotForce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return htmlEmail;
};

const formspreeUtils = {
  sendEmailNotification,
  sendSignupNotification,
  formatBookingForEmail
};

export default formspreeUtils;
