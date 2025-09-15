// server.js (or index.js)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const downloadRoutes = require('./routes/download');

const app = express();

// If you're behind a proxy (Render/Heroku/etc.)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));

// Basic rate limit (tune to your needs)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
});
app.use('/api/', limiter);

// Health
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// API routes
app.use('/api/download', downloadRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Centralized error handler (last)
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.publicMessage || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5002;

// Increase timeouts for long downloads
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
server.headersTimeout = 1000 * 60 * 5; // 5 min
server.requestTimeout = 1000 * 60 * 5; // 5 min
