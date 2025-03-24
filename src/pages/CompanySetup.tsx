import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AWS from 'aws-sdk';
import loginImage from '../images/login-image.avif';

const CompanySetup: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // AWS Configuration
  const awsRegion = process.env.REACT_APP_AWS_REGION;
  const accessKey = process.env.REACT_APP_AWS_ACCESS_KEY;
  const secretKey = process.env.REACT_APP_AWS_SECRET_KEY;

  const dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: awsRegion,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  // Use email domain as default company name suggestion
  useEffect(() => {
    if (user?.email) {
      const emailDomain = user.email.split('@')[1] || '';
      if (emailDomain) {
        // Convert domain to a readable name (e.g., acme-corp.com -> Acme Corp)
        const suggestedName = emailDomain
          .split('.')[0]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        setCompanyName(suggestedName);
      }
    }
  }, [user]);

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!user?.companyId) {
        throw new Error('User or company ID not found');
      }

      // Save company information to Companies table
      const companyParams = {
        TableName: 'Companies',
        Item: {
          CompanyId: user.companyId,
          Name: companyName,
          Industry: industry || 'Not specified',
          CreatedAt: new Date().toISOString(),
          CreatedBy: user.id,
          Status: 'Active',
          PrimaryDomain: user.email.split('@')[1] || ''
        }
      };

      await dynamoDb.put(companyParams).promise();
      
      // Update user record with company name
      const userParams = {
        TableName: 'Users',
        Key: {
          UserId: user.id
        },
        UpdateExpression: 'set CompanyName = :companyName',
        ExpressionAttributeValues: {
          ':companyName': companyName
        }
      };

      await dynamoDb.update(userParams).promise();

      // Redirect to waiting for approval page
      navigate('/waiting-for-approval', { 
        state: { isNewCompany: true, companyName }
      });
      
    } catch (err: any) {
      console.error('Error saving company information:', err);
      setError(err.message || 'Failed to save company information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${loginImage})` }}></div>
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-2 text-left">Company Setup</h2>
          <p className="mb-6 text-gray-600">
            You're the first user from your organization. Please provide your company details.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
                Company Name*
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your company name"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="industry">
                Industry
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Select an industry</option>
                <option value="Construction">Construction</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Utilities">Utilities</option>
                <option value="Energy">Energy</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Telecommunications">Telecommunications</option>
                <option value="Government">Government</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanySetup;
