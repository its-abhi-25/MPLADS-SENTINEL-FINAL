import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertTriangle, XCircle, FileStack, Users, MapPinned } from 'lucide-react';
import { getDataHealth } from '../services/api';
import LoadingState from '../components/LoadingState';
import MetricCard from '../components/MetricCard';

export default function DataHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDataHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading data health report..." />;
  if (!health) return <LoadingState message="No data health available" />;

  const completenessPct = health.total_records > 0
    ? ((health.valid_records / health.total_records) * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Data Quality Report</h2>
        <p className="subtitle">Technical transparency and data quality assessment</p>
      </div>

      {/* Overview Stats */}
      <div className="metrics-grid">
        <MetricCard index={0} label="Source File" value={health.source_file} variant="info" icon={FileStack} />
        <MetricCard index={1} label="Total Records" value={health.total_records} variant="info" icon={Database} />
        <MetricCard index={2} label="Valid Records" value={health.valid_records} variant="success" icon={CheckCircle} />
        <MetricCard
          index={3}
          label="Data Completeness"
          value={`${completenessPct}%`}
          variant={completenessPct > 90 ? 'success' : completenessPct > 70 ? 'warning' : 'danger'}
        />
        <MetricCard index={4} label="States Covered" value={health.state_count} icon={MapPinned} />
        <MetricCard index={5} label="MPs in Dataset" value={health.mp_count} icon={Users} />
      </div>

      <div className="health-grid">
        {/* Data Quality Overview */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={16} />
              Data Quality Overview
            </h3>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Records</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{health.total_records?.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--success)' }}>Valid Records</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{health.valid_records?.toLocaleString('en-IN')}</span>
            </div>
            <div className="health-bar">
              <div className="fill good" style={{ width: `${(health.valid_records / health.total_records) * 100}%` }}></div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--warning)' }}>Incomplete Records</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{health.incomplete_records}</span>
            </div>
            <div className="health-bar">
              <div className="fill warning" style={{ width: `${(health.incomplete_records / health.total_records) * 100}%` }}></div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--danger)' }}>Duplicate Candidates</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{health.duplicate_candidates}</span>
            </div>
            <div className="health-bar">
              <div className="fill bad" style={{ width: `${(health.duplicate_candidates / health.total_records) * 100}%` }}></div>
            </div>
          </div>

          {health.near_duplicate_candidates > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--warning)' }}>Near-Duplicate Candidates</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{health.near_duplicate_candidates?.toLocaleString('en-IN')}</span>
              </div>
              <div className="health-bar">
                <div className="fill warning" style={{ width: `${(health.near_duplicate_candidates / health.total_records) * 100}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Column Missingness */}
        <div className="card">
          <div className="card-header">
            <h3>Column Completeness</h3>
          </div>
          {health.columns?.map((col) => {
            const pct = health.missingness?.[col] || 0;
            return (
              <div key={col} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{col}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: pct > 10 ? 'var(--danger)' : pct > 0 ? 'var(--warning)' : 'var(--success)' }}>
                    {pct === 0 ? 'Complete' : `${pct}% missing`}
                  </span>
                </div>
                <div className="health-bar">
                  <div
                    className={`fill ${pct > 10 ? 'bad' : pct > 0 ? 'warning' : 'good'}`}
                    style={{ width: `${Math.max(100 - pct, 1)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Signals Status */}
        <div className="card">
          <div className="card-header">
            <h3>Analytical Signals</h3>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} />
              Active Signals
            </div>
            {health.signals_enabled?.map((signal) => (
              <div key={signal} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', paddingLeft: 20 }}>
                {signal.replace(/_/g, ' ')}
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={14} />
              Unavailable Signals
            </div>
            {health.signals_unavailable?.map((signal) => (
              <div key={signal} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0', paddingLeft: 20 }}>
                {signal.replace(/_/g, ' ')} — Required field not present in dataset
              </div>
            ))}
          </div>
        </div>

        {/* Stage Distribution */}
        <div className="card">
          <div className="card-header">
            <h3>Stage Distribution</h3>
          </div>
          {Object.entries(health.stage_distribution || {}).map(([stage, count]) => (
            <div key={stage} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stage}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{count.toLocaleString('en-IN')}</span>
              </div>
              <div className="health-bar">
                <div
                  className={`fill ${stage === 'COMPLETED' ? 'good' : stage === 'SANCTIONED' ? 'warning' : ''}`}
                  style={{ width: `${(count / health.total_records) * 100}%`, background: stage === 'RECOMMENDED' ? 'var(--info)' : undefined }}
                ></div>
              </div>
            </div>
          ))}

          {/* Category Inference */}
          {health.category_inference && (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
                Category Inference
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Total: {health.category_inference.total?.toLocaleString('en-IN')} | Inferred: {health.category_inference.inferred?.toLocaleString('en-IN')}
              </div>
              {Object.entries(health.category_inference.categories || {}).slice(0, 5).map(([cat, count]) => (
                <div key={cat} style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 12, padding: '2px 0 2px 12px' }}>
                  {cat}: {count}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
