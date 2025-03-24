import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginImage from '../images/login-image.avif';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { sendNewUserNotification, getCompanyAdminEmails } from '../utils/emailService';

// Setup AWS
const awsRegion = process.env.REACT_APP_AWS_REGION;
const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
const secretKey = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

const dynamoDb = new AWS.DynamoDB.DocumentClient({ 
  region: awsRegion,
  accessKeyId: accessKey,
  secretAccessKey: secretKey
});

const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // Add phone number state
  const [passwordError, setPasswordError] = useState('');
  const [signupStatus, setSignupStatus] = useState<string | null>(null);
  const [isNewCompanyEmail, setIsNewCompanyEmail] = useState<boolean | null>(null);
  const [localLoading, setLocalLoading] = useState(false); // Added local loading state
  const [localError, setLocalError] = useState<string | null>(null); // Added local error state
  const [selectedRole, setSelectedRole] = useState('User'); // Added role selection
  const [companyName, setCompanyName] = useState(''); // Added company name
  
  const { signUp, error, loading } = useAuth();
  const navigate = useNavigate();

  // Check email domain against existing patterns
  const checkEmailType = async (email: string) => {
    if (!email || !email.includes('@')) {
      setIsNewCompanyEmail(null);
      return;
    }
    
    const domain = email.split('@')[1];
    
    // This would ideally check against your database
    // For now, we'll use a simplified approach with a timeout to simulate async check
    setTimeout(() => {
      // Here we're just checking if it's a common public email provider
      // In a real app, you'd query your database to check if this domain already exists
      const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
      setIsNewCompanyEmail(!commonDomains.includes(domain));
      
      // Suggest a company name based on email domain if it's a new company email
      if (!commonDomains.includes(domain) && !companyName) {
        const suggestedName = domain
          .split('.')[0]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setCompanyName(suggestedName);
      }
    }, 500);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    checkEmailType(newEmail);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    // Clear any previous password errors
    setPasswordError('');
    
    // Validate phone number
    if (!phoneNumber.trim()) {
      setLocalError('Phone number is required');
      return;
    }
    
    setLocalLoading(true);
    setLocalError(null);
    
    try {
      // Generate a random companyId and extract domain for company name
      const companyId = uuidv4();
      const emailDomain = email.split('@')[1];
      // Use the entered company name or fallback to auto-generated
      const autoCompanyName = companyName || (emailDomain ? emailDomain.split('.')[0] : 'New Company');
      
      // Store company name
      setCompanyName(autoCompanyName);
      
      // Set role based on whether this is likely a new company
      const userRole = isNewCompanyEmail ? 'AccountAdmin' : 'User';
      setSelectedRole(userRole);
      
      console.log("Starting signup process with data:", {
        username, email, companyId, phoneNumber, emailDomain, companyName: autoCompanyName, role: userRole
      });
      
      const result = await signUp(username, password, email, companyId, phoneNumber);
      
      console.log("Signup result:", result);
      
      // Determine which message to show based on the result
      if (result.isNewCompany) {
        setSignupStatus('new-company');
      } else {
        setSignupStatus('existing-company');
      }
      
      // After successful signup, send notification to appropriate recipients
      try {
        if (result.isNewCompany) {
          // If it's a new company, notify the system admin
          console.log("New company created, sending notification to system admin");
          
          await fetch('https://formspree.io/f/xnnppgya', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              type: 'new-company-admin',
              username: username,
              email: email,
              companyId: result.companyId,
              companyName: autoCompanyName,
              role: userRole,
              phoneNumber: phoneNumber,
              emailDomain: emailDomain
            })
          });
          
          console.log('System admin notification sent successfully for new company');
        } else {
          // If it's an existing company, check if we have admin emails from the signup result
          console.log("User joined existing company, checking for admin emails to notify");
          
          let adminEmails = [];
          
          // First check if adminEmails were returned directly in the result
          if (result.adminEmails && result.adminEmails.length > 0) {
            adminEmails = result.adminEmails;
            console.log(`Using admin emails from signup result: ${adminEmails.join(', ')}`);
          } else {
            // Fallback: query for admin emails using the company ID from the result
            console.log(`No admin emails in result, querying for company ID: ${result.companyId}`);
            adminEmails = await getCompanyAdminEmails(result.companyId, dynamoDb);
            console.log(`Fetched admin emails: ${adminEmails.join(', ')}`);
          }
          
          if (adminEmails.length > 0) {
            console.log(`Sending notification to ${adminEmails.length} admins: ${adminEmails.join(', ')}`);
            
            // Use the primary admin as the main recipient
            const primaryAdmin = adminEmails[0];
            // Use remaining admins as CC recipients
            const ccAdmins = adminEmails.slice(1);
            // Always include system admin in CC
            ccAdmins.push('admin@pilotforceapp.com');
            
            // Send a direct notification to the primary admin, CC the others
            const formspreeData = {
              type: 'new-company-user',
              to: primaryAdmin,
              _cc: ccAdmins.join(','), // Use _cc format for Formspree
              username: username,
              email: email,
              companyId: result.companyId,
              companyName: autoCompanyName,
              role: userRole,
              phoneNumber: phoneNumber,
              emailDomain: emailDomain,
              adminEmails: adminEmails // Include the array of admin emails
            };
            
            console.log("Sending notification with data:", {
              to: formspreeData.to,
              _cc: formspreeData._cc,
              subject: `New User Registration: ${username}`
            });
            
            const response = await fetch('https://formspree.io/f/xnnppgya', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(formspreeData)
            });
            
            if (response.ok) {
              console.log('Company admin notification sent successfully');
            } else {
              console.error('Failed to send admin notification:', await response.text());
            }
          } else {
            console.log('No admin emails found, falling back to system admin notification');
            // Fallback to system admin if no company admins found
            const formspreeData = {
              type: 'new-company-user-no-admin',
              to: 'admin@pilotforceapp.com',
              username: username,
              email: email,
              companyId: result.companyId,
              companyName: autoCompanyName,
              role: userRole,
              phoneNumber: phoneNumber,
              emailDomain: emailDomain
            };
            
            await fetch('https://formspree.io/f/xnnppgya', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(formspreeData)
            });
          }
        }
      } catch (emailError) {
        // Don't block signup if email notification fails
        console.error('Failed to send admin notification email:', emailError);
      }
      
      // Navigate after a brief delay to show the status message
      setTimeout(() => {
        navigate('/waiting-for-approval', {
          state: { isNewCompany: result.isNewCompany }
        });
      }, 2000);
    } catch (error) {
      console.error('Signup failed', error);
      setLocalError('Signup failed. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  // Render explanatory message based on email domain
  const renderEmailInfo = () => {
    if (isNewCompanyEmail === null) return null;
    
    if (isNewCompanyEmail) {
      return (
        <div className="mt-1 text-sm text-blue-600">
          <p>Looks like a new company email! You'll be set up as a company admin once approved.</p>
        </div>
      );
    } else {
      return (
        <div className="mt-1 text-sm text-gray-600">
          <p>This appears to be a personal email. If you're registering for a company, please use your company email.</p>
        </div>
      );
    }
  };

  // Show appropriate success message after form submission
  const renderSignupStatus = () => {
    if (!signupStatus) return null;
    
    let message = '';
    let bgColor = '';
    
    if (signupStatus === 'new-company') {
      message = 'Your account has been created as a Company Admin. Please wait for system approval.';
      bgColor = 'bg-blue-100 text-blue-800';
    } else {
      message = 'Your account has been created. Your company admin will need to approve your access.';
      bgColor = 'bg-green-100 text-green-800';
    }
    
    return (
      <div className={`p-4 rounded-md ${bgColor} mb-6`}>
        {message}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${loginImage})` }}></div>
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-left">Sign Up</h2>
          {(error || localError) && <p className="mb-4 text-red-500">{error?.message || localError}</p>}
          {renderSignupStatus()}
          <form onSubmit={handleSignup}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Company Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your company email"
                required
              />
              {renderEmailInfo()}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phoneNumber">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your phone number"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your company name"
              />
              {isNewCompanyEmail && (
                <p className="text-sm text-gray-600 mt-1">
                  This will be your company's name in the system.
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Confirm your password"
                required
              />
              {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading || localLoading}
              >
                {loading || localLoading ? 'Signing up...' : 'Sign Up'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/" className="text-blue-500 hover:text-blue-700 font-bold">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
