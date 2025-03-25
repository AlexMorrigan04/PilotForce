// This file adds necessary polyfills for libraries that expect Node.js environment

// Polyfill for process
window.process = {
  env: {
    NODE_ENV: process.env.NODE_ENV,
    // Add other environment variables your app needs
    ...Object.keys(process.env).reduce((acc, key) => {
      if (key.startsWith('REACT_APP_')) {
        acc[key] = process.env[key];
      }
      return acc;
    }, {})
  }
};
