const express = require('express');
const router = express.Router();

// Healthy endpoint: 200 OK (< 50ms)
router.get('/healthy', (req, res) => {
  return res.status(200).json({
    status: 'UP',
    message: 'Mock service is fully operational and healthy.',
    timestamp: new Date().toISOString(),
  });
});

// Slow endpoint: 200 OK with 1200ms delay to simulate degraded performance
router.get('/slow', (req, res) => {
  setTimeout(() => {
    return res.status(200).json({
      status: 'DEGRADED',
      message: 'Mock service responded with high latency (> 1000ms).',
      timestamp: new Date().toISOString(),
    });
  }, 1200);
});

// Failing endpoint: 500 Internal Server Error to simulate service outage
router.get('/failing', (req, res) => {
  return res.status(500).json({
    status: 'DOWN',
    error: 'Internal Server Error: Database pool exhausted',
    timestamp: new Date().toISOString(),
  });
});

// Flaky endpoint: randomly passes or fails (50% chance)
router.get('/flaky', (req, res) => {
  const isHealthy = Math.random() > 0.5;
  if (isHealthy) {
    return res.status(200).json({
      status: 'UP',
      message: 'Flaky service check succeeded this round.',
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(503).json({
      status: 'DOWN',
      error: 'Service Unavailable: High traffic backpressure',
      timestamp: new Date().toISOString(),
    });
  }
});

// Echo endpoint for testing POST/PUT methods and headers
router.all('/echo', (req, res) => {
  return res.status(200).json({
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
