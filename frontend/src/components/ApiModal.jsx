import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function ApiModal({ isOpen, onClose, onSave, editingApi = null }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    headers: '{}',
    request_body: '',
    expected_status_code: 200,
    check_interval: '5m',
    timeout_ms: 5000,
  });

  const [jsonError, setJsonError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingApi) {
      setFormData({
        name: editingApi.name || '',
        url: editingApi.url || '',
        method: editingApi.method || 'GET',
        headers: typeof editingApi.headers === 'string' ? editingApi.headers : JSON.stringify(editingApi.headers || {}, null, 2),
        request_body: typeof editingApi.request_body === 'string' ? editingApi.request_body : JSON.stringify(editingApi.request_body || '', null, 2),
        expected_status_code: editingApi.expected_status_code || 200,
        check_interval: editingApi.check_interval || '5m',
        timeout_ms: editingApi.timeout_ms || 5000,
      });
    } else {
      setFormData({
        name: '',
        url: 'https://',
        method: 'GET',
        headers: '{\n  "Content-Type": "application/json"\n}',
        request_body: '',
        expected_status_code: 200,
        check_interval: '5m',
        timeout_ms: 5000,
      });
    }
    setJsonError(null);
  }, [editingApi, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setJsonError(null);

    // Validate headers JSON if provided
    if (formData.headers && formData.headers.trim() !== '') {
      try {
        JSON.parse(formData.headers);
      } catch (err) {
        setJsonError('Headers must be valid JSON: ' + err.message);
        return;
      }
    }

    try {
      setLoading(true);
      await onSave({
        ...formData,
        expected_status_code: parseInt(formData.expected_status_code, 10),
        timeout_ms: parseInt(formData.timeout_ms, 10),
      });
      onClose();
    } catch (err) {
      setJsonError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {editingApi ? 'Edit Monitored API' : 'Register New API Monitor'}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {jsonError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Service / API Name *</label>
              <input
                type="text"
                name="name"
                required
                className="form-control"
                placeholder="e.g. Payment Gateway Health"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: '0 0 120px' }}>
                <label className="form-label">HTTP Method</label>
                <select
                  name="method"
                  className="form-control"
                  value={formData.method}
                  onChange={handleChange}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Endpoint URL *</label>
                <input
                  type="url"
                  name="url"
                  required
                  className="form-control code"
                  placeholder="https://api.example.com/health"
                  value={formData.url}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Expected Status Code</label>
                <input
                  type="number"
                  name="expected_status_code"
                  className="form-control"
                  placeholder="200"
                  value={formData.expected_status_code}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Check Interval</label>
                <select
                  name="check_interval"
                  className="form-control"
                  value={formData.check_interval}
                  onChange={handleChange}
                >
                  <option value="1m">Every 1 minute (Fast)</option>
                  <option value="5m">Every 5 minutes (Standard)</option>
                  <option value="15m">Every 15 minutes</option>
                  <option value="30m">Every 30 minutes</option>
                  <option value="60m">Every 1 hour</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Request Timeout (milliseconds)</label>
              <input
                type="number"
                name="timeout_ms"
                className="form-control"
                placeholder="5000"
                value={formData.timeout_ms}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Custom HTTP Headers (JSON)</label>
              <textarea
                name="headers"
                rows={3}
                className="form-control code"
                placeholder='{"Authorization": "Bearer token", "X-Custom": "Value"}'
                value={formData.headers}
                onChange={handleChange}
              />
            </div>

            {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
              <div className="form-group">
                <label className="form-label">Request Body Payload (JSON / Text)</label>
                <textarea
                  name="request_body"
                  rows={3}
                  className="form-control code"
                  placeholder='{"ping": true}'
                  value={formData.request_body}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <RefreshCw size={15} className="animate-spin" />}
              <span>{editingApi ? 'Save Changes' : 'Start Monitoring'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
