import crypto from 'crypto-browserify';

// Note: This is a client-side implementation, which is not ideal for security
// In production, you should calculate the SECRET_HASH on a server
const generateSecretHash = (username: string, clientId: string, clientSecret: string): string => {
  try {
    const message = username + clientId;
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  } catch (error) {
    console.error('Error generating secret hash:', error);
    return '';
  }
};

export default generateSecretHash;
