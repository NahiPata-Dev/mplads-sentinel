import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import StatsCards from './components/StatsCards';

const emptyStats = {
  total_mp: 0,
  red_count: 0,
  yellow_count: 0,
  blue_count: 0,
  green_count: 0,
  avg_risk: 0,
};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const apiBase = import.meta.env.VITE_API_BASE_URL || '';

const riskTheme = {
  RED: { background: '#ffebeb', color: '#d93025' },
  YELLOW: { background: '#fff4db', color: '#b45309' },
  BLUE: { background: '#eaf2ff', color: '#2563eb' },
  GREEN: { background: '#eafaf1', color: '#188038' },
};

function App() {
  const [stats, setStats] = useState(emptyStats);
  const [mps, setMps] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedMp, setSelectedMp] = useState(null);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredMps = useMemo(() => {
    return mps.filter((mp) => {
      const matchesFilter = riskFilter === 'ALL' || mp.risk_level === riskFilter;
      const matchesSearch = [mp.mp_name, mp.state, mp.constituency]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [mps, riskFilter, searchTerm]);

  useEffect(() => {
    if (!filteredMps.length) {
      setSelectedMp(null);
      return;
    }

    setSelectedMp((current) => {
      if (!current) return filteredMps[0];
      const exists = filteredMps.some((mp) => mp.mp_name === current.mp_name);
      return exists ? current : filteredMps[0];
    });
  }, [filteredMps]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResponse, mpsResponse, statesResponse] = await Promise.all([
        axios.get(`${apiBase}/api/dashboard/stats`),
        axios.get(`${apiBase}/api/mps`, { params: { limit: 200 } }),
        axios.get(`${apiBase}/api/states`),
      ]);

      const fetchedMps = mpsResponse.data.mps || [];
      setStats(statsResponse.data);
      setMps(fetchedMps);
      setStates(statesResponse.data || []);
      setSelectedMp(fetchedMps[0] || null);
    } catch (err) {
      console.error(err);
      setError('Unable to reach the MPLADS Sentinel backend. Please start the FastAPI API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleFeedback = async (mpName, label, notes = '') => {
    try {
      await axios.post(`${apiBase}/api/feedback`, {
        mp_name: mpName,
        label,
        notes,
      });
      setSelectedMp(null);
    } catch (err) {
      console.error('Feedback submission failed', err);
      setError('Feedback could not be submitted. Please try again.');
    }
  };

  const highPriorityCount = mps.filter((mp) => mp.risk_level === 'RED').length;
  const mediumPriorityCount = mps.filter((mp) => mp.risk_level === 'YELLOW').length;
  const evidenceCoverage = Math.min(100, Math.max(0, Math.round((mps.filter((mp) => mp.risk_explanation && Object.keys(mp.risk_explanation).length).length / Math.max(1, mps.length)) * 100)));

  const showOverview = activeTab === 'Overview';
  const showRecords = activeTab === 'Records';
  const showMethodology = activeTab === 'Methodology';

  const getScoreTooltip = (type, mp) => {
    if (!mp) return '';

    const allocation = Number(mp.allocated_amount || 0);
    const median = Number(mp.state_median || 0);
    const mad = Number(mp.state_mad || 1);
    const spentPct = Number(mp.spent_percentage || 0);
    const completionPct = Number(mp.completion_percentage || 0);
    const expectedSpent = allocation * (completionPct / 100);
    const actualSpent = allocation * (spentPct / 100);
    const diff = actualSpent - expectedSpent;

    if (type === 'financial') {
      const threshold2 = median + 2 * mad;
      const threshold3 = median + 3 * mad;
      return `Allocation ₹${formatCurrency(allocation).replace('₹', '')} vs state median ₹${formatCurrency(median).replace('₹', '')}; trigger bands ₹${formatCurrency(threshold2).replace('₹', '')} and ₹${formatCurrency(threshold3).replace('₹', '')}.`;
    }

    if (type === 'duplicate') {
      return mp.risk_explanation?.duplicate || 'No duplicate signal from name, constituency, and state similarity.';
    }

    if (type === 'performance') {
      return `Spent ₹${formatCurrency(actualSpent).replace('₹', '')} vs expected ₹${formatCurrency(expectedSpent).replace('₹', '')} for ${completionPct}% completion.`;
    }

    return `Weighted score: 0.30 × financial + 0.20 × duplicate + 0.30 × performance + 10 = ${Number(mp.risk_score ?? 0).toFixed(1)}.`;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-badge">S</div>
          <div>
            <div className="brand-label">Sentinel Public Works</div>
            <div className="brand-subtitle">Intelligence Workspace</div>
          </div>
        </div>

        <nav className="topnav" aria-label="Main navigation">
          {['Overview', 'Records', 'Methodology'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'nav-pill active' : 'nav-pill'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="top-actions">
          <button type="button" className="button secondary small" onClick={loadDashboard}>
            Refresh data
          </button>
          <button type="button" className="button primary small" onClick={loadDashboard}>
            Run analysis
          </button>
        </div>
      </header>

      {(showOverview || showRecords || showMethodology) && (
        <>
          {showOverview && (
            <>
              <section className="hero-panel">
                <div className="hero-copy">
                  <p className="eyebrow">Public Works / Intelligence workspace</p>
                  <h1>Make the signal accountable.</h1>
                  <p className="hero-subtext">
                    Review MPLADS allocation risk signals quickly, compare state-level patterns, and focus on the MPs that need a closer look.
                  </p>
                </div>

                <div className="hero-status">
                  <div className="status-block">
                    <span className="status-dot green" />
                    <div>
                      <strong>Live feed online</strong>
                      <small>{stats.total_mp} records loaded</small>
                    </div>
                  </div>
                  <div className="status-meta">
                    <span>Needs review</span>
                    <strong>{highPriorityCount + mediumPriorityCount}</strong>
                  </div>
                </div>
              </section>

              {error && <div className="error-banner">{error}</div>}

              {loading ? (
                <div className="loading-state">Loading signal intelligence…</div>
              ) : (
                <>
                  <StatsCards
                    stats={stats}
                    highPriorityCount={highPriorityCount}
                    mediumPriorityCount={mediumPriorityCount}
                    evidenceCoverage={evidenceCoverage}
                  />

                  <section className="insights-grid">
                    <div className="panel state-panel">
                      <div className="panel-header compact">
                        <div>
                          <p className="eyebrow">State risk map</p>
                          <h3>High-risk geography</h3>
                        </div>
                      </div>

                      <div className="state-list">
                        {(states || []).slice(0, 5).map((state) => (
                          <div key={state.state} className="state-row">
                            <div className="state-row-header">
                              <span>{state.state}</span>
                              <strong>{state.mp_count} MPs</strong>
                            </div>
                            <div className="progress-bar">
                              <span style={{ width: `${Math.min(100, Math.max(20, state.avg_risk_score))}%` }} />
                            </div>
                            <small>Avg score {Number(state.avg_risk_score || 0).toFixed(1)}</small>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="panel methodology-panel">
                      <div className="panel-header compact">
                        <div>
                          <p className="eyebrow">Read methodology</p>
                          <h3>How the signal is scored</h3>
                        </div>
                      </div>

                      <ul className="methodology-list">
                        <li>Financial anomalies compare allocation against the state median and MAD thresholds.</li>
                        <li>Duplicate-risk signals use TF-IDF name and constituency similarity to detect record overlap.</li>
                        <li>Performance-risk checks whether spending is materially above the expected completion profile.</li>
                        <li>Overall risk blends the three indicators into a single accountable score for triage.</li>
                      </ul>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {showRecords && (
            <>
              {error && <div className="error-banner">{error}</div>}

              {loading ? (
                <div className="loading-state">Loading queue…</div>
              ) : (
                <div className="workspace-grid">
                  <aside className="panel queue-panel">
                    <div className="panel-header">
                      <div>
                        <p className="eyebrow">Priority queue</p>
                        <h3>Projects to look at next</h3>
                      </div>
                      <button type="button" className="ghost-button" onClick={loadDashboard}>Refresh</button>
                    </div>

                    <div className="segmented-control" aria-label="Risk filter">
                      {['ALL', 'RED', 'YELLOW', 'BLUE', 'GREEN'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          className={riskFilter === level ? 'segment active' : 'segment'}
                          onClick={() => setRiskFilter(level)}
                          style={
                            riskFilter === level && level !== 'ALL'
                              ? { background: riskTheme[level]?.background || '#eef4ff', color: riskTheme[level]?.color || '#1f2937', borderColor: 'transparent' }
                              : undefined
                          }
                        >
                          {level}
                        </button>
                      ))}
                    </div>

                    <div className="search-bar">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by MP, state or constituency"
                      />
                    </div>

                    <div className="queue-list">
                      {filteredMps.map((mp) => (
                        <button
                          key={`${mp.mp_name}-${mp.constituency}`}
                          type="button"
                          className={selectedMp && selectedMp.mp_name === mp.mp_name ? 'queue-item active' : 'queue-item'}
                          onClick={() => setSelectedMp(mp)}
                        >
                          <div className="queue-item-top">
                            <span className="queue-name">{mp.mp_name}</span>
                            <span
                              className="risk-pill"
                              style={{
                                backgroundColor: riskTheme[mp.risk_level]?.background || '#eef4ff',
                                color: riskTheme[mp.risk_level]?.color || '#1f2937',
                              }}
                            >
                              {mp.risk_level}
                            </span>
                          </div>
                          <div className="queue-item-bottom">
                            <span>{mp.state}</span>
                            <span>{formatCurrency(mp.allocated_amount)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </aside>

                  <main className="panel detail-panel">
                    {selectedMp ? (
                      <>
                        <div className="detail-header">
                          <div>
                            <p className="eyebrow">Selected record</p>
                            <h2>{selectedMp.mp_name}</h2>
                          </div>
                          <span
                            className="detail-risk-tag"
                            style={{
                              backgroundColor: riskTheme[selectedMp.risk_level]?.background || '#eef4ff',
                              color: riskTheme[selectedMp.risk_level]?.color || '#1f2937',
                            }}
                          >
                            {selectedMp.risk_level}
                          </span>
                        </div>

                        <div className="detail-meta">
                          <span>{selectedMp.state}</span>
                          <span>{selectedMp.constituency}</span>
                          <span>{formatCurrency(selectedMp.allocated_amount)}</span>
                          <span>Overall score {Number(selectedMp.risk_score).toFixed(1)}</span>
                        </div>

                        <div className="score-grid">
                          <div className="mini-card red score-card-tooltip">
                            <label>Financial</label>
                            <strong>{selectedMp.financial_risk ?? 0}</strong>
                            <span className="score-tooltip">{getScoreTooltip('financial', selectedMp)}</span>
                          </div>
                          <div className="mini-card amber score-card-tooltip">
                            <label>Duplicate</label>
                            <strong>{selectedMp.duplicate_risk ?? 0}</strong>
                            <span className="score-tooltip">{getScoreTooltip('duplicate', selectedMp)}</span>
                          </div>
                          <div className="mini-card blue score-card-tooltip">
                            <label>Performance</label>
                            <strong>{selectedMp.performance_risk ?? 0}</strong>
                            <span className="score-tooltip">{getScoreTooltip('performance', selectedMp)}</span>
                          </div>
                          <div className="mini-card indigo score-card-tooltip">
                            <label>Overall</label>
                            <strong>{Number(selectedMp.risk_score ?? 0).toFixed(1)}</strong>
                            <span className="score-tooltip">{getScoreTooltip('overall', selectedMp)}</span>
                          </div>
                        </div>

                        <div className="feedback-box">
                          <label htmlFor="notes">Analyst notes</label>
                          <textarea
                            id="notes"
                            placeholder="Optional review notes for this signal"
                            value={selectedMp.notes || ''}
                            onChange={(event) => {
                              setSelectedMp((current) => current ? { ...current, notes: event.target.value } : current);
                            }}
                          />
                        </div>

                        <div className="detail-actions">
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => handleFeedback(selectedMp.mp_name, 'FALSE_ALARM', selectedMp.notes || '')}
                          >
                            False alarm
                          </button>
                          <button
                            type="button"
                            className="button primary"
                            onClick={() => handleFeedback(selectedMp.mp_name, 'CONFIRMED', selectedMp.notes || '')}
                          >
                            Confirm signal
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="empty-state">
                        <h3>No projects match the current filter.</h3>
                        <p>Adjust the risk level or search term to inspect another signal.</p>
                      </div>
                    )}
                  </main>
                </div>
              )}
            </>
          )}

          {showMethodology && (
            <section className="methodology-page panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Read methodology</p>
                  <h3>How the signal is scored</h3>
                </div>
              </div>

              <div className="methodology-content">
                <div className="methodology-card">
                  <h4>1. Financial anomaly</h4>
                  <p>Allocation is compared against each state’s median and MAD thresholds to spot unusually high spending patterns.</p>
                </div>
                <div className="methodology-card">
                  <h4>2. Duplicate risk</h4>
                  <p>Similar MP records are detected with TF-IDF scoring on name, constituency, and state strings to expose record overlap.</p>
                </div>
                <div className="methodology-card">
                  <h4>3. Performance mismatch</h4>
                  <p>Project spending is benchmarked against expected completion levels to detect over- or under-utilization.</p>
                </div>
                <div className="methodology-card">
                  <h4>4. Unified risk score</h4>
                  <p>The final score blends the three signals into a single triage label for analyst review.</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

    </div>
  );
}

export default App;
