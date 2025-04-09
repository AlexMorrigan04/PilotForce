const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add fallbacks for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
    util: require.resolve('util/'),
    process: require.resolve('process/browser'),
    path: require.resolve('path-browserify'),
    fs: false,
    os: require.resolve('os-browserify/browser'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    zlib: require.resolve('browserify-zlib'),
    assert: require.resolve('assert/'),
    constants: require.resolve('constants-browserify'),
    timers: require.resolve('timers-browserify'),
    vm: require.resolve('vm-browserify')
  };

  // Add alias for process/browser
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': require.resolve('process/browser')
  };

  // Add plugins for polyfills
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    // Fix for stream dependency issues
    new webpack.NormalModuleReplacementPlugin(
      /readable-stream\/readable.js/,
      'stream-browserify'
    ),
    new webpack.NormalModuleReplacementPlugin(
      /readable-stream\/writable.js/,
      'stream-browserify'
    ),
    new webpack.NormalModuleReplacementPlugin(
      /readable-stream\/readable-browser.js/,
      'stream-browserify'
    ),
    new webpack.NormalModuleReplacementPlugin(
      /readable-stream\/duplex.js/,
      'stream-browserify'
    ),
    new webpack.NormalModuleReplacementPlugin(
      /readable-stream\/lib\/_stream_/,
      'stream-browserify'
    )
  ];

  return config;
};
