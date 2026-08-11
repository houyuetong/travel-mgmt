const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const reviewController = require('../controllers/reviewController');
const { authRequired, requireAdmin } = require('../middlewares/auth');

router.get('/users', authRequired, requireAdmin, userController.listUsers);
router.post('/users', authRequired, requireAdmin, userController.createUser);
router.put('/users/:id', authRequired, requireAdmin, userController.updateUser);
router.patch('/users/:id/status', authRequired, requireAdmin, userController.updateUserStatus);
router.post('/users/:id/reset-password', authRequired, requireAdmin, userController.resetPassword);

router.get('/requests', authRequired, requireAdmin, reviewController.listAllRequests);
router.get('/requests/:id', authRequired, requireAdmin, reviewController.getRequestDetail);
router.post('/requests/:id/approve', authRequired, requireAdmin, reviewController.approveRequest);
router.post('/requests/:id/reject', authRequired, requireAdmin, reviewController.rejectRequest);

module.exports = router;