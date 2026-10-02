const express = require('express');
const router = express.Router();
const {
  getUserApis,
  getApiById,
  createApi,
  updateApi,
  deleteApi,
  toggleApiStatus,
  triggerManualCheck,
} = require('../controllers/apiController');
const { verifyJWT } = require('../middleware/authMiddleware');

// All API management routes require JWT authentication
router.use(verifyJWT);

router.get('/', getUserApis);
router.post('/', createApi);
router.get('/:id', getApiById);
router.put('/:id', updateApi);
router.delete('/:id', deleteApi);
router.patch('/:id/toggle', toggleApiStatus);
router.post('/:id/check', triggerManualCheck);

module.exports = router;
