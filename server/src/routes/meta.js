const express = require('express');
const router = express.Router();
const { metaController } = require('../controllers/metaController');

router.get('/version', metaController.getVersion);

module.exports = router;
