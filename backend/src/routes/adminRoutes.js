const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getAllApis,
  getSystemStats,
  updateUserRole,
  deleteUser,
} = require('../controllers/adminController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All admin routes require JWT and 'admin' role
router.use(verifyJWT, requireRole('admin'));

router.get('/users', getAllUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

router.get('/apis', getAllApis);
router.get('/stats', getSystemStats);

module.exports = router;
