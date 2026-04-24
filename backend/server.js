/**
 * BFHL API Server
 * ================
 * Entry point for the Express application.
 */

const express = require('express');
const cors = require('cors');
const bfhlRoutes = require('./routes/bfhlRoutes');
const { healthCheck } = require('./controllers/bfhlController');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────
app.use(cors());            // Allow all origins (tighten in production)
app.use(express.json());    // Parse JSON bodies

// ── Routes ───────────────────────────────────
app.get('/', healthCheck);
app.use('/bfhl', bfhlRoutes);

// ── 404 catch-all ────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global error handler ─────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  BFHL API running on http://localhost:${PORT}`);
});

module.exports = app; // for testing
