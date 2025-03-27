const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow requests from your frontend
app.use(cors({
  origin: 'http://localhost:3000', // Replace with your frontend URL
  credentials: true
}));

app.use(express.json());

// Proxy endpoint for Formspree
app.post('/api/formspree-proxy', async (req, res) => {
  try {
    // Extract the form ID from the request
    const formId = req.query.formId || 'mvgkqjvr';
    
    // Forward the request to Formspree
    const formspreeUrl = `https://formspree.io/f/${formId}`;
    
    const response = await fetch(formspreeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    // Get the response from Formspree
    const data = await response.json();
    
    // Return the Formspree response to the client
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Failed to forward request to Formspree' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
