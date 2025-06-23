import React, { useState } from 'react';
import * as cognitoAdminService from '../../services/cognitoAdminService';

// Helper function to safely truncate tokens for display
const truncateToken = (token: string | null) => {
  if (!token) return 'Not found';
  if (token.length > 20) {
    return token.substring(0, 10) + '...' + token.substring(token.length - 10);
  }
  return token;
};

const AuthDebugPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [tokenDebugInfo, setTokenDebugInfo] = useState<any>(null);
  const [fixResult, setFixResult] = useState<string>('');

  const runDiagnostics = async () => {
    try {
      const authDebugger = await import('../../utils/authDebugger');
      const authState = authDebugger.logAuthState();
      setDebugInfo(authState);
      
      // Get current token details
      const currentToken = authDebugger.getCurrentToken();
      setTokenDebugInfo(currentToken);
    } catch (error) {
      setDebugInfo({ error: 'Failed to run diagnostics' });
    }
  };

  const attemptFix = async () => {
    try {
      const authDebugger = await import('../../utils/authDebugger');
      const result = authDebugger.syncAuthTokensAcrossStorage();
      setFixResult('Token sync complete. See console for details.');
      
      // Re-run diagnostics to show updated state
      runDiagnostics();
    } catch (error) {
      setFixResult('Failed to fix tokens: ' + (error as Error).message);
    }
  };
  
  // Format the time remaining in a human-readable way
  const formatTimeRemaining = (expiresAt: string) => {
    if (!expiresAt || expiresAt === 'No expiration') return 'No expiration';
    try {
      const expiry = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;
      
      if (diff <= 0) return 'Expired';
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${remainingMinutes}m remaining`;
      }
      return `${minutes}m remaining`;
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
      <div 
        className="px-4 py-3 bg-gray-100 flex justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-lg font-semibold text-gray-800">Authentication Diagnostics</h3>
        <span>{expanded ? '▲' : '▼'}</span>
      </div>
      
      {expanded && (
        <div className="p-4">
          <div className="flex space-x-2 mb-4">
            <button 
              onClick={runDiagnostics}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Run Diagnostics
            </button>
            <button 
              onClick={attemptFix}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Attempt Fix
            </button>
          </div>
          
          {fixResult && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
              {fixResult}
            </div>
          )}
          
          {tokenDebugInfo && (
            <div className="mb-4 p-4 bg-gray-50 rounded border">
              <h4 className="font-semibold mb-2">Current Token</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Source:</div>
                <div>{tokenDebugInfo.source}</div>
                
                <div className="font-medium">Valid:</div>
                <div className={tokenDebugInfo.decoded.valid ? 'text-green-600' : 'text-red-600'}>
                  {tokenDebugInfo.decoded.valid ? 'Yes' : 'No'}
                </div>
                
                {tokenDebugInfo.decoded.valid && (
                  <>
                    <div className="font-medium">Status:</div>
                    <div className={tokenDebugInfo.decoded.isExpired ? 'text-red-600' : 'text-green-600'}>
                      {tokenDebugInfo.decoded.isExpired ? 'Expired' : 'Active'} 
                      {!tokenDebugInfo.decoded.isExpired && (
                        <span className="ml-2">
                          ({formatTimeRemaining(tokenDebugInfo.decoded.expiresAt)})
                        </span>
                      )}
                    </div>
                    
                    <div className="font-medium">User:</div>
                    <div>{tokenDebugInfo.decoded.payload?.email || 'Unknown'}</div>
                    
                    <div className="font-medium">Groups:</div>
                    <div>
                      {tokenDebugInfo.decoded.payload?.['cognito:groups'] ? 
                        tokenDebugInfo.decoded.payload['cognito:groups'].join(', ') : 
                        'None'}
                    </div>
                  </>
                )}
                
                {!tokenDebugInfo.decoded.valid && (
                  <div className="col-span-2 text-red-600">{tokenDebugInfo.decoded.message}</div>
                )}
                
                {tokenDebugInfo.token && (
                  <>
                    <div className="font-medium">Token (truncated):</div>
                    <div className="truncate">{truncateToken(tokenDebugInfo.token)}</div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {debugInfo && (
            <div>
              <h4 className="font-semibold mb-2">Storage State</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 border bg-gray-50 text-left">Storage Key</th>
                      <th className="p-2 border bg-gray-50 text-left">localStorage</th>
                      <th className="p-2 border bg-gray-50 text-left">sessionStorage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border font-medium">idToken</td>
                      <td className="p-2 border">{debugInfo.localStorage.idToken || 'Not found'}</td>
                      <td className="p-2 border">
                        {debugInfo.sessionStorage.idToken || 'Not found'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">accessToken</td>
                      <td className="p-2 border">{debugInfo.localStorage.accessToken || 'Not found'}</td>
                      <td className="p-2 border">
                        {debugInfo.sessionStorage.accessToken || 'Not found'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">refreshToken</td>
                      <td className="p-2 border">{debugInfo.localStorage.refreshToken || 'Not found'}</td>
                      <td className="p-2 border">
                        {debugInfo.sessionStorage.refreshToken || 'Not found'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">isAdmin</td>
                      <td className="p-2 border">{debugInfo.localStorage.isAdmin || 'Not found'}</td>
                      <td className="p-2 border">n/a</td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">userData</td>
                      <td className="p-2 border">{debugInfo.localStorage.hasUserData ? 'Present' : 'Not found'}</td>
                      <td className="p-2 border">
                        {debugInfo.sessionStorage.hasUserData ? 'Present' : 'Not found'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">cognitoDetails</td>
                      <td className="p-2 border">{debugInfo.localStorage.hasUserCognitoDetails ? 'Present' : 'Not found'}</td>
                      <td className="p-2 border">
                        {debugInfo.sessionStorage.hasUserCognitoDetails ? 'Present' : 'Not found'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">Session Active</td>
                      <td className="p-2 border">{debugInfo.localStorage.pilotforceSessionActive || 'Not found'}</td>
                      <td className="p-2 border">n/a</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthDebugPanel;
