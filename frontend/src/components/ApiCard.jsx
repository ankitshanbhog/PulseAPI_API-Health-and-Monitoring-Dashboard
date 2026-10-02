import React, { useState } from 'react';
import HealthBadge from './HealthBadge';
import UptimeBar from './UptimeBar';
import {
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  Trash2,
  Edit,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';

export default function ApiCard({
  api,
  onCheckNow,
  onToggleActive,
  onEdit,
  onDelete,
  onSelect,
}) {
  const [checking, setChecking] = useState(false);

  const handleManualCheck = async (e) => {
    e.stopPropagation();
    try {
      setChecking(true);
      await onCheckNow(api.id);
    } finally {
      setChecking(false);
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggleActive(api.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(api);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete monitor "${api.name}"?`)) {
      onDelete(api.id);
    }
  };

  const uptime = api.stats?.uptimePercentage ?? 100;
  const avgLatency = api.stats?.avgLatencyMs ?? api.last_response_time_ms ?? 0;

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.15rem',
      }}
      onClick={() => onSelect(api)}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className={`method-tag ${api.method}`}>{api.method}</span>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {api.name}
            </h3>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {api.url}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <HealthBadge status={api.current_status} />
          {!api.is_active && (
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
              PAUSED
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Zap size={12} style={{ color: '#38bdf8' }} /> Latency
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: avgLatency > 1000 ? '#f59e0b' : '#34d399', marginTop: '2px' }}>
            {avgLatency} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>ms</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Uptime</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: uptime >= 99 ? '#34d399' : uptime >= 90 ? '#fbbf24' : '#fb7185', marginTop: '2px' }}>
            {uptime}%
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={12} /> Interval
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {api.check_interval}
          </div>
        </div>
      </div>

      {/* Consecutive Failures Warning */}
      {api.consecutive_failures > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fda4af', fontSize: '0.78rem', background: 'rgba(244, 63, 94, 0.1)', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
          <AlertTriangle size={14} style={{ color: '#f43f5e' }} />
          <span><strong>{api.consecutive_failures}</strong> consecutive failure{api.consecutive_failures > 1 ? 's' : ''} detected</span>
        </div>
      )}

      {/* Action Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {api.last_checked_at
            ? `Checked: ${new Date(api.last_checked_at).toLocaleTimeString()}`
            : 'Pending initial check'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleManualCheck}
            disabled={checking}
            title="Run Health Check Now"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            <span>Check Now</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleToggle}
            title={api.is_active ? 'Pause Monitoring' : 'Resume Monitoring'}
          >
            {api.is_active ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleEdit}
            title="Edit Settings"
          >
            <Edit size={14} />
          </button>

          <button
            className="btn btn-danger btn-sm"
            onClick={handleDelete}
            title="Delete Monitor"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
