import React, { useState } from 'react';

export default function ResponseChart({ metrics = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!metrics || metrics.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
        No latency data recorded yet for this API monitor.
      </div>
    );
  }

  const latencies = metrics.map((m) => m.response_time_ms || 0);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies, 50); // baseline minimum 50ms scale
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  // Chart dimensions
  const width = 800;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Scale calculations
  const getY = (val) => {
    const clamped = Math.max(0, val);
    const ratio = clamped / (maxLatency * 1.15 || 1);
    return height - paddingY - ratio * chartHeight;
  };

  const getX = (idx) => {
    if (metrics.length === 1) return width / 2;
    return paddingX + (idx / (metrics.length - 1)) * chartWidth;
  };

  // Build SVG points
  const points = metrics.map((m, idx) => ({
    x: getX(idx),
    y: getY(m.response_time_ms),
    val: m.response_time_ms,
    status: m.status,
    statusCode: m.status_code,
    time: m.checked_at,
  }));

  const pathD = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`;
  }, '');

  // Fill area under curve
  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`
    : '';

  const avgY = getY(avgLatency);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Header Stat Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Response Time Trend (Last {metrics.length} Checks)
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
          <div>Min: <span style={{ fontWeight: 600, color: '#38bdf8' }}>{minLatency}ms</span></div>
          <div>Avg: <span style={{ fontWeight: 600, color: '#818cf8' }}>{avgLatency}ms</span></div>
          <div>Max: <span style={{ fontWeight: 600, color: '#f43f5e' }}>{maxLatency}ms</span></div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: '450px', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Average latency line */}
          <line
            x1={paddingX}
            y1={avgY}
            x2={width - paddingX}
            y2={avgY}
            stroke="rgba(99, 102, 241, 0.4)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <text
            x={paddingX + 5}
            y={avgY - 6}
            fill="#818cf8"
            fontSize="10"
            fontFamily="monospace"
          >
            avg: {avgLatency}ms
          </text>

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#latencyGradient)" />}

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isDegraded = pt.status === 'DEGRADED';
            const isDown = pt.status === 'DOWN';
            const color = isDown ? '#f43f5e' : isDegraded ? '#f59e0b' : '#10b981';

            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint === idx ? 6 : 4}
                fill={color}
                stroke="#111827"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint !== null && points[hoveredPoint] && (
          <div
            style={{
              position: 'absolute',
              left: `${(points[hoveredPoint].x / width) * 100}%`,
              top: `${(points[hoveredPoint].y / height) * 100}%`,
              transform: 'translate(-50%, -120%)',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              color: '#f8fafc',
              pointerEvents: 'none',
              zIndex: 50,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 700, color: '#38bdf8' }}>
              {points[hoveredPoint].val} ms
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Status: {points[hoveredPoint].status} ({points[hoveredPoint].statusCode || 'N/A'})
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {new Date(points[hoveredPoint].time).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
