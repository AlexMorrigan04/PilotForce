/// <reference types="react-scripts" />

// Add global declarations
declare global {
  interface Window {
    process: {
      env: {
        NODE_ENV: string;
        [key: string]: string | undefined;
      };
    };
  }
}
