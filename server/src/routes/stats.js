const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authRequired, requireAdmin, requireEmployee } = require('../middlewares/auth');

router.get('/dashboard', authRequired, requireAdmin, statsController.getDashboard);
router.get('/me', authRequired, requireEmployee, statsController.getMe);
router.get('/pending-count', authRequired, requireAdmin, statsController.getPendingCount);

module.exports = router;