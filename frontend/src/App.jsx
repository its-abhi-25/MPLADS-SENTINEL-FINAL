import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Search, BarChart3, FileText,
  Database, Map, Users, Menu, Home
} from 'lucide-react';
import ChakraWatermark from './components/ChakraWatermark';
import HelpChatbot from './components/chatbot/HelpChatbot';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import InvestigationQueue from './pages/InvestigationQueue';
import RecordDetail from './pages/RecordDetail';
import Analytics from './pages/Analytics';
import DataHealth from './pages/DataHealth';
import Methodology from './pages/Methodology';
import MapPage from './pages/Map';
import MPPerformance from './pages/MPPerformance';

const NAV_SECTIONS = [
  {
    label: 'Monitor',
    items: [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Investigate',
    items: [
      { path: '/map', label: 'Investigation Map', icon: Map },
      { path: '/queue', label: 'Priority Queue', icon: Search },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/mp-performance', label: 'Browse MP / Constituency', icon: Users },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/data-health', label: 'Data Health', icon: Database },
      { path: '/methodology', label: 'Methodology', icon: FileText },
    ],
  },
];

const PAGE_META = {
  '/dashboard': { title: 'Overview', crumb: 'Monitor' },
  '/map': { title: 'Investigation Map', crumb: 'Investigate' },
  '/queue': { title: 'Priority Queue', crumb: 'Investigate' },
  '/analytics': { title: 'Analytics', crumb: 'Analyze' },
  '/mp-performance': { title: 'Browse MP / Constituency', crumb: 'Analyze' },
  '/data-health': { title: 'Data Health', crumb: 'System' },
  '/methodology': { title: 'Methodology', crumb: 'System' },
};

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Sidebar({ open, onClose }) {
  return (
    <aside className={`shell-sidebar ${open ? 'open' : ''}`}>
      <div className="shell-brand">
        <div className="shell-emblem">
          <img src="/assets/mplads-sentinel-icon.png" alt="MPLADS Sentinel emblem" className="shell-emblem-img" />
        </div>
        <div className="shell-brand-text">
          <h1>MPLADS SENTINEL</h1>
          <div className="tag">Investigation Intelligence</div>
        </div>
      </div>
      <div className="shell-brand-motto">पारदर्शिता • जवाबदेही • सत्यनिष्ठा</div>

      <nav className="shell-nav">
        {NAV_SECTIONS.map((section) => (
          <div className="shell-nav-section" key={section.label}>
            <div className="shell-nav-section-label">{section.label}</div>
            {section.items.map(({ path, label, icon: Icon, end }) => (
              <NavLink
                key={path}
                to={path}
                end={!!end}
                onClick={onClose}
                className={({ isActive }) => `shell-nav-link ${isActive ? 'active' : ''}`}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
                }}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="shell-footer">
        <div className="shell-status">
          <span className="dot" />
          System Active &middot; Live Data
        </div>
        <div className="shell-version">MPLADS Sentinel v2.0 &middot; SIH 2026</div>
      </div>
    </aside>
  );
}

function Topbar({ onMenuClick }) {
  const location = useLocation();
  const now = useClock();
  const meta = PAGE_META[location.pathname] || (location.pathname.startsWith('/record/')
    ? { title: 'Case Review', crumb: 'Investigate' }
    : { title: 'MPLADS Sentinel', crumb: '' });

  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

  return (
    <header className="shell-topbar">
      <div className="shell-topbar-title">
        <button className="shell-menu-btn" onClick={onMenuClick} aria-label="Open navigation">
          <Menu size={18} />
        </button>
        <Link to="/" className="shell-home-btn" aria-label="Home" title="Back to MPLADS Sentinel home">
          <Home size={17} />
        </Link>
        {meta.crumb && <span className="crumb">{meta.crumb} /</span>}
        <h2>{meta.title}</h2>
      </div>
      <div className="shell-topbar-right">
        <div className="shell-gov-chip">
          <span className="flag"><span className="s" /><span className="w" /><span className="g" /></span>
          <span>MPLADS Monitoring Portal</span>
        </div>
        <div className="shell-clock">
          <div className="time">{timeStr} IST</div>
          <div className="date">{dateStr}</div>
        </div>
      </div>
    </header>
  );
}

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div className="app-shell">
      <ChakraWatermark />
      <div className="shell-body">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className={`shell-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar onMenuClick={() => setMenuOpen(true)} />
          <main className="shell-content">
            <div key={location.pathname} className="page-transition">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/queue" element={<InvestigationQueue />} />
                <Route path="/record/:recordId" element={<RecordDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/mp-performance" element={<MPPerformance />} />
                <Route path="/data-health" element={<DataHealth />} />
                <Route path="/methodology" element={<Methodology />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
      <HelpChatbot />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
