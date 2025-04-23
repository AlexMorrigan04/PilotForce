import { encryptData, decryptData } from './encryption';

const SECRET_KEY = process.env.REACT_APP_LOCAL_STORAGE_KEY || 'secure-storage-key';

export const secureStorage = {
  setItem: (key: string, value: any): void => {
    try {
      const encryptedValue = encryptData(value, SECRET_KEY);
      localStorage.setItem(key, encryptedValue);
    } catch (error) {
    }
  },
  
  getItem: (key: string): any => {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      return decryptData(encryptedValue, SECRET_KEY);
    } catch (error) {
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
  
  clear: (): void => {
    localStorage.clear();
  }
};
