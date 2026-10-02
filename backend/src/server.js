const app = require('./app');
const env = require('./config/env');
const { initDb } = require('./config/db');
const { seedInitialData } = require('./models/initDb');
const { startScheduler, stopScheduler } = require('./services/scheduler');

async function startServer() {
  try {
    console.log('🚀 Initializing API Health & Monitoring Dashboard Server...');
    
    // 1. Initialize Database
    await initDb();

    // 2. Seed default users & sample APIs
    await seedInitialData();

    // 3. Start node-cron Health Check Scheduler
    startScheduler();

    // 4. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log(`🌐 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`🔗 Health check available at: http://localhost:${env.PORT}/health`);
      console.log(`🔑 Admin Credentials: admin@healthcheck.io / Admin@12345`);
      console.log(`👤 Demo User Credentials: demo@healthcheck.io / Demo@12345`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('Shutting down server gracefully...');
      stopScheduler();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
