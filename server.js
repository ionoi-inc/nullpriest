require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3149;

app.use(cors());
app.use(express.json());

// Serve static site from site/ directory
app.use(express.static(path.join(__dirname, 'site')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all — serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🕯️  NullPriest running on port ${PORT}`);
});
