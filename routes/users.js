const express = require('express');
const { listUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('manager'), listUsers);

module.exports = router;
