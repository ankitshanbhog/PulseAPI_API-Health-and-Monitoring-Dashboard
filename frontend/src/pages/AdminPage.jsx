import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Server,
  Activity,
  Trash2,
  UserCheck,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import HealthBadge from '../components/HealthBadge';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [allApis, setAllApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'apis'

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes, apisRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getAllApis(),
      ]);

      if (statsRes.data?.data) setStats(statsRes.data.data);
      if (usersRes.data?.data) setUsers(usersRes.data.data);
      if (apisRes.data?.data) setAllApis(apisRes.data.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const handleRoleChange = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (window.confirm(`Change role for this user to "${newRole}"?`)) {
      await adminService.updateUserRole(userId, newRole);
      await loadAdminData();
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}" and all their monitored APIs?`)) {
      await adminService.deleteUser(userId);
      await loadAdminData();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
        Loading system governance data...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', padding: '6px', borderRadius: '8px' }}>
              <Shield size={24} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              System Governance & RBAC Admin
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Platform-wide visibility, multi-tenant user access management, and global system health telemetry.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Global Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <StatCard
            label="Total Registered Users"
            value={stats.totalUsers}
            icon={Users}
            color="#38bdf8"
            subtext="RBAC accounts active"
          />
          <StatCard
            label="Global Monitored APIs"
            value={stats.totalApis}
            icon={Server}
            color="#6366f1"
            subtext={`${stats.statusBreakdown?.active || 0} active scheduled`}
          />
          <StatCard
            label="System Health Checks"
            value={stats.totalHealthChecksLogged}
            icon={Activity}
            color="#10b981"
            subtext="Lifetime ping executions"
          />
          <StatCard
            label="Global Platform Uptime"
            value={`${stats.globalUptimePercentage}%`}
            icon={Activity}
            color="#a855f7"
            subtext={`Avg Latency: ${stats.averageSystemLatencyMs}ms`}
          />
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'apis' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('apis')}
        >
          <Server size={16} />
          <span>All Monitored APIs ({allApis.length})</span>
        </button>
      </div>

      {/* Tab 1: Users Table */}
      {activeTab === 'users' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            User Accounts & Roles
          </h2>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Monitored APIs</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>#{u.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-tag ${u.role}`}>{u.role}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{u.total_monitors || 0} APIs</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {!isSelf ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRoleChange(u.id, u.role)}
                              title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                            >
                              <UserCheck size={14} />
                              <span>{u.role === 'admin' ? 'Make User' : 'Make Admin'}</span>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Delete User and their Monitors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Current Admin)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: System-wide APIs Table */}
      {activeTab === 'apis' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            System-Wide Monitored Endpoints
          </h2>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>API Name</th>
                  <th>Method & Target URL</th>
                  <th>Owner Account</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Interval</th>
                </tr>
              </thead>
              <tbody>
                {allApis.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`method-tag ${a.method}`}>{a.method}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {a.url}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{a.owner_username}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.owner_email}</div>
                    </td>
                    <td>
                      <HealthBadge status={a.current_status} />
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {a.last_response_time_ms ? `${a.last_response_time_ms} ms` : 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{a.check_interval}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
