// Import polyfills first
import './polyfills';
// Import loop detection
import './utils/loopDetection';

// Then import the rest of your application
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const renderWithLoopProtection = () => {
  // Check if we might be in a render loop
  if (window.checkRenderLoop && window.checkRenderLoop()) {
    return;
  }
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

renderWithLoopProtection();

// If you want to start measuring performance in your app, pass a function
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
