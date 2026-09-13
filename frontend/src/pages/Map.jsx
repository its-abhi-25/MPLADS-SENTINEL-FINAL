import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, Layers } from 'lucide-react';
import { getMapData, getMapWorks, getMapFilters, getMps, getConstituencies } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import StageBadge from '../components/StageBadge';
import LoadingState from '../components/LoadingState';

const MAP_CENTER = [20.5937, 78.9629];
const MAP_ZOOM = 5;

const PRIORITY_COLORS = {
  CRITICAL: '#a6291f',
  HIGH: '#c45a20',
  MODERATE: '#93630c',
  LOW: '#1c6e46',
  HIGH_PRIORITY_REVIEW: '#a6291f',
  REVIEW_RECOMMENDED: '#93630c',
};

const PRIORITY_LABELS = {
  CRITICAL: 'Critical',
  HIGH: 'High Risk',
  MODERATE: 'Moderate',
  LOW: 'Low Risk',
  HIGH_PRIORITY_REVIEW: 'High Priority Review',
  REVIEW_RECOMMENDED: 'Review Recommended',
};

function formatAmount(amount) {
  if (!amount) return '-';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const clusterGroupRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [constituencyData, setConstituencyData] = useState([]);
  const [works, setWorks] = useState([]);
  const [filters, setFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [selectedWork, setSelectedWork] = useState(null);
  const [mapMode, setMapMode] = useState('risk');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [mpList, setMpList] = useState([]);
  const [constituencyList, setConstituencyList] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestHighlight, setSuggestHighlight] = useState(-1);
  const searchBoxRef = useRef(null);
  const [activeFilters, setActiveFilters] = useState({
    state: '',
    priority: '',
    stage: '',
    search: '',
  });

  useEffect(() => {
    getMapFilters().then(setFilterOptions).catch(() => {});
  }, []);

  // MP/Constituency name lists for the search autocomplete below -- fetched
  // once and matched client-side, same lists already used by MP Performance.
  useEffect(() => {
    Promise.all([getMps(), getConstituencies()]).then(([mps, cons]) => {
      setMpList(mps.mps || []);
      setConstituencyList((cons.constituencies || []).map(c => c.Constituency).filter(Boolean));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getMapData().then(data => {
      setConstituencyData(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeFilters.state) params.state = activeFilters.state;
    if (activeFilters.priority) params.risk_level = activeFilters.priority;
    if (activeFilters.stage) params.stage = activeFilters.stage;
    if (activeFilters.search) params.search = activeFilters.search;

    // The "show everything, no filter at all" case is the one that must
    // stay fast to open: fetching/parsing/rendering tens of thousands of
    // markers up front is what was causing the lag. It's capped to a
    // smaller, still nationally-representative sample (the backend
    // stratifies by state, so this isn't geographically concentrated --
    // see get_map_works). The moment the user picks a SPECIFIC risk level
    // (or narrows by state/stage/search), that filtered set is small
    // enough in practice to fetch in full -- no cap -- so "ALL relevant
    // works" for a chosen filter is still honoured exactly as before.
    if (!activeFilters.priority && !activeFilters.state && !activeFilters.stage && !activeFilters.search) {
      params.limit = 3000;
    }

    getMapWorks(params).then(data => {
      setWorks(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeFilters]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      maxZoom: 18,
      minZoom: 3,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      chunkedLoading: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        let radius = 30;
        if (count > 50) { size = 'large'; radius = 50; }
        else if (count > 20) { size = 'medium'; radius = 40; }

        const children = cluster.getAllChildMarkers();
        let criticalCount = 0, highCount = 0, moderateCount = 0, lowCount = 0;
        children.forEach(m => {
          const p = m.options.riskPriority;
          if (p === 'CRITICAL' || p === 'HIGH_PRIORITY_REVIEW') criticalCount++;
          else if (p === 'HIGH') highCount++;
          else if (p === 'MODERATE' || p === 'REVIEW_RECOMMENDED') moderateCount++;
          else lowCount++;
        });

        let bgColor = '#1c6e46';
        if (criticalCount > 0 && criticalCount >= highCount && criticalCount >= moderateCount) bgColor = '#a6291f';
        else if (highCount > moderateCount) bgColor = '#c45a20';
        else if (moderateCount > lowCount) bgColor = '#93630c';

        return L.divIcon({
          html: `<div style="
            background: ${bgColor};
            width: ${radius}px;
            height: ${radius}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: ${radius > 40 ? 14 : 12}px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: '',
          iconSize: [radius, radius],
          iconAnchor: [radius / 2, radius / 2],
        });
      },
    });

    map.addLayer(clusterGroup);
    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup();
    clusterGroupRef.current = clusterGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;
    const L = window.L;
    if (!L) return;

    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();

    // Only 4 possible marker colors exist (risk bands) -- build each dot
    // icon once and reuse the same L.divIcon instance across every marker
    // of that color, instead of constructing a fresh icon (and HTML
    // string) per marker. For a few thousand markers this alone removes
    // most of the per-marker construction cost.
    const iconCache = {};
    function getDotIcon(color) {
      if (!iconCache[color]) {
        iconCache[color] = L.divIcon({
          html: `<div style="
            width: 12px;
            height: 12px;
            background: ${color};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          "></div>`,
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
      }
      return iconCache[color];
    }

    // Popup HTML is comparatively expensive to build (many interpolations)
    // and is only ever needed for the one marker a person actually clicks
    // -- so it's built lazily on click instead of upfront for every
    // marker, which is the other big cost when there are thousands of them.
    function buildPopupContent(work, color) {
      const riskScore = work.risk_score != null ? (work.risk_score * 100).toFixed(0) : (work.priority_score * 100).toFixed(0);
      const confidence = work.confidence_score != null ? (work.confidence_score * 100).toFixed(0) : '';
      const priority = work.risk_level || work.priority || 'LOW';
      return `
        <div style="font-family: var(--font-ui, 'IBM Plex Sans', sans-serif); min-width: 260px; max-width: 320px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: 600;
              background: ${color}15;
              color: ${color};
              border: 1px solid ${color}30;
            ">${PRIORITY_LABELS[priority] || priority}</span>
            <span style="font-size: 10px; color: var(--text-muted, #737d95);">
              Risk: ${riskScore}/100
            </span>
            ${confidence ? `<span style="font-size: 10px; color: var(--text-muted, #737d95);">
              Conf: ${confidence}%
            </span>` : ''}
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--navy-800, #141c33); margin-bottom: 4px; line-height: 1.4;">
            ${work.description || 'No description'}
          </div>
          <div style="font-size: 11px; color: var(--text-secondary, #454e64); margin-bottom: 6px;">
            <div><strong>MP:</strong> ${work.mp}</div>
            <div><strong>State:</strong> ${work.state} | <strong>Constituency:</strong> ${work.constituency}</div>
            <div><strong>Amount:</strong> ${formatAmount(work.amount)} | <strong>Stage:</strong> ${work.stage}</div>
            <div><strong>Category:</strong> ${work.category || 'Unknown'}</div>
          </div>
          ${work.evidence_summary ? `<div style="font-size: 11px; color: var(--text-muted, #737d95); margin-bottom: 6px; padding: 6px; background: var(--bg-subtle, #f6f7fa); border-radius: 4px; line-height: 1.4;">${work.evidence_summary.substring(0, 120)}...</div>` : ''}
          <div style="font-size: 10px; color: var(--text-faint, #9aa2b6); margin-bottom: 8px;">
            Location: ${work.location_level === 'CONSTITUENCY' ? 'Approximate constituency location' : work.location_level === 'STATE' ? 'Approximate state location' : work.location_level}
          </div>
          <button onclick="window.__mapNavigate('/record/${work.record_id}')" style="
            width: 100%;
            padding: 6px 12px;
            background: var(--indigo-600, #384a8a);
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            transition: background 150ms ease;
          " onmouseover="this.style.background='var(--indigo-700, #2e3d72)'" onmouseout="this.style.background='var(--indigo-600, #384a8a)'">
            View Investigation
          </button>
        </div>
      `;
    }

    works.forEach(work => {
      if (!work.latitude || !work.longitude) return;

      const priority = work.risk_level || work.priority || 'LOW';
      const color = PRIORITY_COLORS[priority] || '#1c6e46';

      const marker = L.marker([work.latitude, work.longitude], { icon: getDotIcon(color) });
      marker.riskPriority = priority;

      marker.bindPopup('', { maxWidth: 320 });
      marker.on('popupopen', () => {
        marker.setPopupContent(buildPopupContent(work, color));
      });
      marker.on('click', () => { setSelectedWork(work); });
      clusterGroup.addLayer(marker);
    });

    if (works.length > 0) {
      const bounds = clusterGroup.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [works]);

  useEffect(() => {
    window.__mapNavigate = (path) => { navigate(path); };
    return () => { delete window.__mapNavigate; };
  }, [navigate]);

  const updateFilter = (key, value) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
  };

  // Autocomplete suggestions: once 2+ characters are typed, match against
  // the real MP and constituency name lists (client-side, case-insensitive
  // substring match), tagged by type, capped to keep the list short.
  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (q.length < 2) return [];
    const mpMatches = mpList
      .filter(name => name.toLowerCase().includes(q))
      .slice(0, 5)
      .map(name => ({ type: 'MP', name }));
    const constMatches = constituencyList
      .filter(name => name.toLowerCase().includes(q))
      .slice(0, 5)
      .map(name => ({ type: 'Constituency', name }));
    return [...mpMatches, ...constMatches].slice(0, 8);
  }, [searchInput, mpList, constituencyList]);

  // Close the suggestion dropdown on outside click, or if any scrollable
  // ancestor scrolls -- the dropdown is portaled to <body> (see render
  // below) so it isn't clipped by the filter panel's overflow:hidden, but
  // that also means its position would go stale if left open while
  // scrolling, so we just close it instead of tracking position live.
  useEffect(() => {
    const handleOutside = (e) => {
      const insideInput = searchBoxRef.current && searchBoxRef.current.contains(e.target);
      const insideDropdown = e.target.closest && e.target.closest('[data-map-search-suggestions]');
      if (!insideInput && !insideDropdown) setSuggestOpen(false);
    };
    const handleScroll = () => setSuggestOpen(false);
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const selectSuggestion = (name) => {
    setSearchInput(name);
    setSuggestOpen(false);
    setSuggestHighlight(-1);
    // Apply immediately rather than waiting for the debounce below -- the
    // user has explicitly chosen this value, so the filter should reflect
    // it right away.
    setActiveFilters(prev => ({ ...prev, search: name }));
  };

  const handleSearchKeyDown = (e) => {
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && suggestHighlight >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[suggestHighlight].name);
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
    }
  };

  // Debounce the free-text search: typing shouldn't refetch and re-render
  // every marker on every keystroke. The visible input updates instantly
  // (searchInput); the actual map query (activeFilters.search) only
  // updates 350ms after typing pauses.
  useEffect(() => {
    const t = setTimeout(() => {
      setActiveFilters(prev => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const clearFilters = () => {
    setActiveFilters({ state: '', priority: '', stage: '', search: '' });
    setSearchInput('');
    setSuggestOpen(false);
    setSuggestHighlight(-1);
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v !== '');

  const stats = useMemo(() => {
    const critical = works.filter(w => (w.risk_level || w.priority) === 'CRITICAL' || (w.risk_level || w.priority) === 'HIGH_PRIORITY_REVIEW').length;
    const high = works.filter(w => (w.risk_level || w.priority) === 'HIGH').length;
    const moderate = works.filter(w => (w.risk_level || w.priority) === 'MODERATE' || (w.risk_level || w.priority) === 'REVIEW_RECOMMENDED').length;
    const low = works.filter(w => (w.risk_level || w.priority) === 'LOW').length;
    const totalAmount = works.reduce((sum, w) => sum + (w.amount || 0), 0);
    return { critical, high, moderate, low, total: works.length, totalAmount };
  }, [works]);

  return (
    <div className="map-shell">
      {sidebarOpen ? (
        <div className="map-floating-panel">
          <div className="map-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3>Investigation Map</h3>
              <p>MPLADS works with contextual risk overlay</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-on-dark-muted)', padding: 4, flexShrink: 0 }}
              aria-label="Collapse panel"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="map-panel-body">
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Filter size={13} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--shell-800)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Filters</span>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--gov-blue)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="toolbar-group">
                  <span className="toolbar-label">State</span>
                  <select
                    className="toolbar-select"
                    style={{ width: '100%' }}
                    value={activeFilters.state}
                    onChange={(e) => updateFilter('state', e.target.value)}
                  >
                    <option value="">All States</option>
                    {(filterOptions.states || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="toolbar-group">
                  <span className="toolbar-label">Risk Level</span>
                  <select
                    className="toolbar-select"
                    style={{ width: '100%' }}
                    value={activeFilters.priority}
                    onChange={(e) => updateFilter('priority', e.target.value)}
                  >
                    <option value="">All Risk Levels</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High Risk</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="LOW">Low Risk</option>
                  </select>
                </div>

                <div className="toolbar-group">
                  <span className="toolbar-label">Stage</span>
                  <select
                    className="toolbar-select"
                    style={{ width: '100%' }}
                    value={activeFilters.stage}
                    onChange={(e) => updateFilter('stage', e.target.value)}
                  >
                    <option value="">All Stages</option>
                    {(filterOptions.stages || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="toolbar-search" style={{ minWidth: 0 }} ref={searchBoxRef}>
                  <Search size={14} />
                  <input
                    type="text"
                    className="toolbar-input"
                    style={{ width: '100%' }}
                    placeholder="MP, constituency, description..."
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setSuggestOpen(true); setSuggestHighlight(-1); }}
                    onFocus={() => searchInput.trim().length >= 2 && setSuggestOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    autoComplete="off"
                  />
                  {suggestOpen && suggestions.length > 0 && searchBoxRef.current && createPortal(
                    (() => {
                      const rect = searchBoxRef.current.getBoundingClientRect();
                      return (
                        <div
                          data-map-search-suggestions
                          style={{
                            position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width,
                            background: '#fff', border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                            zIndex: 5000, maxHeight: 260, overflowY: 'auto',
                          }}
                        >
                          {suggestions.map((s, i) => (
                            <div
                              key={`${s.type}-${s.name}`}
                              onMouseEnter={() => setSuggestHighlight(i)}
                              onClick={() => selectSuggestion(s.name)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                padding: '8px 12px', cursor: 'pointer', fontSize: 12.5,
                                background: i === suggestHighlight ? 'var(--bg-hover)' : 'transparent',
                                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-light)' : 'none',
                              }}
                            >
                              <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-faint)' }}>{s.type}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })(),
                    document.body
                  )}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--shell-800)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Current View ({stats.total} works)
            </div>
            <div className="map-stat-strip">
              <div className="map-stat-cell">
                <div className="n" style={{ color: 'var(--risk-high)' }}>{stats.critical}</div>
                <div className="l">Critical</div>
              </div>
              <div className="map-stat-cell">
                <div className="n" style={{ color: '#c45a20' }}>{stats.high}</div>
                <div className="l">High</div>
              </div>
              <div className="map-stat-cell">
                <div className="n" style={{ color: 'var(--risk-review)' }}>{stats.moderate}</div>
                <div className="l">Moderate</div>
              </div>
              <div className="map-stat-cell">
                <div className="n" style={{ color: 'var(--risk-low)' }}>{stats.low}</div>
                <div className="l">Low</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              Total: {formatAmount(stats.totalAmount)}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--shell-800)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Legend</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { key: 'CRITICAL', label: 'Critical', color: '#a6291f' },
                  { key: 'HIGH', label: 'High Risk', color: '#c45a20' },
                  { key: 'MODERATE', label: 'Moderate', color: '#93630c' },
                  { key: 'LOW', label: 'Low Risk', color: '#1c6e46' },
                ].map(({ key, label, color }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: 2,
                      background: color, border: '1.5px solid white',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }} />
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--shell-800)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Works ({works.length})
              </div>
              <div>
                {works.slice(0, 50).map(work => {
                  const priority = work.risk_level || work.priority || 'LOW';
                  return (
                    <div
                      key={work.record_id}
                      className={`map-work-card ${selectedWork?.record_id === work.record_id ? 'selected' : ''}`}
                      style={{ '--work-accent': PRIORITY_COLORS[priority] || '#1c6e46' }}
                      onClick={() => {
                        setSelectedWork(work);
                        if (mapInstanceRef.current && work.latitude && work.longitude) {
                          mapInstanceRef.current.setView([work.latitude, work.longitude], 12);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 4 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 10.5 }}>{work.record_id}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {work.risk_score != null ? (work.risk_score * 100).toFixed(0) : (work.priority_score * 100).toFixed(0)}
                        </span>
                      </div>
                      <div style={{
                        color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', lineHeight: 1.3, paddingLeft: 4,
                      }}>
                        {work.description || 'No description'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 4 }}>
                        {work.constituency} | {formatAmount(work.amount)}
                      </div>
                    </div>
                  );
                })}
                {works.length > 50 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
                    + {works.length - 50} more works (use filters to narrow down)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button className="map-panel-collapse" onClick={() => setSidebarOpen(true)}>
          <Layers size={14} />
          Filters & List
        </button>
      )}

      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {loading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 999,
        }}>
          <LoadingState message="Loading map data..." />
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, right: 0, background: 'rgba(255,255,255,0.8)',
        padding: '2px 6px', fontSize: 10, color: 'var(--text-muted)', zIndex: 999, borderRadius: '4px 0 0 0',
      }}>
        &copy; OpenStreetMap contributors | MPLADS Sentinel
      </div>

      <div style={{
        position: 'absolute', bottom: 28, right: 0, background: 'rgba(255,255,255,0.9)',
        padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', zIndex: 999,
        borderTop: '1px solid var(--border-light)',
      }}>
        Markers show approximate constituency-level locations, not exact work sites
      </div>
    </div>
  );
}