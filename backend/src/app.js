const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mockRoutes = require('./routes/mockRoutes');
const { getIsPostgres } = require('./config/db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check of the monitoring server itself
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'API-Health-and-Monitoring-Backend',
    database: getIsPostgres() ? 'PostgreSQL' : 'SQLite (Local Dev)',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', apiRoutes);
app.use('/api/metrics', monitorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mock', mockRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

module.exports = app;
