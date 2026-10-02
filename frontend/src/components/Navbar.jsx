import React from 'react';
import { Activity, Shield, LogOut, Plus, Server, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentView, setCurrentView, onOpenAddModal }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="navbar">
      <div className="brand" onClick={() => setCurrentView('dashboard')}>
        <div className="brand-icon-box">
          <Activity size={22} />
        </div>
        <div>
          <div className="brand-title">PulseAPI</div>
          <div className="brand-subtitle">Health & Monitoring</div>
        </div>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <Server size={17} />
          <span>Dashboard</span>
        </button>

        {isAdmin && (
          <button
            className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentView('admin')}
          >
            <Shield size={17} />
            <span>Admin Center</span>
          </button>
        )}

        <button className="btn btn-primary btn-sm" onClick={onOpenAddModal}>
          <Plus size={16} />
          <span>Add Monitor</span>
        </button>

        <div className="nav-user">
          <div className="user-badge">
            <User size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 600 }}>{user?.username}</span>
            <span className={`role-tag ${user?.role}`}>{user?.role}</span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={logout}
            title="Log Out"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
