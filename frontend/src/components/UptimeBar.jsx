import React, { useState } from 'react';

export default function UptimeBar({ logs = [], uptimePercentage = 100, barCount = 30 }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Fill array of segments from logs (newest at right)
  const segments = [];
  const recentLogs = logs.slice(0, barCount).reverse();

  for (let i = 0; i < barCount; i++) {
    const logIndex = i - (barCount - recentLogs.length);
    if (logIndex >= 0 && recentLogs[logIndex]) {
      segments.push(recentLogs[logIndex]);
    } else {
      segments.push({ status: 'UNKNOWN', empty: true });
    }
  }

  return (
    <div className="uptime-bar-container" style={{ position: 'relative' }}>
      <div className="uptime-bars">
        {segments.map((item, idx) => {
          const statusClass = item.status || 'UNKNOWN';
          return (
            <div
              key={idx}
              className={`uptime-segment ${statusClass}`}
              onMouseEnter={(e) => {
                if (!item.empty) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveTooltip({
                    ...item,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                  });
                }
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            />
          );
        })}
      </div>

      <div className="uptime-labels">
        <span>Recent 30 Checks</span>
        <span style={{ fontWeight: 600, color: uptimePercentage >= 99 ? 'var(--status-up)' : uptimePercentage >= 95 ? 'var(--status-degraded)' : 'var(--status-down)' }}>
          {uptimePercentage}% Uptime
        </span>
      </div>

      {activeTooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${activeTooltip.x}px`,
            top: `${activeTooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            color: '#f8fafc',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '2px', color: activeTooltip.status === 'UP' ? 'var(--status-up)' : activeTooltip.status === 'DEGRADED' ? 'var(--status-degraded)' : 'var(--status-down)' }}>
            Status: {activeTooltip.status} {activeTooltip.status_code ? `(${activeTooltip.status_code})` : ''}
          </div>
          <div>Latency: {activeTooltip.response_time_ms} ms</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            {new Date(activeTooltip.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  );
}
