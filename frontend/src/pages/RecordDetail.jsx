import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Link2, FileText, ChevronRight, CheckCircle, Shield, RefreshCw } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { getRecordDetail, recalculateRisk } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import StageBadge from '../components/StageBadge';
import LoadingState from '../components/LoadingState';
import useCountUp from '../hooks/useCountUp';

const RISK_COLOR = {
  CRITICAL: 'var(--risk-high)',
  HIGH: '#c45a20',
  MODERATE: 'var(--risk-review)',
  LOW: 'var(--risk-low)',
};

const SIGNAL_AXIS_MAP = {
  COST_ANOMALY: 'Cost Anomaly',
  DESCRIPTION_SIMILARITY: 'Description',
  MP_CONCENTRATION: 'MP Concentration',
  CONSTITUENCY_PATTERN: 'Constituency Pattern',
  TEMPORAL_ANOMALY: 'Temporal',
  STAGE_CONSISTENCY: 'Stage',
  CROSS_SIGNAL_PATTERN: 'Pattern',
};

const AXIS_ORDER = ['Cost Anomaly', 'Description', 'MP Concentration', 'Constituency Pattern', 'Temporal', 'Stage', 'Pattern'];

const STRENGTH_VALUE = { HIGH: 100, MEDIUM: 60, LOW: 30 };

function buildSignalFingerprint(evidenceItems) {
  const magnitudes = Object.fromEntries(AXIS_ORDER.map((a) => [a, 0]));
  (evidenceItems || []).forEach((item) => {
    const axis = SIGNAL_AXIS_MAP[item.signal_type];
    if (!axis) return;
    const v = STRENGTH_VALUE[item.signal_strength] || 20;
    if (v > magnitudes[axis]) magnitudes[axis] = v;
  });
  return AXIS_ORDER.map((axis) => ({ axis, value: magnitudes[axis] }));
}

function ScoreRing({ score, color, size = 116 }) {
  const clamped = Math.max(0, Math.min(1, score || 0));
  const animated = useCountUp(clamped, { duration: 1000, decimals: 4 });
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated);

  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function ConfidenceBar({ score, size = 'md' }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 80 ? 'var(--risk-low)' : pct >= 60 ? 'var(--risk-review)' : 'var(--risk-high)';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence</span>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function RecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('evidence');
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    getRecordDetail(recordId).then(setDetail).finally(() => setLoading(false));
  }, [recordId]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const result = await recalculateRisk(recordId);
      const updated = await getRecordDetail(recordId);
      setDetail(updated);
    } catch (e) {
      console.error('Recalculation failed:', e);
    }
    setRecalculating(false);
  };

  if (loading) return <LoadingState message="Loading case file..." />;
  if (!detail) return <LoadingState message="Record not found" />;

  const { source_record, normalized_record, context, risk_assessment, evidence_items, evidence_chain, related_records, investigation_recommendation, risk_history } = detail;

  // Support both new (risk_assessment) and legacy (priority) formats
  const riskScore = risk_assessment?.risk_score ?? (detail.priority?.risk_score * 100) ?? 0;
  const riskLevel = risk_assessment?.risk_level ?? detail.priority?.risk_level ?? detail.priority?.priority ?? 'LOW';
  const confidenceScore = risk_assessment?.confidence_percent ?? (risk_assessment?.confidence != null ? risk_assessment.confidence * 100 : (detail.priority?.confidence_score != null ? detail.priority.confidence_score * 100 : 0));
  const confidenceLevel = risk_assessment?.confidence_level ?? detail.priority?.confidence ?? 'LOW';
  const activeSignalCount = risk_assessment?.active_signal_count ?? detail.priority?.evidence_count ?? 0;
  const scoreColor = RISK_COLOR[riskLevel] || 'var(--risk-low)';

  // Derived features (backward compat)
  const derived = detail.derived_features || {};

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ padding: '6px 10px' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, color: 'var(--shell-800)', fontFamily: 'var(--font-display)' }}>Case Review</h2>
          <p className="subtitle">Work ID: {recordId}</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={handleRecalculate}
          disabled={recalculating}
          style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={recalculating ? 'spinning' : ''} />
          Recalculate
        </button>
      </div>

      <div className="case-layout">
        {/* Main column */}
        <div>
          {/* Risk Assessment Banner */}
          {riskLevel !== 'LOW' && (
            <div className="card" style={{
              marginBottom: 16,
              borderLeft: `4px solid ${scoreColor}`,
              background: riskLevel === 'CRITICAL' ? 'var(--risk-high-bg)' : 'var(--risk-review-bg)'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--shell-800)' }}>
                <AlertTriangle size={16} style={{ color: scoreColor }} />
                Risk Assessment: {riskScore.toFixed(0)}/100 — {riskLevel}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                This project is {riskLevel === 'CRITICAL' ? 'significantly' : riskLevel === 'HIGH' ? 'notably' : 'somewhat'} more anomalous than comparable projects in its contextual peer group.
              </p>
              {evidence_items && evidence_items.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <strong>Main contributing indicators:</strong>
                  <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
                    {evidence_items.slice(0, 3).map((item, i) => (
                      <li key={i}>{item.signal_label || item.signal_type.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Investigation Recommendation */}
          {investigation_recommendation && (
            <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--gov-blue)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--shell-800)' }}>Recommended Investigation Actions</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {investigation_recommendation}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>
              Analytical Findings
            </button>
            <button className={`tab ${activeTab === 'chain' ? 'active' : ''}`} onClick={() => setActiveTab('chain')}>
              Evidence Chain
            </button>
            <button className={`tab ${activeTab === 'source' ? 'active' : ''}`} onClick={() => setActiveTab('source')}>
              Project Data
            </button>
            <button className={`tab ${activeTab === 'related' ? 'active' : ''}`} onClick={() => setActiveTab('related')}>
              Similar Projects ({related_records.length})
            </button>
          </div>

          {/* Evidence Tab */}
          {activeTab === 'evidence' && (
            <div>
              {/* Signal Fingerprint */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--shell-800)' }}>
                  Signal Fingerprint
                </h3>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Relative strength of each analytical detector for this work
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={buildSignalFingerprint(evidence_items)} outerRadius="72%">
                    <PolarGrid stroke="var(--chart-grid)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="value"
                      stroke={scoreColor}
                      fill={scoreColor}
                      fillOpacity={0.22}
                      strokeWidth={2}
                      isAnimationActive={true}
                      animationDuration={700}
                    />
                    <Tooltip
                      formatter={(v) => [`${v}%`, 'Signal strength']}
                      contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--border-light)', fontFamily: 'IBM Plex Sans, sans-serif' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Project Identification */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--shell-800)' }}>
                  Project Identification
                </h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="label">State</div>
                    <div className="value">{source_record.state}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Member of Parliament</div>
                    <div className="value">{source_record.mp}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Constituency</div>
                    <div className="value">{source_record.constituency}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Amount</div>
                    <div className="value" style={{ fontWeight: 600 }}>₹{source_record.amount}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Stage</div>
                    <div className="value"><StageBadge stage={source_record.stage} /></div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Category</div>
                    <div className="value">{normalized_record.inferred_category}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div className="detail-item">
                    <div className="label">Work Description</div>
                    <div className="value" style={{ lineHeight: 1.6 }}>{source_record.description}</div>
                  </div>
                </div>
              </div>

              {/* Context */}
              {context && context.peer_group_size > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--shell-800)' }}>
                    Contextual Peer Comparison
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Peer group: {context.peer_group_level_name || `Level ${context.peer_group_level}`}
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="label">Peer Group Size</div>
                      <div className="value">{context.peer_group_size} comparable works</div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Peer Median Amount</div>
                      <div className="value">₹{(context.peer_median / 100000)?.toFixed(1)} L</div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Percentile Ranking</div>
                      <div className="value">{context.peer_percentile?.toFixed(1)}%</div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Deviation from Median</div>
                      <div className="value" style={{ color: context.deviation_ratio > 2 ? 'var(--risk-high)' : 'inherit', fontWeight: context.deviation_ratio > 2 ? 600 : 400 }}>
                        {context.deviation_ratio?.toFixed(2)}x
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Signal Breakdown */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--shell-800)' }}>
                  Analytical Findings ({evidence_items.length} signals)
                </h3>
                {evidence_items.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
                    <CheckCircle size={16} />
                    <span style={{ fontSize: 13 }}>No anomalous patterns detected for this project.</span>
                  </div>
                ) : (
                  evidence_items.map((item, i) => (
                    <div key={i} className={`evidence-item ${item.signal_strength}`}>
                      <div className="signal-type">{item.signal_label || item.signal_type.replace(/_/g, ' ')}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span className={`confidence-badge ${item.signal_strength === 'HIGH' ? 'HIGH' : item.signal_strength === 'MEDIUM' ? 'MEDIUM' : 'LOW'}`}>
                            {item.signal_strength}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Score: {(item.signal_score * 100).toFixed(0)}%
                          </span>
                          {item.peer_group_size > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                              vs {item.peer_group_size} peers
                            </span>
                          )}
                        </div>
                        <div className="explanation">{item.explanation}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Evidence Chain Tab */}
          {activeTab === 'chain' && (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--shell-800)' }}>
                <FileText size={16} />
                Evidence Chain — Full Traceability
              </h3>
              {evidence_chain.map((step, i) => (
                <div key={i} className="chain-step">
                  <div className="step-number">{i + 1}</div>
                  <div className="step-content" style={{ flex: 1 }}>
                    <h4>{step.step}</h4>
                    <p>{step.description}</p>
                    {step.step === 'RISK ASSESSMENT' && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risk Score: </span>
                          <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: scoreColor }}>{step.details.risk_score}/100</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Level: </span>
                          <RiskBadge priority={step.details.risk_level} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence: </span>
                          <span>{typeof step.details.confidence === 'number' ? (step.details.confidence <= 1 ? (step.details.confidence * 100).toFixed(0) : step.details.confidence.toFixed(0)) : step.details.confidence}%</span>
                        </div>
                      </div>
                    )}
                    {step.step === 'SIGNAL DETECTION' && step.details.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {step.details.map((sig, j) => (
                          <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                            <span style={{ color: sig.signal_strength === 'HIGH' ? 'var(--risk-high)' : sig.signal_strength === 'MEDIUM' ? 'var(--risk-review)' : 'var(--text-muted)' }}>
                              {sig.signal_label || sig.signal_type}
                            </span>
                            {' '}- {sig.explanation}
                          </div>
                        ))}
                      </div>
                    )}
                    {step.step === 'SOURCE RECORD' && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div>MP: {step.details.mp}</div>
                        <div>Constituency: {step.details.constituency}</div>
                        <div>State: {step.details.state}</div>
                        <div>Amount: ₹{step.details.amount}</div>
                        <div>Stage: {step.details.stage}</div>
                      </div>
                    )}
                    {step.step === 'CONTEXT ENGINE' && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div>Peer Group Size: {step.details.peer_group_size} records</div>
                        <div>Peer Median: ₹{(step.details.peer_median / 100000)?.toFixed(1)} L</div>
                        <div>Deviation Ratio: {step.details.deviation_ratio?.toFixed(2)}x</div>
                      </div>
                    )}
                    {step.step === 'NORMALIZED DATA' && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div>Amount Numeric: {step.details.amount_numeric}</div>
                        <div>Inferred Category: {step.details.inferred_category}</div>
                        <div>Amount Tier: {step.details.amount_tier}</div>
                      </div>
                    )}
                  </div>
                  {i < evidence_chain.length - 1 && (
                    <ChevronRight size={16} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 8 }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Source Data Tab */}
          {activeTab === 'source' && (
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--shell-800)' }}>Original Record</h3>
                <div className="detail-grid">
                  {Object.entries(source_record).map(([key, value]) => (
                    <div className="detail-item" key={key}>
                      <div className="label">{key.replace(/_/g, ' ')}</div>
                      <div className="value">{value || <span style={{ color: 'var(--text-faint)' }}>Empty</span>}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--shell-800)' }}>Normalized Values</h3>
                <div className="detail-grid">
                  {Object.entries(normalized_record).map(([key, value]) => (
                    <div className="detail-item" key={key}>
                      <div className="label">{key.replace(/_/g, ' ')}</div>
                      <div className="value">{value !== null && value !== '' ? String(value) : <span style={{ color: 'var(--text-faint)' }}>N/A</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Related Records Tab */}
          {activeTab === 'related' && (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--shell-800)' }}>
                <Link2 size={16} />
                Similar Projects ({related_records.length})
              </h3>
              {related_records.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>No similar projects found.</p>
              ) : (
                related_records.map((rec, i) => (
                  <div
                    key={i}
                    className="related-record"
                    onClick={() => navigate(`/record/${rec.record_id}`)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 500 }}>{rec.record_id}</span>
                        <span className="relationship-tag">{rec.relationship}</span>
                        <RiskBadge priority={rec.risk_level || rec.priority} />
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rec.description}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {rec.mp_name} | {rec.category} | {rec.amount ? `₹${rec.amount}` : '-'} | <StageBadge stage={rec.stage} />
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-faint)' }} />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Risk History */}
          {risk_history && risk_history.length > 1 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--shell-800)' }}>Risk History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {risk_history.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: entry.risk_score >= 0.6 ? 'var(--risk-high)' : 'var(--text-secondary)' }}>
                      {(entry.risk_score * 100).toFixed(0)}
                    </span>
                    <RiskBadge priority={entry.risk_level} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky case summary rail */}
        <div className="case-rail">
          <div className="case-summary-card">
            <div className="case-id">{source_record.record_id}</div>
            <div className="case-score-hero" style={{ color: scoreColor }}>
              <div className="ring-wrap">
                <ScoreRing score={riskScore / 100} color={scoreColor} />
                <div className="num">{riskScore.toFixed(0)}</div>
              </div>
              <div className="lbl">Risk Score</div>
            </div>
            <div className="case-summary-row">
              <span className="k">Risk Level</span>
              <span className="v"><RiskBadge priority={riskLevel} size="lg" /></span>
            </div>
            <div className="case-summary-row">
              <span className="k">Confidence</span>
              <span className="v" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{confidenceScore.toFixed(0)}%</span>
            </div>
            <div className="case-summary-row">
              <span className="k">Active Signals</span>
              <span className="v">{activeSignalCount}</span>
            </div>
            <div className="case-summary-row">
              <span className="k">Stage</span>
              <span className="v"><StageBadge stage={source_record.stage} /></span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: 'var(--shell-800)' }}>At a Glance</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>State</span>
                <span style={{ fontWeight: 600 }}>{source_record.state}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>MP</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{source_record.mp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>₹{source_record.amount}</span>
              </div>
              {context && context.peer_group_size > 0 && (
                <>
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--shell-800)', marginBottom: 4 }}>Peer Context</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Peer Group</span>
                    <span style={{ fontWeight: 600 }}>{context.peer_group_size}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Peer Median</span>
                    <span style={{ fontWeight: 600 }}>₹{(context.peer_median / 100000)?.toFixed(1)}L</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Deviation</span>
                    <span style={{ fontWeight: 600, color: context.deviation_ratio > 2 ? 'var(--risk-high)' : 'inherit' }}>
                      {context.deviation_ratio?.toFixed(2)}x
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}