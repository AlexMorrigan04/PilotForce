import React, { useState } from 'react';
import microsoftLogo from '../images/microsoft-logo.png';

interface MicrosoftLoginButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  text?: string;
  className?: string;
  isLoading?: boolean;
  isDarkMode?: boolean;
}

/**
 * Microsoft Single Sign-On button component
 * Renders a button styled for Microsoft SSO authentication
 */
export const MicrosoftLoginButton: React.FC<MicrosoftLoginButtonProps> = ({
  onClick,
  text = 'Sign in with Microsoft',
  className = '',
  isLoading = false,
  isDarkMode = false
}) => {
  const [logoError, setLogoError] = useState(false);

  // Base button styling - enhanced for Microsoft branding
  const baseStyles = `
    flex items-center justify-center w-full py-3 px-4 rounded-lg 
    font-medium transition-all text-sm
    ${isDarkMode 
      ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600' 
      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400'
    }
  `;
  
  // Combined class names with custom class
  const buttonClasses = `${baseStyles} ${isLoading ? 'cursor-not-allowed opacity-70' : 'hover:shadow-md'} ${className}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClasses}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className={`w-5 h-5 border-t-2 border-b-2 rounded-full animate-spin mr-2 ${
          isDarkMode ? 'border-white' : 'border-gray-700'
        }`}></div>
      ) : (
        <img 
          src={microsoftLogo} 
          alt="Microsoft"
          className="w-5 h-5 mr-2" 
          onError={(e) => {
            setLogoError(true);
          }}
          style={{ display: logoError ? 'none' : 'block' }}
        />
      )}
      {text}
    </button>
  );
};

export default MicrosoftLoginButton; 