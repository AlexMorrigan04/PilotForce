import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginImage from '../images/login-image.avif';

const ConfirmSignup: React.FC = () => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const { confirmSignUp, error, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { username } = location.state as { username: string } || { username: '' };

  const handleConfirmSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmSignUp(username, confirmationCode);
      navigate('/login');
    } catch (error) {
      console.error('Confirmation failed');
    }
  };

  if (!username) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6">Invalid request</h2>
          <p className="mb-4">No username provided. Please try signing up again.</p>
          <Link to="/signup" className="text-blue-500 hover:text-blue-700 font-bold">
            Back to Signup
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${loginImage})` }}></div>
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-left">Confirm Your Account</h2>
          <p className="mb-4">Please enter the confirmation code sent to your email.</p>
          {error && <p className="mb-4 text-red-500">{error?.message || "An error occurred"}</p>}
          <form onSubmit={handleConfirmSignup}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmation-code">
                Confirmation Code
              </label>
              <input
                id="confirmation-code"
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter confirmation code"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Account'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              <Link to="/" className="text-blue-500 hover:text-blue-700 font-bold">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSignup;
