-- PostgreSQL Schema for API Health & Monitoring Dashboard

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitored_apis (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL,
  method VARCHAR(10) DEFAULT 'GET' NOT NULL,
  headers TEXT DEFAULT '{}',
  request_body TEXT DEFAULT '',
  expected_status_code INTEGER DEFAULT 200,
  check_interval VARCHAR(20) DEFAULT '5m',
  timeout_ms INTEGER DEFAULT 5000,
  is_active BOOLEAN DEFAULT TRUE,
  current_status VARCHAR(20) DEFAULT 'UNKNOWN',
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_response_time_ms INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_check_logs (
  id SERIAL PRIMARY KEY,
  api_id INTEGER NOT NULL REFERENCES monitored_apis(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER,
  is_success BOOLEAN NOT NULL,
  failure_reason TEXT,
  response_snippet TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitored_apis_user ON monitored_apis(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_api ON health_check_logs(api_id, checked_at DESC);
