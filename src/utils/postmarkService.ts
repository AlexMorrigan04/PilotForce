// import postmark from 'postmark';

// const client = new postmark.ServerClient(process.env.REACT_APP_POSTMARK_API_KEY || '');

// /**
//  * Send a welcome email to the user
//  * @param userEmail - The email address of the user
//  * @param username - The username of the user
//  * @param companyName - The company name
//  * @param role - The user's role
//  */
// export const sendWelcomeEmail = async (
//   userEmail: string,
//   username: string,
//   companyName: string,
//   role: string
// ) => {
//   try {
//     const response = await client.sendEmail({
//       From: 'Mike@morriganconsulting.co.uk', // Your verified Postmark email
//       To: userEmail,
//       Subject: 'Welcome to PilotForce!',
//       HtmlBody: `
//         <p>Hi ${username},</p>
//         <p>Thank you for signing up for PilotForce. Your account has been created successfully.</p>
//         <p><strong>Company Name:</strong> ${companyName}</p>
//         <p><strong>Role:</strong> ${role}</p>
//         <p>If you have any questions, feel free to reach out to us.</p>
//         <p>Best regards,<br/>The PilotForce Team</p>
//       `,
//       TextBody: `
//         Hi ${username},
//         Thank you for signing up for PilotForce. Your account has been created successfully.
//         Company Name: ${companyName}
//         Role: ${role}
//         If you have any questions, feel free to reach out to us.
//         Best regards,
//         The PilotForce Team
//       `,
//       MessageStream: 'outbound',
//     });

//     console.log('Email sent successfully:', response);
//   } catch (error) {
//     console.error('Error sending email:', error);
//     throw error;
//   }
// };


export {}