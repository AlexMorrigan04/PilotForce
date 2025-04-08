/**
 * Extracts the domain from an email address
 * Example: from 'user@example.com' returns 'example.com'
 * 
 * @param {string} email - The email address to extract domain from
 * @returns {string} The email domain
 */
export const extractEmailDomain = (email) => {
  if (!email || !email.includes('@')) {
    return '';
  }
  
  // Split on @ and take the part after it
  const domain = email.split('@')[1];
  return domain;
};

/**
 * Gets the company name from the domain
 * Example: from 'example.com' returns 'example'
 * 
 * @param {string} domain - The full domain to extract company name from
 * @returns {string} The company name portion of the domain
 */
export const getCompanyNameFromDomain = (domain) => {
  if (!domain || !domain.includes('.')) {
    return domain;
  }
  
  // Take the part before the first dot
  return domain.split('.')[0];
};

/**
 * Determines if two emails belong to the same organization
 * 
 * @param {string} email1 - First email to compare
 * @param {string} email2 - Second email to compare
 * @returns {boolean} Whether emails share the same domain
 */
export const areSameOrganization = (email1, email2) => {
  const domain1 = extractEmailDomain(email1);
  const domain2 = extractEmailDomain(email2);
  
  return domain1 === domain2;
};
