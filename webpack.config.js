module.exports = {
  // ...existing code...
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      vm: require.resolve('vm-browserify')
    }
  }
  // ...existing code...
};
