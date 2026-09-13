import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map, Search, BarChart3, Users, Database, FileText, ArrowRight, ArrowDown,
  Inbox, Wand2, Radar, GitMerge, Gavel, ShieldCheck,
} from 'lucide-react';
import ChakraWatermark from '../components/ChakraWatermark';
import Reveal from '../components/Reveal';
import useCountUp from '../hooks/useCountUp';
import { getSummary } from '../services/api';

// Real figures computed from the shipped MPLADS monitoring dataset.
// Used as an honest fallback if the live /api/summary call is unavailable
// (e.g. viewing the static landing page without the backend running).
const FALLBACK_STATS = {
  total_records: 64058,
  total_amount: 33067000000, // ~Rs 3,306.7 Cr
  high_priority: 0,
  review_recommended: 0,
};

const PIPELINE_STEPS = [
  {
    n: '01',
    icon: Inbox,
    title: 'Ingest',
    desc: 'Raw MPLADS work records are loaded with every original value preserved, nothing rewritten.',
  },
  {
    n: '02',
    icon: Wand2,
    title: 'Normalize',
    desc: 'Text, dates, and amounts are cleaned and standardised so records can be compared fairly.',
  },
  {
    n: '03',
    icon: Radar,
    title: 'Detect signals',
    desc: 'Seven independent checks run on every work: cost anomaly, description similarity, MP concentration, constituency pattern, temporal anomaly, stage consistency, and cross-signal patterns.',
  },
  {
    n: '04',
    icon: GitMerge,
    title: 'Fuse evidence',
    desc: 'Signals are combined with transparent, configurable weights into one priority score and a readable evidence chain.',
  },
  {
    n: '05',
    icon: Gavel,
    title: 'Human decision',
    desc: 'An investigator opens the case, reads the evidence, and decides what happens next.',
  },
];

const SURFACES = [
  { icon: Map, name: 'Investigation Map', desc: 'Flagged works plotted by state and constituency, for on-the-ground context.' },
  { icon: Search, name: 'Priority Queue', desc: 'Every open case, ranked by evidence strength, ready to work through in order.' },
  { icon: BarChart3, name: 'Analytics', desc: 'Spending patterns compared across states, categories, and time.' },
  { icon: Users, name: 'Browse MP / Constituency', desc: "How an MP's recommendations compare to their peers, constituency by constituency." },
  { icon: Database, name: 'Data Health', desc: "What's missing or inconsistent in the underlying data, tracked in the open." },
  { icon: FileText, name: 'Methodology', desc: 'Exactly how every signal and score is computed, in plain language.' },
];

const NETWORK_NODES = [
  { x: 30, y: 40 }, { x: 90, y: 20 }, { x: 150, y: 55 }, { x: 210, y: 30 },
  { x: 260, y: 70 }, { x: 60, y: 100 }, { x: 130, y: 110 }, { x: 190, y: 95 },
  { x: 245, y: 130 }, { x: 40, y: 160 }, { x: 105, y: 175 }, { x: 165, y: 160 },
  { x: 225, y: 185 }, { x: 80, y: 220 }, { x: 150, y: 230 }, { x: 205, y: 220 },
];
const NETWORK_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [1, 6], [2, 7], [3, 7], [4, 8],
  [5, 6], [6, 7], [7, 8], [5, 9], [6, 10], [7, 11], [8, 12], [9, 10],
  [10, 11], [11, 12], [9, 13], [10, 14], [11, 14], [12, 15], [13, 14], [14, 15],
];

const HEADLINE_LINES = [
  'Public money should',
  'never move faster',
  'than the evidence.',
];

function StatFigure({ label, value, suffix = '', prefix = '' }) {
  const animated = useCountUp(value, { duration: 1200 });
  const formatted = typeof animated === 'number' ? Math.round(animated).toLocaleString('en-IN') : animated;
  return (
    <div className="land-stat">
      <div className="land-stat-value">{prefix}{formatted}{suffix}</div>
      <div className="land-stat-label">{label}</div>
    </div>
  );
}

function TickerFigure({ value, label, suffix = '', prefix = '' }) {
  const animated = useCountUp(value, { duration: 1400 });
  const formatted = typeof animated === 'number' ? Math.round(animated).toLocaleString('en-IN') : animated;
  return (
    <div className="land-ticker-item">
      <span className="land-ticker-value">{prefix}{formatted}{suffix}</span>
      <span className="land-ticker-label">{label}</span>
    </div>
  );
}

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export default function Landing() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [heroReady, setHeroReady] = useState(false);
  const scrolled = useScrolled();
  const pipelineRef = useRef(null);

  useEffect(() => {
    getSummary()
      .then((s) => {
        if (s && typeof s.total_records === 'number') setStats(s);
      })
      .catch(() => { /* keep the honest fallback figures */ });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const amountCr = Math.round((stats.total_amount || 0) / 10000000);
  const flaggedCount = (stats.high_priority || 0) + (stats.review_recommended || 0);

  return (
    <div className="landing">
      <ChakraWatermark />

      <header className={`land-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="land-nav-brand">
          <img src="/assets/mplads-sentinel-icon.png" alt="" className="land-nav-emblem" />
          <span>MPLADS SENTINEL</span>
        </div>
        <nav className="land-nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#surfaces">Inside Sentinel</a>
        </nav>
        <button className="btn btn-primary land-nav-cta" onClick={() => navigate('/dashboard')}>
          Open Sentinel
        </button>
      </header>

      {/* ---- Hero ---- */}
      <section className={`land-hero ${heroReady ? 'ready' : ''}`}>
        <div className="land-hero-backdrop" aria-hidden="true">
          <svg className="land-hero-network" viewBox="0 0 280 260" xmlns="http://www.w3.org/2000/svg">
            <g stroke="currentColor" strokeWidth="0.75" fill="none">
              {NETWORK_LINKS.map(([a, b], i) => {
                const p1 = NETWORK_NODES[a];
                const p2 = NETWORK_NODES[b];
                return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
              })}
            </g>
            <g fill="currentColor">
              {NETWORK_NODES.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i % 3 === 0 ? 3.2 : 2} />
              ))}
            </g>
          </svg>
        </div>

        <div className="land-hero-grid">
          <div className="land-hero-body">
            <div className="land-hero-kicker">
              <span className="dot" />
              Smart India Hackathon 2026 &middot; Public Funds Intelligence
            </div>

            <h1 className="land-hero-headline" aria-label={HEADLINE_LINES.join(' ')}>
              {HEADLINE_LINES.map((line, i) => (
                <span className="land-hero-line-wrap" key={line}>
                  <span className="land-hero-line" style={{ transitionDelay: `${140 + i * 120}ms` }}>
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p className="land-hero-sub">
              MPLADS Sentinel is an explainable risk-intelligence layer over India's Members of
              Parliament Local Area Development Scheme — surfacing the works that deserve a second
              look, and showing its reasoning for every single one.
            </p>

            <div className="land-hero-actions">
              <button className="btn btn-primary land-hero-cta" onClick={() => navigate('/dashboard')}>
                Open Sentinel <ArrowRight size={16} />
              </button>
              <a className="btn btn-ghost land-hero-ghost" href="#how-it-works">
                See how it works
              </a>
            </div>
          </div>

          <div className="land-hero-seal">
            <div className="land-hero-seal-plate">
              <img
                src="/assets/mplads-sentinel-logo.jpeg"
                alt="MPLADS Sentinel — Transparent Funds, Stronger Communities"
                className="land-hero-seal-img"
              />
            </div>
          </div>
        </div>

        <div className="land-ticker">
          <TickerFigure value={stats.total_records || FALLBACK_STATS.total_records} label="Works tracked" />
          <span className="land-ticker-sep" />
          <TickerFigure value={amountCr} prefix="₹" suffix=" Cr" label="Recommended & sanctioned" />
          <span className="land-ticker-sep" />
          <TickerFigure value={509} label="Constituencies" />
          <span className="land-ticker-sep" />
          <TickerFigure value={flaggedCount} label="Currently flagged for review" />
        </div>

        <a href="#what-is-mplads" className="land-scroll-cue" aria-label="Scroll to learn more">
          <ArrowDown size={14} />
        </a>
      </section>

      {/* ---- What is MPLADS ---- */}
      <section className="land-section land-section-white" id="what-is-mplads">
        <div className="land-section-grid">
          <Reveal as="div" className="land-section-copy">
            <span className="land-eyebrow">The scheme</span>
            <h2>What MPLADS is</h2>
            <p className="land-dropcap">
              Launched in December 1993, the Members of Parliament Local Area
              Development Scheme enables every Lok Sabha and Rajya Sabha MP to
              recommend development works for their constituency, or for districts
              in their state. Funding for these works is governed by the scheme's
              applicable guidelines and released to the district authority — never
              to the MP — for execution.
            </p>
            <p>
              District authorities sanction the recommended works, execute them, and
              report back. Over three decades, that chain of recommendation, sanction,
              and completion has funded an enormous, largely paper-based record of
              local development across the country.
            </p>
          </Reveal>
          <Reveal as="div" className="land-stat-rail" delay={120}>
            <StatFigure label="Works tracked in this dataset" value={stats.total_records || FALLBACK_STATS.total_records} />
            <StatFigure label="Recommended & sanctioned value" value={amountCr} prefix="₹" suffix=" Cr" />
            <StatFigure label="Constituencies represented" value={509} />
          </Reveal>
        </div>
      </section>

      {/* ---- Why oversight is hard ---- */}
      <section className="land-section land-section-muted land-problem">
        <div className="land-problem-grid">
          <Reveal as="div" className="land-scatter" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <div className={`land-scatter-card sc-${i}`} key={i}>
                {i === 3 && <span className="land-scatter-flag" />}
              </div>
            ))}
          </Reveal>
          <Reveal as="div" className="land-section-narrow" delay={80}>
            <span className="land-eyebrow">The problem</span>
            <h2>Why oversight is hard</h2>
            <p>
              MPLADS funds pass through hundreds of district authorities, recorded in
              formats that vary by state and by year. A work can be recommended,
              sanctioned, and marked complete without anyone checking it against what
              similar works normally cost, how often the same description repeats
              nearby, or whether neighbouring constituencies show the same pattern.
              That comparison is exactly what's hard to do by hand at national scale —
              and exactly what Sentinel is built to do.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---- How Sentinel works ---- */}
      <section className="land-section land-section-white" id="how-it-works" ref={pipelineRef}>
        <Reveal as="div" style={{ textAlign: 'center' }}>
          <span className="land-eyebrow land-eyebrow-centered">The method</span>
          <h2 className="land-section-heading-centered">How Sentinel works</h2>
        </Reveal>
        <div className="land-pipeline">
          {PIPELINE_STEPS.map((step, i) => (
            <React.Fragment key={step.n}>
              <Reveal as="div" className="land-pipeline-step" delay={i * 90}>
                <div className="land-pipeline-icon"><step.icon size={18} /></div>
                <div className="land-pipeline-n">{step.n}</div>
                <div className="land-pipeline-title">{step.title}</div>
                <div className="land-pipeline-desc">{step.desc}</div>
              </Reveal>
              {i < PIPELINE_STEPS.length - 1 && (
                <Reveal as="div" className="land-pipeline-connector" delay={i * 90 + 60} aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ---- The principle, held alone ---- */}
      <section className="land-principle">
        <div className="land-principle-chakra" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <Reveal as="p" className="land-principle-statement">
          AI prioritizes. Evidence explains. Humans decide.
        </Reveal>
        <Reveal as="p" className="land-principle-caption" delay={100}>
          Sentinel never accuses. It ranks, it shows its reasoning in full, and it
          hands every decision to a person.
        </Reveal>
        <div className="land-principle-rule" aria-hidden="true">
          <span className="s" /><span className="w" /><span className="g" />
        </div>
      </section>

      {/* ---- Where you can look ---- */}
      <section className="land-section land-section-white" id="surfaces">
        <Reveal as="div" style={{ textAlign: 'center' }}>
          <span className="land-eyebrow land-eyebrow-centered">Inside Sentinel</span>
          <h2 className="land-section-heading-centered">Where you can look</h2>
        </Reveal>
        <div className="land-surfaces">
          {SURFACES.map(({ icon: Icon, name, desc }, i) => (
            <Reveal as="div" className="land-surface" key={name} delay={i * 70}>
              <div className="land-surface-icon-chip"><Icon size={18} /></div>
              <div>
                <div className="land-surface-name">{name}</div>
                <div className="land-surface-desc">{desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="land-footer">
        <img src="/assets/mplads-sentinel-icon.png" alt="" className="land-footer-emblem" />
        <div className="land-footer-motto">पारदर्शिता • जवाबदेही • सत्यनिष्ठा</div>
        <div className="land-footer-tagline">Built with evidence, not accusation.</div>
        <div className="land-footer-row">
          <span>MPLADS Sentinel &middot; Built for Smart India Hackathon 2026</span>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Open Sentinel <ArrowRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
