const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authRequired, requireAdmin, requireEmployee } = require('../middlewares/auth');

router.get('/requests/export', authRequired, requireEmployee, exportController.exportMyRequests);
router.get('/admin/requests/export', authRequired, requireAdmin, exportController.exportAdminRequests);
router.get('/admin/stats/export', authRequired, requireAdmin, exportController.exportAdminStats);

module.exports = router;