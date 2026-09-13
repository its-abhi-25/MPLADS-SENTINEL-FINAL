import React from 'react';
import { FileSearch } from 'lucide-react';

export default function EmptyState({ message = 'No data available', hint = '' }) {
  return (
    <div className="empty-state">
      <FileSearch size={44} strokeWidth={1.5} />
      <div className="empty-title">{message}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}
