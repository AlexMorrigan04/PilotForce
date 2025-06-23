const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  name: 'pilotforce',
  shared: {
    process: {
      singleton: true,
      requiredVersion: false,
      eager: true
    },
    'process/browser': {
      singleton: true,
      requiredVersion: false,
      eager: true
    }
  }
};
