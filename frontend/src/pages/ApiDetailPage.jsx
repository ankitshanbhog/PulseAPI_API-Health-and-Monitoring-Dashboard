import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Play,
  Pause,
  Edit,
  Trash2,
  Clock,
  Zap,
  Shield,
  Activity,
  AlertTriangle,
  Code,
  CheckCircle,
} from 'lucide-react';
import HealthBadge from '../components/HealthBadge';
import ResponseChart from '../components/ResponseChart';
import UptimeBar from '../components/UptimeBar';
import HistoryTable from '../components/HistoryTable';
import { monitorService, metricsService } from '../services/api';

export default function ApiDetailPage({ apiId, onBack, onEditApi }) {
  const [api, setApi] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadData = async (page = 1) => {
    try {
      const [apiRes, metricsRes, historyRes] = await Promise.all([
        monitorService.getMonitorById(apiId),
        metricsService.getApiMetrics(apiId, { points: 30 }),
        metricsService.getApiHistory(apiId, { page, limit: 15 }),
      ]);

      if (apiRes.data?.data) {
        setApi(apiRes.data.data);
      }
      if (metricsRes.data?.data) {
        setMetrics(metricsRes.data.data);
      }
      if (historyRes.data?.data) {
        setHistoryLogs(historyRes.data.data.logs);
        setPagination(historyRes.data.data.pagination);
      }
    } catch (err) {
      console.error('Error loading API details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
    const interval = setInterval(() => loadData(pagination.page), 20000);
    return () => clearInterval(interval);
  }, [apiId]);

  const handleCheckNow = async () => {
    try {
      setChecking(true);
      await monitorService.checkNow(apiId);
      await loadData(pagination.page);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleActive = async () => {
    await monitorService.toggleMonitor(apiId);
    await loadData(pagination.page);
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete API monitor "${api?.name}" permanently?`)) {
      await monitorService.deleteMonitor(apiId);
      onBack();
    }
  };

  const handlePageChange = (newPage) => {
    loadData(newPage);
  };

  if (loading || !api) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
        Loading monitor telemetry...
      </div>
    );
  }

  const uptime = api.stats?.uptimePercentage ?? 100;
  const avgLatency = api.stats?.avgLatencyMs ?? 0;
  const minLatency = api.stats?.minLatencyMs ?? 0;
  const maxLatency = api.stats?.maxLatencyMs ?? 0;
  const totalChecks = api.stats?.totalChecks ?? 0;

  return (
    <div>
      {/* Navigation & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Main Top Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className={`method-tag ${api.method}`}>{api.method}</span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {api.name}
              </h1>
              <HealthBadge status={api.current_status} />
              {!api.is_active && (
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                  MONITORING PAUSED
                </span>
              )}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{api.url}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleCheckNow}
            disabled={checking}
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            <span>Check Now</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleToggleActive}
            title={api.is_active ? 'Pause automated monitoring' : 'Resume automated monitoring'}
          >
            {api.is_active ? <Pause size={16} /> : <Play size={16} />}
            <span>{api.is_active ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => onEditApi(api)}
          >
            <Edit size={16} />
            <span>Edit</span>
          </button>

          <button
            className="btn btn-danger"
            onClick={handleDelete}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Failure Detection Alert Banner */}
      {api.consecutive_failures > 0 && (
        <div className="incident-banner">
          <AlertTriangle size={24} style={{ color: '#f43f5e', flexShrink: 0 }} />
          <div>
            <strong>Service Failure Alert:</strong> This endpoint has failed{' '}
            <strong>{api.consecutive_failures}</strong> consecutive health checks.
            {historyLogs[0]?.failure_reason && (
              <div style={{ marginTop: '0.2rem', color: '#fecdd3' }}>
                Latest Error: {historyLogs[0].failure_reason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Overall Uptime
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: uptime >= 99 ? '#34d399' : uptime >= 90 ? '#fbbf24' : '#fb7185', marginTop: '0.25rem' }}>
            {uptime}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {totalChecks} total checks recorded
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Average Latency
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: avgLatency > 1000 ? '#f59e0b' : '#38bdf8', marginTop: '0.25rem' }}>
            {avgLatency} <span style={{ fontSize: '0.85rem' }}>ms</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Min {minLatency}ms / Max {maxLatency}ms
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Check Frequency
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {api.check_interval}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Timeout: {api.timeout_ms}ms
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Expected Status
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#a855f7', marginTop: '0.25rem' }}>
            {api.expected_status_code}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            HTTP Response Code
          </div>
        </div>
      </div>

      {/* Response Time Timeline Chart */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1.5rem' }}>
        <ResponseChart metrics={metrics} />
      </div>

      {/* Uptime Segment Visualizer */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Recent Telemetry Checks & Uptime Distribution
        </div>
        <UptimeBar logs={metrics} uptimePercentage={uptime} barCount={30} />
      </div>

      {/* API Configuration Details */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Code size={18} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Request Configuration Details</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Target Endpoint:</span>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-all' }}>
              {api.url}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)' }}>HTTP Method:</span>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
              {api.method}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)' }}>Headers:</span>
            <pre
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                background: 'var(--bg-input)',
                padding: '6px 10px',
                borderRadius: '6px',
                marginTop: '4px',
                border: '1px solid var(--border-subtle)',
                overflowX: 'auto',
              }}
            >
              {typeof api.headers === 'string' ? api.headers : JSON.stringify(api.headers, null, 2)}
            </pre>
          </div>

          {api.request_body && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Body Payload:</span>
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  background: 'var(--bg-input)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginTop: '4px',
                  border: '1px solid var(--border-subtle)',
                  overflowX: 'auto',
                }}
              >
                {typeof api.request_body === 'string' ? api.request_body : JSON.stringify(api.request_body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Monitoring Execution History</h2>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Auto-refreshing live logs
          </div>
        </div>

        <HistoryTable
          logs={historyLogs}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
