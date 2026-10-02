const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'api_health_jwt_super_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL || '',
  PGUSER: process.env.PGUSER || 'postgres',
  PGHOST: process.env.PGHOST || 'localhost',
  PGDATABASE: process.env.PGDATABASE || 'api_monitoring',
  PGPASSWORD: process.env.PGPASSWORD || 'postgres',
  PGPORT: parseInt(process.env.PGPORT || '5432', 10),
  DEFAULT_CHECK_INTERVAL_CRON: process.env.DEFAULT_CHECK_INTERVAL_CRON || '* * * * *', // every minute
};
