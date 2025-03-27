// Fix Content Security Policy at runtime to allow data: URLs in connect-src
if (typeof document !== 'undefined') {
  // Get the current meta tag if it exists
  let metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  
  // If no meta tag exists, create one
  if (!metaCSP) {
    metaCSP = document.createElement('meta');
    metaCSP.setAttribute('http-equiv', 'Content-Security-Policy');
    document.head.appendChild(metaCSP);
  }
  
  // Set a comprehensive CSP that includes data: URLs in all necessary directives
  metaCSP.setAttribute('content', 
    "default-src 'self'; " +
    "connect-src 'self' data: blob: https://*.mapbox.com https://api.mapbox.com https://*.amazonaws.com wss://*.amazonaws.com; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.mapbox.com; " +
    "worker-src 'self' blob:; " +
    "img-src 'self' data: blob: https://*.mapbox.com https://*.amazonaws.com; " +
    "style-src 'self' 'unsafe-inline' https://*.mapbox.com; " +
    "font-src 'self' data:;"
  );
  
  // Log that we've updated the CSP
  console.info('Updated Content Security Policy to allow data: URLs in connect-src');
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Explicitly import App as default
import App from './App';

// Get the root element
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Create a root
const root = createRoot(rootElement);

// Render your app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
