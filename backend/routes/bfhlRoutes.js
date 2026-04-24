/**
 * BFHL Routes
 * ============
 */

const express = require('express');
const router = express.Router();
const { handlePost } = require('../controllers/bfhlController');

// POST /bfhl — graph processing endpoint
router.post('/', handlePost);

module.exports = router;
