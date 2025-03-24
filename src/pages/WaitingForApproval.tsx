import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import loginImage from '../images/login-image.avif';
import { useAuth } from '../context/AuthContext';

const WaitingForApproval: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  
  useEffect(() => {
    // Check if the state was passed from Signup component
    const state = location.state as { isNewCompany?: boolean } | null;
    if (state && state.isNewCompany) {
      setIsCompanyAdmin(true);
    } else if (user && user.role === 'AccountAdmin') {
      setIsCompanyAdmin(true);
    }
  }, [location, user]);

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${loginImage})` }}></div>
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-left">Account Pending Approval</h2>
          <div className={`border-l-4 p-4 mb-6 ${isCompanyAdmin ? 'bg-purple-50 border-purple-400' : 'bg-blue-50 border-blue-400'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${isCompanyAdmin ? 'text-purple-400' : 'text-blue-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className={`text-sm ${isCompanyAdmin ? 'text-purple-700' : 'text-blue-700'}`}>
                  {isCompanyAdmin 
                    ? 'Your account has been created as a Company Administrator but requires system approval.'
                    : 'Your account has been created and is awaiting approval from your company administrator.'}
                </p>
              </div>
            </div>
          </div>
          
          <p className="mb-4">
            {isCompanyAdmin
              ? 'A system administrator will review your information and activate your account. Once approved, you will be able to manage users from your company.'
              : "Your company administrator will review your request and activate your account. You'll receive an email notification once your account has been approved."}
          </p>
          
          <h3 className="text-lg font-semibold mt-6 mb-2">What happens next?</h3>
          {isCompanyAdmin ? (
            <ol className="list-decimal pl-5 mb-6 space-y-2">
              <li>Your registration as a Company Admin has been submitted</li>
              <li>A system administrator will review your details</li>
              <li>Once approved, you'll receive an email notification</li>
              <li>You can then log in and manage users for your company</li>
            </ol>
          ) : (
            <ol className="list-decimal pl-5 mb-6 space-y-2">
              <li>Your registration information has been submitted</li>
              <li>Your company administrator will review your request</li>
              <li>Once approved, you'll receive an email notification</li>
              <li>You can then log in and start using the platform</li>
            </ol>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              <Link to="/login" className="text-blue-500 hover:text-blue-700 font-bold">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingForApproval;
