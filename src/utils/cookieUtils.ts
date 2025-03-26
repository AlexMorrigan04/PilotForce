export const setAuthCookie = (token: string, expiryMinutes: number = 60): void => {
  // This function would only be used when you have a backend API
  // that sets the HTTP-only cookie for you
  fetch('/api/set-auth-cookie', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token, expiryMinutes }),
    credentials: 'include' // Important for cookies
  }).catch(err => console.error('Error setting auth cookie:', err));
};

export const clearAuthCookie = (): void => {
  fetch('/api/clear-auth-cookie', {
    method: 'POST',
    credentials: 'include'
  }).catch(err => console.error('Error clearing auth cookie:', err));
};
