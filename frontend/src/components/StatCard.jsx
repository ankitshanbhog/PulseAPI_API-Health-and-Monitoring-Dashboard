import React from 'react';

export default function StatCard({ label, value, icon: Icon, color = '#6366f1', subtext }) {
  return (
    <div className="card stat-card">
      <div
        className="stat-icon-wrapper"
        style={{
          backgroundColor: `${color}18`,
          color: color,
          border: `1px solid ${color}30`,
        }}
      >
        {Icon && <Icon size={26} />}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {subtext && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
