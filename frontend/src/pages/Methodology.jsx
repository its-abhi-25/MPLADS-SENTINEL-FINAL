import React from 'react';
import { Shield, AlertTriangle, Search, Link2, BarChart3, FileText, ArrowDown } from 'lucide-react';

export default function Methodology() {
  return (
    <div>
      <div className="page-header">
        <h2>Methodology</h2>
        <p className="subtitle">How MPLADS Sentinel identifies and prioritizes works for review</p>
      </div>

      {/* Core Principle */}
      <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--gov-blue)', background: 'var(--gov-blue-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Shield size={24} style={{ color: 'var(--gov-blue)' }} />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>AI Prioritizes. Evidence Explains. Humans Decide.</h3>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          MPLADS Sentinel does NOT automatically determine fraud, corruption, or guilt. It identifies unusual
          patterns and prioritizes cases for human verification. Every flagged record includes transparent
          evidence for why it requires attention, enabling investigators to begin their review with full context.
        </p>
      </div>

      {/* Processing Pipeline */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>Processing Pipeline</h3>
        </div>
        <div>
          {[
            { step: '1', title: 'MPLADS Data', desc: 'Raw work records ingested from the MPLADS dataset with original values preserved.', color: 'var(--info)' },
            { step: '2', title: 'Normalization', desc: 'Text normalized (Unicode, whitespace, case). Amounts parsed to numeric. Dates parsed to datetime.', color: 'var(--info)' },
            { step: '3', title: 'Context Engine', desc: 'Hierarchical peer groups built: State+Constituency+Category+Year with fallback levels.', color: 'var(--info)' },
            { step: '4', title: 'Peer Baseline', desc: 'Robust statistics computed per peer group: median, MAD, IQR, deviation ratios.', color: 'var(--info)' },
            { step: '5', title: 'Anomaly Signals', desc: 'Seven independent signals computed: cost anomaly, description similarity, MP concentration, constituency pattern, temporal anomaly, stage consistency, cross-signal pattern.', color: 'var(--risk-review)' },
            { step: '6', title: 'Pattern Engine', desc: 'Cross-signal patterns identified and scored for corroboration.', color: 'var(--risk-high)' },
            { step: '7', title: 'Signal Fusion', desc: 'Signals combined using authoritative weights into a unified risk score.', color: 'var(--risk-high)' },
            { step: '8', title: 'Corroboration', desc: 'Independent signals assessed for corroboration multiplier.', color: 'var(--risk-high)' },
            { step: '9', title: 'Risk + Confidence', desc: 'Risk score mapped to LOW/MODERATE/HIGH/CRITICAL. Confidence reflects evidence quality.', color: 'var(--risk-high)' },
            { step: '10', title: 'Evidence', desc: 'Structured evidence chain generated with full traceability.', color: 'var(--risk-high)' },
            { step: '11', title: 'Investigation Priority', desc: 'Projects ranked for human review with full context.', color: 'var(--success)' },
          ].map(({ step, title, desc, color }, i) => (
            <div key={step}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, flexShrink: 0
                }}>{step}</div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
              {i < 10 && (
                <div className="pipeline-arrow" style={{ marginLeft: 15 }}>
                  <ArrowDown size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Signals */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>Analytical Signals</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          {[
            {
              icon: <BarChart3 size={16} />,
              name: 'Cost Anomaly',
              desc: 'Compares work amount against peer-group median using nonlinear deviation magnitude, peer dispersion (MAD/IQR), and peer count for reliability. Extreme deviations approach maximum score.',
              weight: '25%',
            },
            {
              icon: <Search size={16} />,
              name: 'Description Similarity',
              desc: 'Identifies works with identical or near-identical descriptions within the same MP, indicating potential duplication or templated entries.',
              weight: '20%',
            },
            {
              icon: <Link2 size={16} />,
              name: 'MP Concentration',
              desc: 'Identifies unusual concentration of works by an MP in a specific category compared to national averages.',
              weight: '10%',
            },
            {
              icon: <Link2 size={16} />,
              name: 'Constituency Pattern',
              desc: 'Analyzes constituency-level patterns in work categories, including dominance and unusual amount distributions.',
              weight: '10%',
            },
            {
              icon: <AlertTriangle size={16} />,
              name: 'Temporal Anomaly',
              desc: 'Detects unusually dense project bursts, repeated similar works close together, and unusual category bursts within time windows.',
              weight: '10%',
            },
            {
              icon: <FileText size={16} />,
              name: 'Stage Consistency',
              desc: 'Conservative analysis of work stage patterns using RECOMMENDED, SANCTIONED, and COMPLETED stages.',
              weight: '10%',
            },
            {
              icon: <AlertTriangle size={16} />,
              name: 'Cross-Signal Pattern',
              desc: 'Identifies combinations of genuinely different anomaly dimensions that corroborate each other.',
              weight: '15%',
            },
          ].map(({ icon, name, desc, weight }) => (
            <div key={name} style={{
              background: 'var(--bg-subtle)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              borderLeft: '3px solid var(--gov-blue)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {icon}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                  Weight: {weight}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk vs Confidence */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>Risk vs Confidence</h3>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 8 }}><strong>Risk Score</strong> measures how anomalous a project is relative to its context. It answers: "How unusual is this project?"</p>
          <p style={{ marginBottom: 8 }}><strong>Confidence Score</strong> measures how strong and complete the evidence is. It answers: "How reliable is this assessment?"</p>
          <p style={{ marginBottom: 8 }}>A project can have high risk but low confidence (if data is sparse), or low risk but high confidence (if context clearly shows normality).</p>
          <p>Risk bands: <strong>LOW</strong> (0-39), <strong>MODERATE</strong> (40-64), <strong>HIGH</strong> (65-84), <strong>CRITICAL</strong> (85-100). Critical requires at least 3 independent signals.</p>
        </div>
      </div>

      {/* Evidence Model */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>Evidence Model</h3>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: 12 }}>Every flagged work produces a structured evidence chain:</p>
          <div style={{
            background: 'var(--bg-subtle)',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            lineHeight: 2,
            border: '1px solid var(--border-light)'
          }}>
            SOURCE RECORD<br />
            &nbsp;&nbsp;&darr; NORMALIZED DATA<br />
            &nbsp;&nbsp;&darr; CATEGORY INFERENCE<br />
            &nbsp;&nbsp;&darr; CONTEXT / PEER GROUP<br />
            &nbsp;&nbsp;&darr; SIGNALS (7 independent detectors)<br />
            &nbsp;&nbsp;&darr; PATTERN ENGINE<br />
            &nbsp;&nbsp;&darr; SIGNAL FUSION (weighted combination)<br />
            &nbsp;&nbsp;&darr; CORROBORATION<br />
            &nbsp;&nbsp;&darr; RISK + CONFIDENCE<br />
            &nbsp;&nbsp;&darr; EVIDENCE CHAIN<br />
            &nbsp;&nbsp;&darr; INVESTIGATION PRIORITY
          </div>
        </div>
      </div>

      {/* Important Limitations */}
      <div className="card" style={{ borderLeft: '4px solid var(--risk-review)', background: 'var(--risk-review-bg)' }}>
        <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--navy)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--risk-review)' }} />
            Important Limitations
          </h3>
        </div>
        <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Anomaly detection is not fraud detection. Statistical outliers may have legitimate explanations.</li>
          <li>Similar work descriptions may be coincidental or reflect standardised government work categories.</li>
          <li>Confidence reflects data availability and contextual reliability, not certainty of wrongdoing.</li>
          <li>Peer groups may be small for rare category-constituency combinations.</li>
          <li>Signal weights are based on domain expert judgment and configurable.</li>
          <li>Current data does not include: Contractor, Tender, Payments, Beneficiaries, Agency, Inspection, Physical Progress, or Work-level GPS.</li>
          <li>The system never makes accusations. It provides evidence for human investigation.</li>
        </ul>
      </div>
    </div>
  );
}
