import React from 'react';

const LABELS = {
  CRITICAL: 'Critical',
  HIGH: 'High Risk',
  MODERATE: 'Moderate',
  LOW: 'Low Risk',
  HIGH_PRIORITY_REVIEW: 'Critical',
  REVIEW_RECOMMENDED: 'Moderate',
};

export default function RiskBadge({ priority, size = 'sm' }) {
  // Map legacy values to new ones
  const mapped = priority === 'HIGH_PRIORITY_REVIEW' ? 'CRITICAL'
    : priority === 'REVIEW_RECOMMENDED' ? 'MODERATE'
    : priority;

  return (
    <span className={`priority-badge ${mapped || 'LOW'}`} style={size === 'lg' ? { fontSize: 12, padding: '5px 12px' } : {}}>
      {LABELS[mapped] || LABELS[priority] || priority?.replace(/_/g, ' ')}
    </span>
  );
}
