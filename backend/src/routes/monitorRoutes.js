const express = require('express');
const router = express.Router();
const {
  getApiHistory,
  getApiMetrics,
  getDashboardOverview,
} = require('../controllers/monitorController');
const { verifyJWT } = require('../middleware/authMiddleware');

router.use(verifyJWT);

// Dashboard stats summary overview
router.get('/dashboard', getDashboardOverview);

// Historical check logs for an API
router.get('/apis/:id/history', getApiHistory);

// Chart time series points for an API
router.get('/apis/:id/metrics', getApiMetrics);

module.exports = router;
