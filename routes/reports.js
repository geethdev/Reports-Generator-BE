const express = require('express');
const { createReport, updateReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createReport);
router.put('/:id', updateReport);

module.exports = router;
