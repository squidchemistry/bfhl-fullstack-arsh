/**
 * BFHL Controller
 * ================
 * Handles request validation and delegates to the service layer.
 */

const { processGraphData } = require('../services/graphService');

/**
 * POST /bfhl
 * Expects: { "data": ["A->B", ...] }
 */
function handlePost(req, res) {
  try {
    const { data } = req.body;

    // ── Input validation ────────────────────
    if (!data) {
      return res.status(400).json({
        error: 'Missing "data" field in request body.',
      });
    }

    if (!Array.isArray(data)) {
      return res.status(400).json({
        error: '"data" must be an array of strings.',
      });
    }

    if (data.length === 0) {
      return res.status(400).json({
        error: '"data" array must not be empty.',
      });
    }

    // Ensure every element is a string
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] !== 'string') {
        return res.status(400).json({
          error: `Element at index ${i} is not a string.`,
        });
      }
    }

    // ── Process ─────────────────────────────
    const result = processGraphData(data);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[bfhlController] Unhandled error:', err);
    return res.status(500).json({
      error: 'Internal server error.',
    });
  }
}

/**
 * GET / — health check
 */
function healthCheck(_req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'BFHL Graph Processing API',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handlePost, healthCheck };
