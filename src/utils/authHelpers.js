import { extractEmailDomain } from './emailUtils';

/**
 * Prepares user data for signup
 * 
 * @param {Object} userData Raw user data from signup form
 * @returns {Object} Processed user data
 */
export const prepareUserDataForSignup = (userData) => {
  // Never transform the email before sending to backend
  const { email, password, firstName, lastName, ...rest } = userData;
  
  return {
    email,
    password,
    attributes: {
      given_name: firstName,
      family_name: lastName,
      ...rest
    }
  };
};