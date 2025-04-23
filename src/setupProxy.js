const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Get API URL from environment variable or fall back to the default
  const apiUrl = process.env.REACT_APP_API_BASE_URL || 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com';
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: apiUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/prod', // Rewrites /api to /prod
      },
      onProxyRes: function(proxyRes, req, res) {
        // Log proxy response status
      },
      onError: function(err, req, res) {
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Proxy error: Could not connect to the API server');
      }
    })
  );
};
