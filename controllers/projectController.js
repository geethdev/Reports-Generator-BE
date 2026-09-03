const Project = require('../models/Project');

async function listProjects(req, res) {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json({ projects });
}

async function createProject(req, res) {
  const { name, description, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  const project = await Project.create({
    name,
    description,
    status,
    createdBy: req.user._id,
  });

  res.status(201).json({ project });
}

async function updateProject(req, res) {
  const { name, description, status } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (status !== undefined) project.status = status;

  await project.save();
  res.json({ project });
}

async function deleteProject(req, res) {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  await project.deleteOne();
  res.json({ message: 'Project deleted' });
}

module.exports = { listProjects, createProject, updateProject, deleteProject };
