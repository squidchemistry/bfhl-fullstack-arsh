/**
 * Graph Service
 * =============
 * Business-logic layer that wraps the graph processor and attaches
 * user metadata to the response.
 */

const { processGraph } = require('../utils/graphProcessor');

// ── User metadata (update these before submission) ──────────
const USER_META = {
  user_id: 'arsh_verma_24042004',       // yourname_ddmmyyyy
  email_id: 'arsh@example.com',          // your email
  college_roll_number: 'RA2211003012345', // your roll number
};

/**
 * Processes the incoming data array and returns the full API response body.
 *
 * @param {string[]} data
 * @returns {object}
 */
function processGraphData(data) {
  const result = processGraph(data);

  return {
    ...USER_META,
    ...result,
  };
}

module.exports = { processGraphData, USER_META };
