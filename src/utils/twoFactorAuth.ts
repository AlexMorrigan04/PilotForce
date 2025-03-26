import * as OTPAuth from 'otpauth';

export const generateTOTPSecret = (): string => {
  // Generate a random secret for TOTP
  return new OTPAuth.Secret().base32;
};

export const generateTOTPQRCode = (username: string, secret: string): string => {
  // Create a TOTP object
  const totp = new OTPAuth.TOTP({
    issuer: 'PilotForce',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });
  
  // Generate the URL for the QR code
  return totp.toString();
};

export const verifyTOTP = (secret: string, token: string): boolean => {
  // Create a TOTP object
  const totp = new OTPAuth.TOTP({
    issuer: 'PilotForce',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  });
  
  // Verify the token
  const delta = totp.validate({ token });
  return delta !== null;
};
