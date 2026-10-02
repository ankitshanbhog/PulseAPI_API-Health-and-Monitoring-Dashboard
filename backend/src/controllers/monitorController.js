const { query } = require('../config/db');

// Get Health Check History for a specific API
async function getApiHistory(req, res) {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1, status } = req.query;

    // Verify ownership or admin
    const apiRes = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);
    if (apiRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'API not found.' });
    }

    if (req.user.role !== 'admin' && apiRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [id];
    let sql = 'SELECT * FROM health_check_logs WHERE api_id = $1';

    if (status && ['UP', 'DOWN', 'DEGRADED'].includes(status.toUpperCase())) {
      params.push(status.toUpperCase());
      sql += ` AND status = $${params.length}`;
    }

    sql += ' ORDER BY checked_at DESC';

    // Count query
    let countSql = 'SELECT COUNT(*) as total FROM health_check_logs WHERE api_id = $1';
    const countParams = [id];
    if (status && ['UP', 'DOWN', 'DEGRADED'].includes(status.toUpperCase())) {
      countParams.push(status.toUpperCase());
      countSql += ` AND status = $${countParams.length}`;
    }

    const countRes = await query(countSql, countParams);
    const totalRecords = parseInt(countRes.rows[0].total, 10);

    // Limit & offset
    params.push(parseInt(limit, 10));
    sql += ` LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const logsRes = await query(sql, params);

    return res.status(200).json({
      success: true,
      data: {
        logs: logsRes.rows,
        pagination: {
          total: totalRecords,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(totalRecords / parseInt(limit, 10)),
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching API history logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve check history.',
    });
  }
}

// Get API Metrics & Timeline points for charts
async function getApiMetrics(req, res) {
  try {
    const { id } = req.params;
    const { points = 30 } = req.query;

    const apiRes = await query('SELECT * FROM monitored_apis WHERE id = $1', [id]);
    if (apiRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'API not found.' });
    }

    if (req.user.role !== 'admin' && apiRes.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Get last N logs in chronological order
    const logsRes = await query(
      `SELECT id, status, response_time_ms, status_code, is_success, failure_reason, checked_at
       FROM health_check_logs
       WHERE api_id = $1
       ORDER BY checked_at DESC
       LIMIT $2`,
      [id, parseInt(points, 10)]
    );

    // Reverse to chronological order (oldest to newest)
    const timeline = logsRes.rows.reverse();

    return res.status(200).json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    console.error('❌ Error fetching API metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics.',
    });
  }
}

// Get Dashboard Summary Overview for the logged-in user
async function getDashboardOverview(req, res) {
  try {
    let apiFilterSql = '';
    const filterParams = [];

    if (req.user.role !== 'admin') {
      filterParams.push(req.user.id);
      apiFilterSql = ' WHERE user_id = $1';
    }

    // Monitored APIs status breakdown
    const apisRes = await query(
      `SELECT id, name, url, current_status, is_active, consecutive_failures, last_response_time_ms, last_checked_at
       FROM monitored_apis ${apiFilterSql}`,
      filterParams
    );

    const apis = apisRes.rows;
    const totalApis = apis.length;
    const upCount = apis.filter((a) => a.current_status === 'UP').length;
    const degradedCount = apis.filter((a) => a.current_status === 'DEGRADED').length;
    const downCount = apis.filter((a) => a.current_status === 'DOWN').length;
    const unknownCount = apis.filter((a) => a.current_status === 'UNKNOWN' || !a.current_status).length;
    const activeMonitorsCount = apis.filter((a) => Boolean(a.is_active)).length;

    // Aggregate overall uptime & average latency across user's APIs
    let overallUptime = 100.0;
    let avgLatency = 0;
    let totalChecks = 0;

    if (apis.length > 0) {
      const apiIds = apis.map((a) => a.id);
      const inClause = apiIds.map((_, idx) => `$${idx + 1}`).join(',');
      const logsSummary = await query(
        `SELECT 
           COUNT(*) as total_checks,
           SUM(CASE WHEN is_success = 1 OR is_success = TRUE THEN 1 ELSE 0 END) as successful_checks,
           AVG(response_time_ms) as avg_latency
         FROM health_check_logs
         WHERE api_id IN (${inClause})`,
        apiIds
      );

      const summaryRow = logsSummary.rows[0];
      totalChecks = parseInt(summaryRow?.total_checks || 0, 10);
      const successfulChecks = parseInt(summaryRow?.successful_checks || 0, 10);

      if (totalChecks > 0) {
        overallUptime = parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2));
        avgLatency = Math.round(parseFloat(summaryRow?.avg_latency || 0));
      }
    }

    // Recent failures / incidents
    let recentFailures = [];
    if (apis.length > 0) {
      const apiIds = apis.map((a) => a.id);
      const inClause = apiIds.map((_, idx) => `$${idx + 1}`).join(',');
      const failuresRes = await query(
        `SELECT l.id, l.api_id, a.name as api_name, a.url, l.status, l.response_time_ms,
                l.status_code, l.failure_reason, l.checked_at
         FROM health_check_logs l
         JOIN monitored_apis a ON l.api_id = a.id
         WHERE l.api_id IN (${inClause}) AND (l.status = 'DOWN' OR l.status = 'DEGRADED')
         ORDER BY l.checked_at DESC
         LIMIT 5`,
        apiIds
      );
      recentFailures = failuresRes.rows;
    }

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalApis,
          activeMonitorsCount,
          upCount,
          degradedCount,
          downCount,
          unknownCount,
          overallUptime,
          avgLatency,
          totalChecks,
        },
        recentFailures,
        apis,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard overview.',
    });
  }
}

module.exports = {
  getApiHistory,
  getApiMetrics,
  getDashboardOverview,
};
