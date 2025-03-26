const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add fallbacks for node modules used by jsonwebtoken
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
    util: require.resolve('util/'),
    process: require.resolve('process/browser.js'), // Ensure .js extension is specified
  };

  // Add alias for process/browser.js
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': require.resolve('process/browser.js'),
  };

  // Add process and buffer as plugins
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  return config;
};
