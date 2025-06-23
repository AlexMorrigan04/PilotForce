const path = require('path');

module.exports = {
  // Add fallbacks for node modules
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      process: require.resolve('process/browser'),
      path: require.resolve('path-browserify'),
      fs: false, // No browser implementation
      util: require.resolve('util/'),
      assert: require.resolve('assert/'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      url: require.resolve('url/'),
      zlib: require.resolve('browserify-zlib'),
      vm: false, // Setting to false (empty module)
    },
  },
  // Configure source-map-loader to ignore missing sourcemaps
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [
          /node_modules\/@mapbox/,
          /node_modules\/asn1\.js/,
          /node_modules\/buffer/,
          /node_modules\/create-ecdh/,
          /node_modules\/diffie-hellman/,
          /node_modules\/elliptic/,
          /node_modules\/miller-rabin/,
          /node_modules\/public-encrypt/,
          /node_modules\/rbush/,
          /node_modules\/string_decoder/,
          /node_modules\/html-to-text/,
        ],
      },
    ],
  },
  // Ignore warnings from specific modules
  ignoreWarnings: [
    {
      module: /node_modules\/@mapbox\/mapbox-gl-draw\/src\/lib\/mouse_event_point\.js/,
    },
  ],
};
