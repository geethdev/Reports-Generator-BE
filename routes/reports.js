const express = require('express');
const { createReport, updateReport, submitReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createReport);
router.put('/:id', updateReport);
router.post('/:id/submit', submitReport);

module.exports = router;
