const express = require('express');
const {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', listProjects);
router.post('/', authorize('manager'), createProject);
router.put('/:id', authorize('manager'), updateProject);
router.delete('/:id', authorize('manager'), deleteProject);

module.exports = router;
