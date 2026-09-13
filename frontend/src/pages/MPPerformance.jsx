import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Users, MapPin, ArrowRight, TrendingUp, AlertTriangle, BarChart3, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { getMps, getConstituencies, getMpPerformance, getConstituencyPerformance, getMpComparison, getConstituencyComparison } from '../services/api';
import MetricCard from '../components/MetricCard';
import RiskBadge from '../components/RiskBadge';
import LoadingState from '../components/LoadingState';
import Donut3D from '../components/charts/Donut3D';
import Bar3D from '../components/charts/Bar3D';
import { paletteColor } from '../components/charts/chartTheme';

const COLORS = {
  HIGH_PRIORITY_REVIEW: '#a6291f',
  REVIEW_RECOMMENDED: '#93630c',
  LOW: '#1c6e46',
};

const STAGE_COLORS = {
  COMPLETED: '#0d766c',
  SANCTIONED: '#93630c',
  RECOMMENDED: '#1c2745',
};

const AXIS_STYLE = { fill: '#737d95', fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif' };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #dfe2ea', borderRadius: 6, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 14px rgba(9,13,26,0.10)' }}>
        <div style={{ fontWeight: 600, marginBottom: 2, color: '#141c33' }}>{label || payload[0].name}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: '#454e64' }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AmountTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const display = val >= 10000000 ? `₹${(val / 10000000).toFixed(2)} Cr` : val >= 100000 ? `₹${(val / 100000).toFixed(1)} L` : `₹${val.toLocaleString('en-IN')}`;
    return (
      <div style={{ background: '#fff', border: '1px solid #dfe2ea', borderRadius: 6, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 14px rgba(9,13,26,0.10)' }}>
        <div style={{ fontWeight: 600, color: '#141c33' }}>{label}</div>
        <div style={{ color: '#454e64' }}>{display}</div>
      </div>
    );
  }
  return null;
};

function SearchSelector({ label, placeholder, items, onSelect, icon: Icon }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  const filtered = query.length >= 1
    ? items.filter(item => item.toLowerCase().includes(query.toLowerCase())).slice(0, 15)
    : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && highlighted >= 0 && filtered[highlighted]) {
      e.preventDefault();
      setQuery(filtered[highlighted]);
      setOpen(false);
      onSelect(filtered[highlighted]);
    }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 260 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500, marginBottom: 6 }}>
        <Icon size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
        {label}
      </label>
      <input
        className="filter-input"
        style={{ width: '100%', boxSizing: 'border-box' }}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => query.length >= 1 && setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, maxHeight: 280, overflowY: 'auto' }}>
          {filtered.map((item, i) => (
            <div
              key={item}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, background: i === highlighted ? 'var(--bg-hover)' : 'transparent', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => { setQuery(item); setOpen(false); onSelect(item); }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StageBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{count.toLocaleString('en-IN')} ({pct.toFixed(1)}%)</span>
      </div>
      <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function ProfileHeader({ data, type }) {
  const name = type === 'mp' ? data.mp_name : data.constituency_name;
  const subtitle = type === 'mp'
    ? [data.constituency, data.state].filter(Boolean).join(' \u2022 ')
    : [data.state, data.mps?.length ? `${data.mps.length} MP(s)` : ''].filter(Boolean).join(' \u2022 ');
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', background: 'var(--shell-900)', color: 'var(--seal-gold-bright)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)',
            fontWeight: 600, fontSize: 16, flexShrink: 0, border: '1.5px solid var(--seal-gold)'
          }}>{initials}</div>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 600, color: 'var(--shell-800)', margin: 0, fontFamily: 'var(--font-display)' }}>{name}</h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => window.location.href = `/queue?mp=${encodeURIComponent(data.mp_name || '')}`}>
            <AlertTriangle size={14} /> Priority Works
          </button>
          <button className="btn btn-outline" onClick={() => window.location.href = '/map'}>
            <MapPin size={14} /> Investigation Map
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ data, entityLabel }) {
  if (!data || data.length === 0) return null;
  const metrics = [
    { label: 'Total Works', key: 'total_works' },
    { label: 'Completed', key: 'completed_works' },
    { label: 'Completion Rate', key: 'completion_rate', suffix: '%' },
    { label: 'Recorded Amount', key: 'total_recorded_amount', currency: true },
    { label: 'Avg Work Amount', key: 'average_work_amount', currency: true },
    { label: 'High Priority', key: 'high_priority_count' },
    { label: 'Review Recommended', key: 'review_recommended_count' },
    { label: 'Low Risk', key: 'low_risk_count' },
    { label: 'Risk Rate', key: 'risk_rate', suffix: '%' },
  ];
  return (
    <div className="card" style={{ marginTop: 16, overflowX: 'auto' }}>
      <div className="card-header"><h3>Comparing {data.length} {entityLabel}s</h3></div>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ minWidth: 140 }}>Metric</th>
            {data.map(d => (
              <th key={d.name} style={{ minWidth: 140, textAlign: 'right' }}>{d.name || d.mp_name || d.constituency_name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => (
            <tr key={m.key}>
              <td style={{ fontWeight: 500 }}>{m.label}</td>
              {data.map(d => {
                const val = d[m.key];
                let display = val != null ? val : 'N/A';
                if (m.currency && typeof val === 'number') {
                  display = val >= 10000000 ? `₹${(val / 10000000).toFixed(2)} Cr` : val >= 100000 ? `₹${(val / 100000).toFixed(1)} L` : `₹${val.toLocaleString('en-IN')}`;
                } else if (m.suffix && typeof val === 'number') {
                  display = `${val}${m.suffix}`;
                } else if (typeof val === 'number') {
                  display = val.toLocaleString('en-IN');
                }
                return <td key={d.name} style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MPPerformance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mpList, setMpList] = useState([]);
  const [constituencyList, setConstituencyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [profileType, setProfileType] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  const [compareMode, setCompareMode] = useState(false);
  const [compareType, setCompareType] = useState('mp');
  const [compareSelections, setCompareSelections] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    Promise.all([getMps(), getConstituencies()]).then(([mps, cons]) => {
      setMpList(mps.mps || []);
      setConstituencyList((cons.constituencies || []).map(c => c.Constituency));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const mp = searchParams.get('mp');
    const cons = searchParams.get('constituency');
    if (mp && !profileData) {
      loadProfile('mp', mp);
    } else if (cons && !profileData) {
      loadProfile('constituency', cons);
    }
  }, [searchParams]);

  const loadProfile = useCallback((type, name) => {
    setProfileLoading(true);
    setError(null);
    setProfileType(type);
    setCompareMode(false);
    setCompareData(null);
    const fn = type === 'mp' ? getMpPerformance : getConstituencyPerformance;
    fn(name).then(data => {
      if (data.error) { setError(data.error); setProfileData(null); }
      else { setProfileData(data); }
      setProfileLoading(false);
    }).catch(err => { setError(err.message); setProfileLoading(false); });
  }, []);

  const loadComparison = useCallback(() => {
    if (compareSelections.length < 2) return;
    setCompareLoading(true);
    const fn = compareType === 'mp' ? getMpComparison : getConstituencyComparison;
    fn(compareSelections).then(data => {
      setCompareData(data);
      setCompareLoading(false);
    }).catch(err => { setError(err.message); setCompareLoading(false); });
  }, [compareType, compareSelections]);

  if (loading) return <LoadingState message="Loading MP / Constituency data..." />;

  const trendData = profileData?.trend?.map(t => ({ name: t.period, works: t.works, amount: t.amount })) || [];
  const stageData = profileData?.stage_distribution ? Object.entries(profileData.stage_distribution).map(([k, v]) => ({ name: k, value: v })) : [];
  const catData = profileData?.category_distribution ? Object.entries(profileData.category_distribution).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ name: k, count: v, amount: profileData.category_amounts?.[k] || 0 })) : [];
  const priorityData = profileData?.priority_distribution ? Object.entries(profileData.priority_distribution).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v, key: k, color: COLORS[k] || '#667085' })) : [];

  return (
    <div>
      <div className="page-header">
        <h2>Browse MP / Constituency</h2>
        <p className="subtitle">Monitor constituency development progress, recorded work value and implementation risk</p>
      </div>

      {/* Section 1: Browse & Search */}
      <div className="card mpp-section" style={{ marginBottom: 16 }}>
        <div className="mpp-section-header">
          <div className="mpp-section-icon"><Search size={15} /></div>
          <div className="mpp-section-heading">
            <h3>Browse &amp; Search</h3>
            <p>Look up a single MP or constituency to view its performance profile</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SearchSelector
            label="Search MP"
            placeholder="Type MP name..."
            items={mpList}
            icon={Users}
            onSelect={(name) => { loadProfile('mp', name); setSearchParams({ mp: name }); }}
          />
          <SearchSelector
            label="Search Constituency"
            placeholder="Type constituency name..."
            items={constituencyList}
            icon={MapPin}
            onSelect={(name) => { loadProfile('constituency', name); setSearchParams({ constituency: name }); }}
          />
        </div>
      </div>

      {/* Section 2: Compare */}
      <div className="card mpp-section" style={{ marginBottom: 16 }}>
        <div className="mpp-section-header">
          <div className="mpp-section-icon mpp-section-icon-compare"><BarChart3 size={15} /></div>
          <div className="mpp-section-heading" style={{ flex: 1 }}>
            <h3>Compare MP / Constituency</h3>
            <p>Select two or more MPs or constituencies to compare side by side</p>
          </div>
          <button
            className={`btn ${compareMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setCompareMode(!compareMode); setCompareData(null); setCompareSelections([]); setProfileData(null); setError(null); setSearchParams({}); }}
          >
            {compareMode ? 'Exit Compare' : 'Start Comparing'}
          </button>
        </div>

        {compareMode && (
          <div className="mpp-section-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <button className={`btn ${compareType === 'mp' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setCompareType('mp'); setCompareSelections([]); setCompareData(null); }}>MPs</button>
              <button className={`btn ${compareType === 'constituency' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setCompareType('constituency'); setCompareSelections([]); setCompareData(null); }}>Constituencies</button>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <SearchSelector
                label={`Add ${compareType === 'mp' ? 'MP' : 'Constituency'}`}
                placeholder={`Type ${compareType} name...`}
                items={compareType === 'mp' ? mpList : constituencyList}
                icon={compareType === 'mp' ? Users : MapPin}
                onSelect={(name) => { if (!compareSelections.includes(name) && compareSelections.length < 4) { const next = [...compareSelections, name]; setCompareSelections(next); } }}
              />
              {compareSelections.length > 0 && (
                <div style={{ paddingBottom: 2 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Selected:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {compareSelections.map(s => (
                      <span key={s} className="chip">
                        {s}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCompareSelections(prev => prev.filter(x => x !== s))} />
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn btn-primary" disabled={compareSelections.length < 2 || compareLoading} onClick={loadComparison}>
                {compareLoading ? 'Comparing...' : 'Run Comparison'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {compareData && <ComparisonTable data={compareData.comparison} entityLabel={compareType} />}

      {/* Error */}
      {error && <div className="card" style={{ borderLeft: '3px solid var(--risk-high)', marginBottom: 16, color: 'var(--risk-high)', fontSize: 13 }}>{error}</div>}

      {/* Profile Loading */}
      {profileLoading && <LoadingState message="Loading profile..." />}

      {/* Profile Content */}
      {profileData && !profileLoading && !compareMode && (
        <>
          <ProfileHeader data={profileData} type={profileType} />

          {/* KPI Cards */}
          <div className="metrics-grid">
            <MetricCard label="Total Works" value={profileData.total_works} subtitle={`${profileData.total_works} records`} />
            <MetricCard label="Completed" value={profileData.completed_works} variant="success" subtitle={`${profileData.completion_rate}% completion rate`} />
            <MetricCard label="Sanctioned" value={profileData.sanctioned_works} variant="warning" subtitle={`${profileData.stage_distribution?.SANCTIONED || 0} in progress`} />
            <MetricCard label="Recommended" value={profileData.recommended_works} variant="info" subtitle={`${profileData.stage_distribution?.RECOMMENDED || 0} pending`} />
            <MetricCard label="Recorded Work Value" value={`₹${(profileData.total_recorded_amount / 10000000).toFixed(2)} Cr`} subtitle={`Avg ₹${(profileData.average_work_amount / 100000).toFixed(1)} L per work`} />
            <MetricCard label="Completed Value" value={`₹${(profileData.completed_amount / 10000000).toFixed(2)} Cr`} variant="success" subtitle={`${(profileData.completed_amount / profileData.total_recorded_amount * 100).toFixed(1)}% of total`} />
            <MetricCard label="High Priority Review" value={profileData.high_priority_count} variant="danger" subtitle={`${(profileData.high_priority_count / profileData.total_works * 100).toFixed(1)}% of works`} />
            <MetricCard label="Review Recommended" value={profileData.review_recommended_count} variant="warning" subtitle={`Risk rate: ${profileData.risk_rate}%`} />
          </div>

          {/* Fund / Amount by Stage */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3>Recorded Work Value by Implementation Stage</h3></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Dataset amounts by stage. Not true fund utilisation — the source data records project values, not released/spent funds.
            </div>
            {Object.entries(profileData.stage_amounts || {}).map(([stage, amount]) => (
              <StageBar
                key={stage}
                label={stage}
                count={Math.round(amount)}
                total={profileData.total_recorded_amount}
                color={STAGE_COLORS[stage] || '#667085'}
              />
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
              {Object.entries(profileData.stage_amounts || {}).map(([stage, amount]) => (
                <div key={stage} style={{ textAlign: 'center', padding: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{stage}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: STAGE_COLORS[stage] || 'var(--text-primary)' }}>
                    {amount >= 10000000 ? `₹${(amount / 10000000).toFixed(2)} Cr` : `₹${(amount / 100000).toFixed(1)} L`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row: Risk + Category */}
          <div className="charts-grid">
            {/* Risk Distribution — interactive 3D donut */}
            <div className="card">
              <div className="card-header"><h3>Risk Distribution</h3></div>
              <Donut3D data={priorityData} centerLabel="Works" size={200} />
            </div>

            {/* Category Distribution — dimensional animated bars */}
            <div className="card">
              <div className="card-header"><h3>Works by Category</h3></div>
              <Bar3D
                data={catData.map((c, i) => ({ key: c.name, name: c.name, value: c.count, color: paletteColor(i) }))}
                labelWidth={140}
              />
            </div>
          </div>

          {/* Trend */}
          {trendData.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header"><h3>Implementation Trend</h3></div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="trendWorksGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3a4c8c" />
                      <stop offset="100%" stopColor="#1c2745" />
                    </linearGradient>
                    <linearGradient id="trendAmountGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#12a394" />
                      <stop offset="100%" stopColor="#0d766c" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ee" />
                  <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: '#e2e5ee' }} />
                  <YAxis yAxisId="left" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 10000000 ? `${(v / 10000000).toFixed(0)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20, 28, 51, 0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="works" name="Works" fill="url(#trendWorksGradient)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                  <Bar yAxisId="right" dataKey="amount" name="Amount (₹)" fill="url(#trendAmountGradient)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" animationBegin={150} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Signal Summary */}
          {Object.keys(profileData.signal_summary || {}).length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header"><h3>Analytical Signals</h3></div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Risk indicators are analytical prioritisation signals and do not constitute proof of wrongdoing.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {Object.entries(profileData.signal_summary).map(([signal, data]) => (
                  <div key={signal} style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'capitalize', color: 'var(--navy)' }}>{signal.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Active: <span style={{ fontWeight: 600 }}>{data.active_count}</span>
                    </div>
                    {data.high_count > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--risk-high)' }}>
                        High: <span style={{ fontWeight: 600 }}>{data.high_count}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Flagged Works */}
          {profileData.top_flagged_works?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <h3>Top Flagged Works</h3>
                <button className="btn btn-ghost" onClick={() => navigate(`/queue?mp=${encodeURIComponent(profileData.mp_name || profileData.constituency_name || '')}`)}>
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Work ID</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Stage</th>
                      <th>Priority</th>
                      <th>Signals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData.top_flagged_works.map((w) => (
                      <tr key={w.record_id} className="clickable" onClick={() => navigate(`/record/${w.record_id}`)}>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 500 }}>{w.record_id}</td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.description}</td>
                        <td style={{ fontWeight: 600 }}>
                          {w.amount != null ? (w.amount >= 10000000 ? `₹${(w.amount / 10000000).toFixed(2)} Cr` : `₹${(w.amount / 100000).toFixed(1)} L`) : 'N/A'}
                        </td>
                        <td><span className={`stage-badge ${w.stage}`}>{w.stage}</span></td>
                        <td><RiskBadge priority={w.priority} size="sm" /></td>
                        <td style={{ color: w.evidence_count > 2 ? 'var(--risk-high)' : 'var(--text-muted)', fontWeight: w.evidence_count > 2 ? 600 : 400 }}>{w.evidence_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Landing State */}
      {!profileData && !profileLoading && !compareMode && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <BarChart3 size={48} style={{ color: 'var(--text-faint)', marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Select an MP or constituency to view performance intelligence
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Use the search fields above to find an MP by name or a constituency by name.
          </div>
        </div>
      )}
    </div>
  );
}
