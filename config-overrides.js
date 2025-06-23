const webpack = require('webpack');
const path = require('path');

module.exports = function override(config, env) {
  // Add fallbacks for node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "assert": require.resolve("assert/"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url/"),
    "buffer": require.resolve("buffer/"),
    "zlib": require.resolve("browserify-zlib"),
    "path": require.resolve("path-browserify"),
    "process": require.resolve("process/browser"),
    "fs": false, // Browser doesn't have file system access
    "vm": false, // Use empty module fallback for vm
  };

  // Add aliases for ESM modules that need browser polyfills
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': path.resolve(__dirname, 'node_modules/process/browser.js')
  };

  // Add buffer polyfill plugin
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  );

  // Add explicit module fallbacks for ESM modules
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /^process\/browser$/,
      require.resolve('process/browser')
    )
  );

  // Ignore warnings for specific modules with source map issues
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    { module: /node_modules\/(mapbox|browserify|readable-stream|buffer|bn\.js|crypto|elliptic|aws-amplify|axios|exifr|resend|asn1\.js)/ },
  ];

  // Disable source maps for node_modules to avoid source map errors
  if (config.module && config.module.rules) {
    config.module.rules.forEach(rule => {
      if (rule.use && rule.use.includes && rule.use.includes('source-map-loader')) {
        rule.exclude = /node_modules/;
      }
    });
  }
  
  // Add federation plugin if config exists
  try {
    const federationConfig = require('./federation-config');
    const { ModuleFederationPlugin } = webpack.container;
    config.plugins.push(
      new ModuleFederationPlugin(federationConfig)
    );
  } catch (error) {
    console.warn('Unable to add ModuleFederationPlugin:', error);
  }
  
  return config;
};
