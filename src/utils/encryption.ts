import CryptoJS from 'crypto-js';

// Client-side encryption for sensitive data
export const encryptData = (data: any, key: string): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

export const decryptData = (ciphertext: string, key: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
};

// For very sensitive data that should be encrypted even when stored in state
export const sensitiveDataReducer = (
  state: { [key: string]: any },
  action: { type: string; payload: any; key?: string }
): { [key: string]: any } => {
  switch (action.type) {
    case 'SET_ENCRYPTED':
      return {
        ...state,
        [action.key!]: encryptData(action.payload, process.env.REACT_APP_CLIENT_ENCRYPTION_KEY || 'default-key')
      };
    case 'GET_DECRYPTED':
      if (!state[action.key!]) return { ...state };
      return {
        ...state,
        [`${action.key}_decrypted`]: decryptData(
          state[action.key!],
          process.env.REACT_APP_CLIENT_ENCRYPTION_KEY || 'default-key'
        )
      };
    default:
      return state;
  }
};
