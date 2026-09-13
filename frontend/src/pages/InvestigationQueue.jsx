import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { getQueue, getStates } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import StageBadge from '../components/StageBadge';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

const ROW_ACCENT = {
  CRITICAL: 'var(--risk-high)',
  HIGH: '#c45a20',
  MODERATE: 'var(--risk-review)',
  LOW: 'var(--risk-low)',
  HIGH_PRIORITY_REVIEW: 'var(--risk-high)',
  REVIEW_RECOMMENDED: 'var(--risk-review)',
};

const RISK_PILLS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'CRITICAL', label: 'Critical', tone: 'high' },
  { value: 'HIGH', label: 'High Risk', tone: 'high' },
  { value: 'MODERATE', label: 'Moderate', tone: 'review' },
  { value: 'LOW', label: 'Low Risk', tone: 'low' },
];

export default function InvestigationQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    risk_level: searchParams.get('risk_level') || searchParams.get('priority') || '',
    stage: searchParams.get('stage') || '',
    state: searchParams.get('state') || '',
    mp: searchParams.get('mp') || '',
    search: searchParams.get('search') || '',
    sort_by: searchParams.get('sort_by') || 'risk_score',
    sort_order: searchParams.get('sort_order') || 'desc',
    page: parseInt(searchParams.get('page')) || 1,
    page_size: 50,
  });

  const [states, setStates] = useState([]);

  useEffect(() => {
    getStates().then(d => {
      setStates(d.states || []);
    }).catch(() => {});
  }, []);

  const fetchQueue = useCallback(() => {
    setLoading(true);
    const params = { ...filters };
    Object.keys(params).forEach(k => {
      if (!params[k] || params[k] === '') delete params[k];
    });
    getQueue(params).then(setData).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' && { page: 1 }) }));
  };

  const totalRecords = data?.total || 0;
  const startRecord = totalRecords > 0 ? ((filters.page - 1) * filters.page_size) + 1 : 0;
  const endRecord = Math.min(filters.page * filters.page_size, totalRecords);

  return (
    <div>
      <div className="page-header">
        <h2>Investigation Priority Queue</h2>
        <p className="subtitle">
          {totalRecords.toLocaleString('en-IN')} works ranked by contextual risk score
        </p>
      </div>

      {/* Risk level pills */}
      <div className="toolbar-pills" style={{ marginBottom: 12 }}>
        {RISK_PILLS.map((p) => (
          <button
            key={p.value || 'all'}
            className={`pill-btn ${filters.risk_level === p.value ? 'active' : ''}`}
            data-tone={p.tone}
            onClick={() => updateFilter('risk_level', p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Stage</span>
          <select className="toolbar-select" value={filters.stage} onChange={(e) => updateFilter('stage', e.target.value)}>
            <option value="">All Stages</option>
            <option value="RECOMMENDED">Recommended</option>
            <option value="SANCTIONED">Sanctioned</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">State</span>
          <select className="toolbar-select" value={filters.state} onChange={(e) => updateFilter('state', e.target.value)}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">Sort By</span>
          <select className="toolbar-select" value={filters.sort_by} onChange={(e) => updateFilter('sort_by', e.target.value)}>
            <option value="risk_score">Risk Score</option>
            <option value="cost_anomaly_score">Cost Anomaly</option>
            <option value="evidence_count">Evidence Count</option>
            <option value="amount_numeric">Amount</option>
          </select>
        </div>

        <div className="toolbar-group" style={{ flex: 1 }}>
          <span className="toolbar-label">Search</span>
          <div className="toolbar-search">
            <Search size={14} />
            <input
              type="text"
              className="toolbar-input"
              placeholder="MP name, description, Work ID..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchQueue()}
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {!loading && data && (
        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>
            Showing {startRecord.toLocaleString('en-IN')} – {endRecord.toLocaleString('en-IN')} of {totalRecords.toLocaleString('en-IN')} works
          </span>
          <span>
            Page {data.page} of {data.total_pages}
          </span>
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <LoadingState variant="table" />
      ) : !data || data.records.length === 0 ? (
        <EmptyState message="No records match the current filters" hint="Try widening your filters or clearing the search term." />
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Risk Level</th>
                <th style={{ width: 70 }}>Score</th>
                <th style={{ width: 110 }}>Work ID</th>
                <th>Work Description</th>
                <th style={{ width: 130 }}>State</th>
                <th style={{ width: 150 }}>MP</th>
                <th style={{ width: 120 }}>Constituency</th>
                <th style={{ width: 90 }}>Amount</th>
                <th style={{ width: 100 }}>Stage</th>
                <th style={{ width: 60 }}>Signals</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((record) => {
                const riskLevel = record.risk_level || record.priority || 'LOW';
                const riskScore = record.risk_score != null ? record.risk_score : (record.priority_score || 0);
                const scoreDisplay = riskScore > 1 ? riskScore.toFixed(0) : (riskScore * 100).toFixed(0);
                return (
                  <tr
                    key={record.record_id}
                    className="clickable row-accent"
                    style={{ '--row-accent-color': ROW_ACCENT[riskLevel] || 'transparent' }}
                    onClick={() => navigate(`/record/${record.record_id}`)}
                  >
                    <td>
                      <RiskBadge priority={riskLevel} />
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                      {scoreDisplay}
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 500 }}>
                      {record.record_id}
                    </td>
                    <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {record.description || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>No description</span>}
                    </td>
                    <td>{record.state}</td>
                    <td style={{ fontSize: 12 }}>{record.mp_name}</td>
                    <td style={{ fontSize: 12 }}>{record.constituency}</td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>
                      {record.amount_numeric != null ? `₹${(record.amount_numeric / 100000).toFixed(1)}L` : '-'}
                    </td>
                    <td>
                      <StageBadge stage={record.stage} />
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: record.evidence_count > 2 ? 'var(--risk-high)' : 'var(--text-muted)' }}>
                      {record.evidence_count || record.active_signal_count || 0}
                    </td>
                    <td>
                      <ExternalLink size={14} style={{ color: 'var(--text-faint)' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="pagination">
          <button
            disabled={filters.page <= 1}
            onClick={() => updateFilter('page', filters.page - 1)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="page-info">
            Page {data.page} of {data.total_pages}
          </span>
          <button
            disabled={filters.page >= data.total_pages}
            onClick={() => updateFilter('page', filters.page + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
