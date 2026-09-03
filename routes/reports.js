const express = require('express');
const {
  createReport,
  updateReport,
  submitReport,
  listMyReports,
  getReportById,
  listTeamReports,
  reviewReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createReport);
router.get('/mine', listMyReports);
router.get('/team', authorize('manager'), listTeamReports);
router.get('/:id', getReportById);
router.put('/:id', updateReport);
router.post('/:id/submit', submitReport);
router.post('/:id/review', authorize('manager'), reviewReport);

module.exports = router;
