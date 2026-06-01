// Vercel serverless entry point.
// Vercel recognises files inside api/ automatically — no `functions` config needed.
// We simply re-export the Express app from the shared server module.
module.exports = require('../server/index.js');
