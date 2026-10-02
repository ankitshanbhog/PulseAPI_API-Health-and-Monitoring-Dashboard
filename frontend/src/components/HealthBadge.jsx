import React from 'react';

export default function HealthBadge({ status, size = 'md' }) {
  const currentStatus = (status || 'UNKNOWN').toUpperCase();
  
  return (
    <span className={`status-badge ${currentStatus}`}>
      <span className="status-pulse" />
      <span>{currentStatus}</span>
    </span>
  );
}
