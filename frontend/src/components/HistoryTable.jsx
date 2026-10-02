import React, { useState } from 'react';
import HealthBadge from './HealthBadge';
import { Eye, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export default function HistoryTable({ logs = [], pagination, onPageChange }) {
  const [selectedSnippet, setSelectedSnippet] = useState(null);

  return (
    <div className="table-container">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Health Status</th>
            <th>Response Time</th>
            <th>Status Code</th>
            <th>Failure / Message</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No check history found.
              </td>
            </tr>
          ) : (
            logs.map((log) => {
              const isFailure = log.status === 'DOWN' || log.status === 'DEGRADED';
              return (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {new Date(log.checked_at).toLocaleString()}
                  </td>
                  <td>
                    <HealthBadge status={log.status} />
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: log.response_time_ms > 1000 ? '#f59e0b' : '#34d399', fontWeight: 600 }}>
                      {log.response_time_ms} ms
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        background: log.status_code >= 400 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: log.status_code >= 400 ? '#fda4af' : '#6ee7b7',
                      }}
                    >
                      {log.status_code || 'ERR'}
                    </span>
                  </td>
                  <td>
                    {log.failure_reason ? (
                      <span style={{ color: isFailure ? '#fda4af' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={14} style={{ color: '#f43f5e', flexShrink: 0 }} />
                        <span>{log.failure_reason}</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Success (OK)</span>
                    )}
                  </td>
                  <td>
                    {log.response_snippet && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => setSelectedSnippet(log)}
                        title="View Raw Response"
                      >
                        <Eye size={13} />
                        <span>Payload</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total checks)
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Payload Modal */}
      {selectedSnippet && (
        <div className="modal-overlay" onClick={() => setSelectedSnippet(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Response Snippet Preview</div>
              <button
                onClick={() => setSelectedSnippet(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Checked At: {new Date(selectedSnippet.checked_at).toLocaleString()}
              </div>
              <pre
                style={{
                  background: 'var(--bg-input)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  color: '#e2e8f0',
                  overflowX: 'auto',
                  maxHeight: '300px',
                }}
              >
                {selectedSnippet.response_snippet}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
