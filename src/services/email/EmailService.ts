/**
 * EmailService.ts - A flexible email service with SendGrid integration
 * 
 * This service can switch between different email providers
 * based on the environment configuration.
 */

import axios from 'axios';

// Default Formspree configuration (for development)
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mvgkqjvr';

// Env configuration
const SENDGRID_API_KEY = process.env.REACT_APP_SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.REACT_APP_SENDGRID_FROM_EMAIL || 'noreply@pilotforce.com';
const EMAIL_PROVIDER = process.env.REACT_APP_EMAIL_PROVIDER || 'formspree';
const API_GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_URL;

// Email providers
enum EmailProvider {
  SENDGRID = 'sendgrid',
  FORMSPREE = 'formspree',
  SES = 'ses',
  API_GATEWAY = 'api_gateway'
}

// Email data interface
export interface EmailData {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: any[];
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  [key: string]: any; // Allow additional properties for provider-specific features
}

class EmailService {
  private provider: EmailProvider;
  
  constructor(provider?: EmailProvider) {
    this.provider = provider || (EMAIL_PROVIDER as EmailProvider);
  }
  
  /**
   * Send an email using the configured provider
   * @param emailData The email data to send
   * @returns A promise resolving to the success status
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      switch (this.provider) {
        case EmailProvider.SENDGRID:
          return await this.sendWithSendGrid(emailData);
        case EmailProvider.SES:
          return await this.sendWithSES(emailData);
        case EmailProvider.API_GATEWAY:
          return await this.sendWithAPIGateway(emailData);
        case EmailProvider.FORMSPREE:
        default:
          return await this.sendWithFormspree(emailData);
      }
    } catch (error) {
      // Fall back to Formspree if other methods fail
      if (this.provider !== EmailProvider.FORMSPREE) {
        try {
          return await this.sendWithFormspree(emailData);
        } catch (fallbackError) {
          return false;
        }
      }
      return false;
    }
  }
  
  /**
   * Send an email using SendGrid API
   * @param emailData The email data to send
   * @returns A promise resolving to the success status
   */
  private async sendWithSendGrid(emailData: EmailData): Promise<boolean> {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }
    
    // Prepare SendGrid message format
    const message = {
      to: emailData.to,
      from: emailData.from || SENDGRID_FROM_EMAIL,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      cc: emailData.cc,
      bcc: emailData.bcc,
    };
    
    // Add template data if provided
    if (emailData.templateId) {
      Object.assign(message, {
        template_id: emailData.templateId,
        dynamic_template_data: emailData.dynamicTemplateData || {},
      });
    }
    
    try {
      const response = await axios.post('https://api.sendgrid.com/v3/mail/send', message, {
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Send an email using Formspree (fallback for development)
   * @param emailData The email data to send
   * @returns A promise resolving to the success status
   */
  private async sendWithFormspree(emailData: EmailData): Promise<boolean> {
    try {
      // Prepare Formspree data format - it accepts a simpler format
      const formspreeData = {
        email: Array.isArray(emailData.to) ? emailData.to[0] : emailData.to,
        _replyto: emailData.replyTo || (emailData.from || SENDGRID_FROM_EMAIL),
        _subject: emailData.subject,
        message: emailData.text || this.stripHtml(emailData.html || ''),
        ...emailData, // Include any other fields
      };
      
      const response = await axios.post(FORMSPREE_ENDPOINT, formspreeData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Send an email using AWS SES (for production)
   * This method would be implemented when you move to production
   */
  private async sendWithSES(emailData: EmailData): Promise<boolean> {
    // This would be implemented when you set up SES in production
    // For now, we'll just fall back to SendGrid or Formspree
    if (SENDGRID_API_KEY) {
      return this.sendWithSendGrid(emailData);
    } else {
      return this.sendWithFormspree(emailData);
    }
  }
  
  /**
   * Send an email via API Gateway
   * This is useful if you want to keep API keys server-side
   */
  private async sendWithAPIGateway(emailData: EmailData): Promise<boolean> {
    if (!API_GATEWAY_URL) {
      throw new Error('API Gateway URL not configured');
    }
    
    try {
      const response = await axios.post(`${API_GATEWAY_URL}/send-email`, emailData);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Helper to strip HTML for plain text
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Send an invitation email
   * @param invitationData Invitation data
   * @returns Promise<boolean> Success status
   */
  async sendInvitation(invitationData: {
    recipientEmail: string;
    companyName: string;
    companyId: string;
    invitationToken: string;
    senderName: string;
    senderEmail: string;
    role?: string;
  }): Promise<boolean> {
    const {
      recipientEmail,
      companyName,
      invitationToken,
      senderName,
      senderEmail,
      role
    } = invitationData;
    
    // Generate the invitation URL with the token
    const baseUrl = process.env.REACT_APP_BASE_URL || window.location.origin;
    const invitationUrl = `${baseUrl}/join?token=${invitationToken}&company=${invitationData.companyId}`;
    
    // Create HTML and text versions of the email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #3182ce; margin-bottom: 20px;">You've Been Invited to PilotForce</h2>
        
        <p>Hello,</p>
        
        <p><strong>${senderName}</strong> (${senderEmail}) has invited you to join <strong>${companyName}</strong> on PilotForce, the drone flight booking and management platform.</p>
        
        ${role ? `<p>You will be assigned the role of: <strong>${role}</strong></p>` : ''}
        
        <p>To accept this invitation, please click the button below:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${invitationUrl}" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #718096;">
          This invitation link will expire in 7 days. If you have any questions, please contact ${senderEmail}.
        </p>
        
        <p style="margin-top: 30px; font-size: 12px; color: #718096;">
          The PilotForce Team
        </p>
      </div>
    `;
    
    const textContent = `
Hello,

You've been invited to join ${companyName} on PilotForce.

${senderName} (${senderEmail}) has invited you to join their organization on PilotForce, the drone flight booking and management platform.

${role ? `You will be assigned the role of: ${role}` : ''}

To accept this invitation, please visit the following link:
${invitationUrl}

This invitation link will expire in 7 days.

If you have any questions, please contact ${senderEmail}.

The PilotForce Team
    `;
    
    return this.sendEmail({
      to: recipientEmail,
      subject: `Invitation to join ${companyName} on PilotForce`,
      from: SENDGRID_FROM_EMAIL,
      text: textContent,
      html: htmlContent,
      replyTo: senderEmail,
      // Additional metadata for tracking
      type: 'invitation',
      companyName,
      invitationUrl
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();

// Also export the class for custom instantiation
export default EmailService;