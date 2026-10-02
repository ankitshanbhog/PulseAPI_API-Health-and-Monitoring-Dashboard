const { query } = require('../config/db');
const { performHealthCheck } = require('../services/healthChecker');

/**
 * Helper to compute uptime & latency metrics for an API
 */
async function getApiStats(apiId) {
  const statsRes = await query(
    `SELECT 
       COUNT(*) as total_checks,
       SUM(CASE WHEN is_success = 1 OR is_success = TRUE THEN 1 ELSE 0 END) as successful_checks,
       AVG(response_time_ms) as avg_latency,
       MIN(response_time_ms) as min_latency,
       MAX(response_time_ms) as max_latency
     FROM health_check_logs
     WHERE api_id = $1`,
    [apiId]
  );

  const row = statsRes.rows[0];
  const total = parseInt(row?.total_checks || 0, 10);
  const successful = parseInt(row?.successful_checks || 0, 10);
  const uptime = total > 0 ? parseFloat(((successful / total) * 100).toFixed(2)) : 100.0;
  const avgLatency = Math.round(parseFloat(row?.avg_latency || 0));
  const minLatency = parseInt(row?.min_latency || 0, 10);
  const maxLatency = parseInt(row?.max_latency || 0, 10);

  return {
    totalChecks: total,
    successfulChecks: successful,
    uptimePercentage: uptime,
    avgLatencyMs: avgLatency,
    minLatencyMs: minLatency,
    maxLatencyMs: maxLatency,
  };
}

// Get all APIs for logged-in user (or all APIs if admin requests with ?all=true)
async function getUserApis(req, res) {
  try {
    const { search, status, all } = req.query;
    let sql = 'SELECT * FROM monitored_apis WHERE 1=1';
    const params = [];

    // RBAC: Standard user only gets their own APIs
    if (req.user.role !== 'admin' || all !== 'true') {
      params.push(req.user.id);
      sql += ` AND user_id = $${params.length}`;
    }

    if (status && ['UP', 'DOWN', 'DEGRADED'].includes(status.toUpperCase())) {
      params.push(status.toUpperCase());
      sql += ` AND current_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (name LIKE $${params.length} OR url LIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    const apis = result.rows;

    // Attach basic uptime & avg latency to each API
    const apisWithStats = await Promise.all(
      apis.map(async (api) => {
        const stats = await getApiStats(api.id);
        return {
          ...api,
          is_active: Boolean(api.is_active),
          stats,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: apisWithStats,
    });
  } catch (error) {
    console.error('❌ Error fetching user APIs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve monitored APIs.',
    });
  }
}

// Get single API details
async function getApiById(req, res) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Monitored API not found.',
      });
    }

    const api = result.rows[0];

    // Ownership check (unless admin)
    if (req.user.role !== 'admin' && api.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this API resource.',
      });
    }

    const stats = await getApiStats(api.id);

    return res.status(200).json({
      success: true,
      data: {
        ...api,
        is_active: Boolean(api.is_active),
        stats,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching API by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve API details.',
    });
  }
}

// Register a new API for monitoring
async function createApi(req, res) {
  try {
    const {
      name,
      url,
      method = 'GET',
      headers = '{}',
      request_body = '',
      expected_status_code = 200,
      check_interval = '5m',
      timeout_ms = 5000,
    } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: 'API Name and Target URL are required.',
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlErr) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Target URL. Please include protocol (http:// or https://).',
      });
    }

    let headersStr = typeof headers === 'object' ? JSON.stringify(headers) : headers;
    let bodyStr = typeof request_body === 'object' ? JSON.stringify(request_body) : request_body;

    const insertResult = await query(
      `INSERT INTO monitored_apis (
        user_id, name, url, method, headers, request_body,
        expected_status_code, check_interval, timeout_ms, is_active,
        current_status, last_checked_at, last_response_time_ms, consecutive_failures
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, 0, 0)
      RETURNING id, name, url, method, headers, request_body, expected_status_code,
                check_interval, timeout_ms, is_active, current_status, created_at`,
      [
        req.user.id,
        name.trim(),
        url.trim(),
        method.toUpperCase(),
        headersStr || '{}',
        bodyStr || '',
        parseInt(expected_status_code, 10) || 200,
        check_interval,
        parseInt(timeout_ms, 10) || 5000,
        true,
        'UNKNOWN',
      ]
    );

    const newApi = insertResult.rows[0] || {
      id: insertResult.insertId,
      user_id: req.user.id,
      name: name.trim(),
      url: url.trim(),
      method: method.toUpperCase(),
      expected_status_code: parseInt(expected_status_code, 10) || 200,
      check_interval,
      timeout_ms: parseInt(timeout_ms, 10) || 5000,
      is_active: true,
      current_status: 'UNKNOWN',
    };

    // Run immediate initial health check so user sees status right away
    const checkResult = await performHealthCheck(newApi);

    // Fetch updated record
    const updated = await query('SELECT * FROM monitored_apis WHERE id = $1', [newApi.id]);
    const finalApi = updated.rows[0];
    const stats = await getApiStats(finalApi.id);

    return res.status(201).json({
      success: true,
      message: 'API registered and initial health check performed.',
      data: {
        ...finalApi,
        is_active: Boolean(finalApi.is_active),
        stats,
        initialCheck: checkResult,
      },
    });
  } catch (error) {
    console.error('❌ Error creating API monitor:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register API monitor.',
    });
  }
}

// Update monitored API
async function updateApi(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API not found.',
      });
    }

    const currentApi = existing.rows[0];
    if (req.user.role !== 'admin' && currentApi.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this API.',
      });
    }

    const {
      name = currentApi.name,
      url = currentApi.url,
      method = currentApi.method,
      headers = currentApi.headers,
      request_body = currentApi.request_body,
      expected_status_code = currentApi.expected_status_code,
      check_interval = currentApi.check_interval,
      timeout_ms = currentApi.timeout_ms,
      is_active = currentApi.is_active,
    } = req.body;

    let headersStr = typeof headers === 'object' ? JSON.stringify(headers) : headers;
    let bodyStr = typeof request_body === 'object' ? JSON.stringify(request_body) : request_body;

    await query(
      `UPDATE monitored_apis
       SET name = $1, url = $2, method = $3, headers = $4,
           request_body = $5, expected_status_code = $6, check_interval = $7,
           timeout_ms = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10`,
      [
        name.trim(),
        url.trim(),
        method.toUpperCase(),
        headersStr,
        bodyStr,
        parseInt(expected_status_code, 10),
        check_interval,
        parseInt(timeout_ms, 10),
        is_active,
        id,
      ]
    );

    const updatedRes = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);
    const updatedApi = updatedRes.rows[0];
    const stats = await getApiStats(id);

    return res.status(200).json({
      success: true,
      message: 'API monitor updated successfully.',
      data: {
        ...updatedApi,
        is_active: Boolean(updatedApi.is_active),
        stats,
      },
    });
  } catch (error) {
    console.error('❌ Error updating API monitor:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update API monitor.',
    });
  }
}

// Delete monitored API
async function deleteApi(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API not found.',
      });
    }

    if (req.user.role !== 'admin' && existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this API.',
      });
    }

    // Delete associated logs then API
    await query('DELETE FROM health_check_logs WHERE api_id = $1', [id]);
    await query('DELETE FROM monitored_apis WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'API monitor and historical logs deleted successfully.',
    });
  } catch (error) {
    console.error('❌ Error deleting API monitor:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete API monitor.',
    });
  }
}

// Toggle API Active / Paused status
async function toggleApiStatus(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API not found.',
      });
    }

    const api = existing.rows[0];
    if (req.user.role !== 'admin' && api.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied.',
      });
    }

    const newActiveState = !api.is_active;
    await query(
      'UPDATE monitored_apis SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newActiveState, id]
    );

    return res.status(200).json({
      success: true,
      message: `Monitoring ${newActiveState ? 'resumed' : 'paused'} for this API.`,
      data: { id, is_active: newActiveState },
    });
  } catch (error) {
    console.error('❌ Error toggling API status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle API monitoring state.',
    });
  }
}

// Manual Health Check Trigger ("Check Now")
async function triggerManualCheck(req, res) {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'API not found.',
      });
    }

    const api = existing.rows[0];
    if (req.user.role !== 'admin' && api.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to check this API.',
      });
    }

    const checkResult = await performHealthCheck(api);
    const stats = await getApiStats(id);

    return res.status(200).json({
      success: true,
      message: 'Manual health check executed successfully.',
      data: {
        check: checkResult,
        stats,
      },
    });
  } catch (error) {
    console.error('❌ Error triggering manual check:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute manual health check.',
    });
  }
}

module.exports = {
  getUserApis,
  getApiById,
  createApi,
  updateApi,
  deleteApi,
  toggleApiStatus,
  triggerManualCheck,
};
