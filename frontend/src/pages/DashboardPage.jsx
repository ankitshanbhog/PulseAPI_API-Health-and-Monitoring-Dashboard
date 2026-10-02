import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  Server,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import ApiCard from '../components/ApiCard';
import { monitorService, metricsService } from '../services/api';

export default function DashboardPage({ onSelectApi, onOpenAddModal, onEditApi }) {
  const [apis, setApis] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [apisRes, overviewRes] = await Promise.all([
        monitorService.getMonitors(),
        metricsService.getDashboardOverview(),
      ]);

      if (apisRes.data?.data) {
        setApis(apisRes.data.data);
      }
      if (overviewRes.data?.data) {
        setOverview(overviewRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-poll every 30 seconds for live updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCheckNow = async (id) => {
    await monitorService.checkNow(id);
    await fetchData();
  };

  const handleToggleActive = async (id) => {
    await monitorService.toggleMonitor(id);
    await fetchData();
  };

  const handleDelete = async (id) => {
    await monitorService.deleteMonitor(id);
    await fetchData();
  };

  // Filter APIs
  const filteredApis = apis.filter((api) => {
    const matchesSearch =
      api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.url.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'ACTIVE') return matchesSearch && api.is_active;
    return matchesSearch && api.current_status === statusFilter;
  });

  const stats = overview?.stats || {
    totalApis: apis.length,
    upCount: apis.filter((a) => a.current_status === 'UP').length,
    degradedCount: apis.filter((a) => a.current_status === 'DEGRADED').length,
    downCount: apis.filter((a) => a.current_status === 'DOWN').length,
    overallUptime: 100,
    avgLatency: 0,
  };

  const incidents = overview?.recentFailures || [];

  return (
    <div>
      {/* Top Header Title & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc' }}>
            API Health & Monitoring Overview
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Real-time status, latency metrics, uptime performance, and automated health checks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh All Data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenAddModal}>
            <Plus size={16} />
            <span>Register API</span>
          </button>
        </div>
      </div>

      {/* Incident / Service Failure Detection Banner */}
      {incidents.length > 0 && (
        <div className="incident-banner">
          <AlertTriangle size={22} style={{ color: '#f43f5e', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Active Service Alert:</strong> {incidents[0].api_name} ({incidents[0].status}) -{' '}
            <span style={{ color: '#fecdd3' }}>{incidents[0].failure_reason}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fecdd3', opacity: 0.8 }}>
            {new Date(incidents[0].checked_at).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Total Monitored APIs"
          value={stats.totalApis}
          icon={Server}
          color="#6366f1"
          subtext={`${stats.activeMonitorsCount || stats.totalApis} active monitors`}
        />
        <StatCard
          label="Services Operational (UP)"
          value={stats.upCount}
          icon={CheckCircle}
          color="#10b981"
          subtext="Healthy response times"
        />
        <StatCard
          label="Degraded Services"
          value={stats.degradedCount}
          icon={AlertTriangle}
          color="#f59e0b"
          subtext="High latency / status warn"
        />
        <StatCard
          label="Service Outages (DOWN)"
          value={stats.downCount}
          icon={XCircle}
          color="#f43f5e"
          subtext="Connection failures / 5xx"
        />
        <StatCard
          label="Overall System Uptime"
          value={`${stats.overallUptime}%`}
          icon={Activity}
          color="#38bdf8"
          subtext={`Based on ${stats.totalChecks || 0} checks`}
        />
        <StatCard
          label="Average Response Time"
          value={`${stats.avgLatency} ms`}
          icon={Clock}
          color="#a855f7"
          subtext="Across all monitored targets"
        />
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={17}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by name or URL..."
              className="form-control"
              style={{ paddingLeft: '2.4rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.25)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          {['ALL', 'UP', 'DEGRADED', 'DOWN', 'ACTIVE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                background: statusFilter === tab ? 'var(--color-primary)' : 'transparent',
                color: statusFilter === tab ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* API Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
          Loading monitored APIs...
        </div>
      ) : filteredApis.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Server size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {searchTerm || statusFilter !== 'ALL' ? 'No matching APIs found' : 'No monitored APIs yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filter tags.'
              : 'Register your first REST API endpoint to start automated health tracking, response time graphs, and uptime alerts.'}
          </p>
          <button className="btn btn-primary" onClick={onOpenAddModal}>
            <Plus size={16} />
            <span>Register New API Monitor</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredApis.map((api) => (
            <ApiCard
              key={api.id}
              api={api}
              onCheckNow={handleCheckNow}
              onToggleActive={handleToggleActive}
              onEdit={onEditApi}
              onDelete={handleDelete}
              onSelect={onSelectApi}
            />
          ))}
        </div>
      )}
    </div>
  );
}
