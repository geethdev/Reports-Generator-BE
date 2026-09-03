const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
