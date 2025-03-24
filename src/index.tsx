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
