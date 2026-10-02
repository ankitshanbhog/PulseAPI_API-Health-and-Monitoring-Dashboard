const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function seedInitialData() {
  try {
    // Check if admin user exists
    const adminCheck = await query('SELECT * FROM users WHERE email = $1', ['admin@healthcheck.io']);

    let adminId;
    let demoUserId;

    if (adminCheck.rows.length === 0) {
      const hashedAdminPassword = await bcrypt.hash('Admin@12345', 10);
      const adminResult = await query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['admin', 'admin@healthcheck.io', hashedAdminPassword, 'admin']
      );
      adminId = adminResult.rows[0]?.id || adminResult.insertId;
      console.log('👤 Seeded default admin user: admin@healthcheck.io / Admin@12345');
    } else {
      adminId = adminCheck.rows[0].id;
    }

    // Check if demo user exists
    const demoCheck = await query('SELECT * FROM users WHERE email = $1', ['demo@healthcheck.io']);
    if (demoCheck.rows.length === 0) {
      const hashedDemoPassword = await bcrypt.hash('Demo@12345', 10);
      const demoResult = await query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['demo_user', 'demo@healthcheck.io', hashedDemoPassword, 'user']
      );
      demoUserId = demoResult.rows[0]?.id || demoResult.insertId;
      console.log('👤 Seeded default demo user: demo@healthcheck.io / Demo@12345');
    } else {
      demoUserId = demoCheck.rows[0].id;
    }

    // Check if sample APIs exist
    const apisCheck = await query('SELECT COUNT(*) as count FROM monitored_apis');
    const apiCount = parseInt(apisCheck.rows[0].count, 10);

    if (apiCount === 0) {
      console.log('🌱 Seeding initial sample monitored APIs and health history logs...');
      const sampleApis = [
        {
          userId: demoUserId,
          name: 'JSONPlaceholder API',
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'GET',
          headers: JSON.stringify({ 'Content-Type': 'application/json' }),
          request_body: '',
          expected_status_code: 200,
          check_interval: '1m',
          timeout_ms: 5000,
          current_status: 'UP',
          last_response_time_ms: 145,
        },
        {
          userId: demoUserId,
          name: 'GitHub Status API',
          url: 'https://www.githubstatus.com/api/v2/status.json',
          method: 'GET',
          headers: '{}',
          request_body: '',
          expected_status_code: 200,
          check_interval: '5m',
          timeout_ms: 5000,
          current_status: 'UP',
          last_response_time_ms: 220,
        },
        {
          userId: demoUserId,
          name: 'Internal Mock - Slow Service',
          url: 'http://localhost:5000/api/mock/slow',
          method: 'GET',
          headers: '{}',
          request_body: '',
          expected_status_code: 200,
          check_interval: '5m',
          timeout_ms: 5000,
          current_status: 'DEGRADED',
          last_response_time_ms: 1250,
        },
        {
          userId: demoUserId,
          name: 'Internal Mock - Failing Service',
          url: 'http://localhost:5000/api/mock/failing',
          method: 'GET',
          headers: '{}',
          request_body: '',
          expected_status_code: 200,
          check_interval: '5m',
          timeout_ms: 5000,
          current_status: 'DOWN',
          last_response_time_ms: 45,
        },
        {
          userId: adminId,
          name: 'Public Cat Facts API (Admin Monitor)',
          url: 'https://catfact.ninja/fact',
          method: 'GET',
          headers: '{}',
          request_body: '',
          expected_status_code: 200,
          check_interval: '15m',
          timeout_ms: 5000,
          current_status: 'UP',
          last_response_time_ms: 180,
        },
      ];

      for (const api of sampleApis) {
        const inserted = await query(
          `INSERT INTO monitored_apis (
            user_id, name, url, method, headers, request_body,
            expected_status_code, check_interval, timeout_ms, is_active,
            current_status, last_checked_at, last_response_time_ms, consecutive_failures
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12, $13)
          RETURNING id`,
          [
            api.userId,
            api.name,
            api.url,
            api.method,
            api.headers,
            api.request_body,
            api.expected_status_code,
            api.check_interval,
            api.timeout_ms,
            true,
            api.current_status,
            api.last_response_time_ms,
            api.current_status === 'DOWN' ? 3 : 0,
          ]
        );

        const newApiId = inserted.rows[0]?.id || inserted.insertId;

        // Seed 10-15 historical check logs for rich initial visualization
        const now = Date.now();
        for (let i = 12; i >= 0; i--) {
          const timestamp = new Date(now - i * 5 * 60 * 1000).toISOString();
          let status = api.current_status;
          let statusCode = api.expected_status_code;
          let responseTime = api.last_response_time_ms + Math.floor(Math.random() * 40 - 20);
          let failureReason = null;
          let isSuccess = true;

          if (api.current_status === 'DOWN') {
            status = 'DOWN';
            statusCode = 500;
            isSuccess = false;
            failureReason = 'HTTP status 500 Internal Server Error (Expected 200)';
            responseTime = 35 + Math.floor(Math.random() * 20);
          } else if (api.current_status === 'DEGRADED') {
            status = 'DEGRADED';
            statusCode = 200;
            isSuccess = true;
            failureReason = 'Response time 1250ms exceeded healthy threshold of 1000ms';
            responseTime = 1100 + Math.floor(Math.random() * 300);
          }

          await query(
            `INSERT INTO health_check_logs (
              api_id, status, response_time_ms, status_code, is_success,
              failure_reason, response_snippet, checked_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              newApiId,
              status,
              Math.max(10, responseTime),
              statusCode,
              isSuccess,
              failureReason,
              status === 'DOWN' ? '{"error": "Simulated database connection failure"}' : '{"status": "ok"}',
              timestamp,
            ]
          );
        }
      }
      console.log('✅ Seeded starter APIs and historical health checks.');
    }
  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
  }
}

module.exports = { seedInitialData };
