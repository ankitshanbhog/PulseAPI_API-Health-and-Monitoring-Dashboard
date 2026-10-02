const cron = require('node-cron');
const { query } = require('../config/db');
const { performHealthCheck } = require('./healthChecker');
const env = require('../config/env');

let cronJob = null;

function intervalToMinutes(intervalStr) {
  switch (intervalStr) {
    case '1m': return 1;
    case '5m': return 5;
    case '15m': return 15;
    case '30m': return 30;
    case '60m': return 60;
    default: return 5;
  }
}

/**
 * Check which active APIs are due for a health check
 */
async function processDueHealthChecks() {
  try {
    const apisResult = await query(
      'SELECT * FROM monitored_apis WHERE is_active = $1',
      [true]
    );

    const now = Date.now();
    const apisToRun = apisResult.rows.filter((api) => {
      if (!api.last_checked_at) return true;
      const lastCheckTime = new Date(api.last_checked_at).getTime();
      const intervalMinutes = intervalToMinutes(api.check_interval);
      const intervalMs = intervalMinutes * 60 * 1000;
      // Allow a 10s grace window
      return now - lastCheckTime >= intervalMs - 10000;
    });

    if (apisToRun.length > 0) {
      console.log(`⏱️ [CRON] Running automated health checks for ${apisToRun.length} due API(s)...`);
      const results = await Promise.allSettled(
        apisToRun.map((api) => performHealthCheck(api))
      );

      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'UP'
      ).length;
      console.log(`✅ [CRON] Check cycle completed. ${successCount}/${apisToRun.length} UP.`);
    }
  } catch (error) {
    console.error('❌ [CRON] Error during scheduled health check cycle:', error);
  }
}

function startScheduler() {
  const cronPattern = env.DEFAULT_CHECK_INTERVAL_CRON; // runs every minute
  console.log(`⏰ Initializing node-cron health check scheduler with pattern: "${cronPattern}"`);

  cronJob = cron.schedule(cronPattern, async () => {
    await processDueHealthChecks();
  });

  return cronJob;
}

function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    console.log('🛑 node-cron health check scheduler stopped.');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  processDueHealthChecks,
};
