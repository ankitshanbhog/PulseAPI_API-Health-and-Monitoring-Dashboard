const { query } = require('../config/db');

// Get all registered users and their monitor counts
async function getAllUsers(req, res) {
  try {
    const usersRes = await query(`
      SELECT u.id, u.username, u.email, u.role, u.created_at,
             COUNT(a.id) as total_monitors
      FROM users u
      LEFT JOIN monitored_apis a ON u.id = a.user_id
      GROUP BY u.id, u.username, u.email, u.role, u.created_at
      ORDER BY u.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: usersRes.rows,
    });
  } catch (error) {
    console.error('❌ Admin error getting all users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
    });
  }
}

// Get all APIs across all users with user details
async function getAllApis(req, res) {
  try {
    const apisRes = await query(`
      SELECT a.*, u.username as owner_username, u.email as owner_email
      FROM monitored_apis a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: apisRes.rows,
    });
  } catch (error) {
    console.error('❌ Admin error getting all APIs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve all APIs.',
    });
  }
}

// Get global system statistics
async function getSystemStats(req, res) {
  try {
    const usersCountRes = await query('SELECT COUNT(*) as count FROM users');
    const apisCountRes = await query('SELECT COUNT(*) as count FROM monitored_apis');
    const logsCountRes = await query('SELECT COUNT(*) as count FROM health_check_logs');

    const statusBreakdownRes = await query(`
      SELECT 
        SUM(CASE WHEN current_status = 'UP' THEN 1 ELSE 0 END) as up_count,
        SUM(CASE WHEN current_status = 'DEGRADED' THEN 1 ELSE 0 END) as degraded_count,
        SUM(CASE WHEN current_status = 'DOWN' THEN 1 ELSE 0 END) as down_count,
        SUM(CASE WHEN is_active = 1 OR is_active = TRUE THEN 1 ELSE 0 END) as active_count
      FROM monitored_apis
    `);

    const overallLogsRes = await query(`
      SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN is_success = 1 OR is_success = TRUE THEN 1 ELSE 0 END) as successful_checks,
        AVG(response_time_ms) as avg_latency
      FROM health_check_logs
    `);

    const breakdown = statusBreakdownRes.rows[0];
    const logStats = overallLogsRes.rows[0];
    const totalChecks = parseInt(logStats?.total_checks || 0, 10);
    const successfulChecks = parseInt(logStats?.successful_checks || 0, 10);
    const globalUptime = totalChecks > 0 ? parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2)) : 100.0;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: parseInt(usersCountRes.rows[0].count, 10),
        totalApis: parseInt(apisCountRes.rows[0].count, 10),
        totalHealthChecksLogged: totalChecks,
        globalUptimePercentage: globalUptime,
        averageSystemLatencyMs: Math.round(parseFloat(logStats?.avg_latency || 0)),
        statusBreakdown: {
          up: parseInt(breakdown?.up_count || 0, 10),
          degraded: parseInt(breakdown?.degraded_count || 0, 10),
          down: parseInt(breakdown?.down_count || 0, 10),
          active: parseInt(breakdown?.active_count || 0, 10),
        },
      },
    });
  } catch (error) {
    console.error('❌ Admin error getting system stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve system statistics.',
    });
  }
}

// Update user role (e.g., promote to admin or demote)
async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be 'user' or 'admin'.",
      });
    }

    // Prevent changing own role
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot alter your own admin role.',
      });
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
    });
  } catch (error) {
    console.error('❌ Admin error updating user role:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
}

// Delete user and cascade their APIs
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.',
      });
    }

    // Delete user's logs & APIs
    const userApis = await query('SELECT id FROM monitored_apis WHERE user_id = $1', [id]);
    for (const api of userApis.rows) {
      await query('DELETE FROM health_check_logs WHERE api_id = $1', [api.id]);
    }
    await query('DELETE FROM monitored_apis WHERE user_id = $1', [id]);
    await query('DELETE FROM users WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'User and their monitored APIs deleted successfully.',
    });
  } catch (error) {
    console.error('❌ Admin error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
    });
  }
}

module.exports = {
  getAllUsers,
  getAllApis,
  getSystemStats,
  updateUserRole,
  deleteUser,
};
