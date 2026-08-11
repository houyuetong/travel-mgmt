const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authRequired, requireEmployee } = require('../middlewares/auth');

router.post('/', authRequired, requireEmployee, requestController.createRequest);
router.get('/', authRequired, requireEmployee, requestController.listMyRequests);
router.get('/:id', authRequired, requireEmployee, requestController.getMyRequest);
router.post('/:id/withdraw', authRequired, requireEmployee, requestController.withdrawRequest);
router.post('/:id/resubmit', authRequired, requireEmployee, requestController.resubmitRequest);

module.exports = router;