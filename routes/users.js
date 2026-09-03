const express = require('express');
const { listUsers, getUserProfile } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('manager'), listUsers);
router.get('/:id', protect, authorize('manager'), getUserProfile);

module.exports = router;
