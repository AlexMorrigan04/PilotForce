// Import process directly to ensure it's available
import process from 'process';

// Polyfills for Node.js built-in modules
window.Buffer = window.Buffer || require('buffer').Buffer;
window.process = process;

// Add stream polyfills
window.Stream = window.Stream || require('stream-browserify');
// Add readable-stream polyfill
window.Readable = window.Readable || require('readable-stream').Readable;

// Add empty VM module polyfill to prevent errors with asn1.js
window.vm = window.vm || { 
  runInNewContext: (code) => {
    return {}; 
  },
  runInThisContext: (code) => {
    return {};
  }
};
