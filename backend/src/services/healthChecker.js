const axios = require('axios');
const { query } = require('../config/db');

/**
 * Execute health check on a single monitored API record
 * @param {Object} api - The monitored API database record
 * @returns {Object} result of the check
 */
async function performHealthCheck(api) {
  const startTime = Date.now();
  let status = 'DOWN';
  let statusCode = null;
  let responseTimeMs = 0;
  let failureReason = null;
  let responseSnippet = null;
  let isSuccess = false;

  const timeout = api.timeout_ms || 5000;
  const expectedStatus = parseInt(api.expected_status_code || 200, 10);

  let parsedHeaders = {};
  if (api.headers) {
    try {
      parsedHeaders = typeof api.headers === 'string' ? JSON.parse(api.headers) : api.headers;
    } catch (e) {
      parsedHeaders = {};
    }
  }

  let dataPayload = undefined;
  if (api.request_body && ['POST', 'PUT', 'PATCH'].includes((api.method || 'GET').toUpperCase())) {
    try {
      dataPayload = typeof api.request_body === 'string' ? JSON.parse(api.request_body) : api.request_body;
    } catch (e) {
      dataPayload = api.request_body;
    }
  }

  try {
    const response = await axios({
      method: (api.method || 'GET').toLowerCase(),
      url: api.url,
      headers: {
        'User-Agent': 'HealthCheck-Monitor/1.0',
        ...parsedHeaders,
      },
      data: dataPayload,
      timeout: timeout,
      maxRedirects: 5,
      validateStatus: () => true, // capture all status codes without throwing
    });

    const endTime = Date.now();
    responseTimeMs = endTime - startTime;
    statusCode = response.status;

    // Check snippet
    try {
      if (typeof response.data === 'object') {
        responseSnippet = JSON.stringify(response.data).slice(0, 300);
      } else if (typeof response.data === 'string') {
        responseSnippet = response.data.slice(0, 300);
      }
    } catch (err) {
      responseSnippet = '';
    }

    if (statusCode === expectedStatus) {
      isSuccess = true;
      if (responseTimeMs > 1000) {
        status = 'DEGRADED';
        failureReason = `High Latency: ${responseTimeMs}ms exceeds 1000ms threshold`;
      } else {
        status = 'UP';
      }
    } else {
      isSuccess = false;
      if (statusCode >= 500) {
        status = 'DOWN';
        failureReason = `Server Error ${statusCode} (Expected ${expectedStatus})`;
      } else {
        status = 'DEGRADED';
        failureReason = `Status Code Mismatch: Received ${statusCode}, expected ${expectedStatus}`;
      }
    }
  } catch (error) {
    const endTime = Date.now();
    responseTimeMs = endTime - startTime;
    isSuccess = false;
    status = 'DOWN';

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      failureReason = `Request Timeout: Exceeded ${timeout}ms threshold`;
    } else if (error.code === 'ECONNREFUSED') {
      failureReason = `Connection Refused: Target server is unreachable`;
    } else if (error.code === 'ENOTFOUND') {
      failureReason = `DNS Lookup Failed: Domain name not resolved`;
    } else {
      failureReason = `Network Failure: ${error.message}`;
    }
  }

  const consecutiveFailures = isSuccess ? 0 : (api.consecutive_failures || 0) + 1;

  // Insert log record
  await query(
    `INSERT INTO health_check_logs (
      api_id, status, response_time_ms, status_code, is_success,
      failure_reason, response_snippet, checked_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
    [
      api.id,
      status,
      responseTimeMs,
      statusCode,
      isSuccess,
      failureReason,
      responseSnippet,
    ]
  );

  // Update monitored_apis
  await query(
    `UPDATE monitored_apis
     SET current_status = $1,
         last_checked_at = CURRENT_TIMESTAMP,
         last_response_time_ms = $2,
         consecutive_failures = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [status, responseTimeMs, consecutiveFailures, api.id]
  );

  return {
    apiId: api.id,
    name: api.name,
    status,
    statusCode,
    responseTimeMs,
    isSuccess,
    failureReason,
    consecutiveFailures,
  };
}

/**
 * Execute health check on all active APIs
 */
async function checkAllActiveApis() {
  try {
    const apisResult = await query(
      'SELECT * FROM monitored_apis WHERE is_active = $1',
      [true]
    );

    const apis = apisResult.rows;
    if (apis.length === 0) return [];

    // Run concurrently in chunks of 5
    const results = [];
    const chunkSize = 5;
    for (let i = 0; i < apis.length; i += chunkSize) {
      const chunk = apis.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(chunk.map((api) => performHealthCheck(api)));
      chunkResults.forEach((res) => {
        if (res.status === 'fulfilled') {
          results.push(res.value);
        }
      });
    }

    return results;
  } catch (error) {
    console.error('❌ Error executing scheduled health checks:', error);
    return [];
  }
}

module.exports = {
  performHealthCheck,
  checkAllActiveApis,
};
