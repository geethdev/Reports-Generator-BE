const express = require('express');
const { getSummary, getCharts } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('manager'));

router.get('/summary', getSummary);
router.get('/charts', getCharts);

module.exports = router;
