
const fs = require('fs');
const path = require('path');

// Helper to fix 'process/browser' imports in .mjs files
function fixProcessImport(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      // Replace process/browser with process, which will be provided by webpack
      const fixedContent = content.replace(/['"]process\/browser['"]/g, "'process'");
      
      if (content !== fixedContent) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log('Fixed process/browser import in', filePath);
      }
    } else {
      console.log('File not found:', filePath);
    }
  } catch (error) {
    console.error('Error fixing imports in file:', filePath, error);
  }
}

// Fix AWS Amplify helpers.mjs
const amplifyHelpersPath = path.resolve(
  __dirname, 
  'node_modules', 
  '@aws-amplify', 
  'core', 
  'dist', 
  'esm', 
  'Platform', 
  'detection', 
  'helpers.mjs'
);
fixProcessImport(amplifyHelpersPath);

// Fix InternalAPI.js in @aws-amplify/api
const internalAPIPath = path.resolve(
  __dirname,
  'node_modules',
  '@aws-amplify',
  'api',
  'lib-esm',
  'internals',
  'InternalAPI.js'
);
if (fs.existsSync(path.dirname(internalAPIPath))) {
  fixProcessImport(internalAPIPath);
} else {
  console.log('Directory not found:', path.dirname(internalAPIPath));
}

// Fix Resend index.mjs
const resendPath = path.resolve(
  __dirname,
  'node_modules',
  'resend',
  'dist',
  'index.mjs'
);
fixProcessImport(resendPath);

console.log('ESM import fixes applied');
