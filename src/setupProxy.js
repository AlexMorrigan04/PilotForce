const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://4m3m7j8611.execute-api.eu-north-1.amazonaws.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/prod', // Rewrites /api to /prod
      },
      onProxyRes: function(proxyRes, req, res) {
        // Log proxy response status
        console.log(`Proxy: ${req.method} ${req.path} => ${proxyRes.statusCode}`);
      },
      onError: function(err, req, res) {
        console.error('Proxy error:', err);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Proxy error: Could not connect to the API server');
      }
    })
  );
};
