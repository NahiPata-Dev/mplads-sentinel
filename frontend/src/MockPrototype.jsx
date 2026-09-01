import React, { useMemo, useState } from 'react';
import StatsCards from './components/StatsCards';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

// Embedded mock data - replaces API calls for static deployment
const mockDashboard = {
  stats: {
    total_mp: 18,
    red_count: 4,
    yellow_count: 6,
    blue_count: 5,
    green_count: 3,
    avg_risk: 58.4,
  },
  states: [
    { state: 'Uttar Pradesh', mp_count: 4, avg_risk_score: 74.2 },
    { state: 'Maharashtra', mp_count: 3, avg_risk_score: 68.6 },
    { state: 'West Bengal', mp_count: 2, avg_risk_score: 63.7 },
    { state: 'Bihar', mp_count: 3, avg_risk_score: 61.8 },
    { state: 'Tamil Nadu', mp_count: 2, avg_risk_score: 58.3 },
  ],
  mps: [
    {
      mp_name: 'Rahul Sharma',
      state: 'Uttar Pradesh',
      constituency: 'Amethi',
      allocated_amount: 13200000,
      state_median: 7600000,
      state_mad: 1800000,
      spent_percentage: 82,
      completion_percentage: 68,
      risk_score: 86.4,
      risk_level: 'RED',
      financial_risk: 80,
      duplicate_risk: 0,
      performance_risk: 80,
      risk_explanation: {
        financial: 'Allocation ₹1.32Cr is above the state median ₹76L and beyond the 3×MAD threshold.',
        duplicate: 'No duplicate match found from name, constituency, and state similarity checks.',
        performance: 'Spent ₹1.08Cr vs expected ₹89.8L for 68% completion, indicating overspend.',
        combined: 'Overall risk is RED because financial and performance signals are both elevated.'
      }
    },
    {
      mp_name: 'Anil Verma',
      state: 'Maharashtra',
      constituency: 'Nagpur',
      allocated_amount: 9400000,
      state_median: 8100000,
      state_mad: 2200000,
      spent_percentage: 66,
      completion_percentage: 58,
      risk_score: 72.1,
      risk_level: 'YELLOW',
      financial_risk: 50,
      duplicate_risk: 40,
      performance_risk: 50,
      risk_explanation: {
        financial: 'Allocation ₹94L exceeds the state median ₹81L, but remains within the main trigger band.',
        duplicate: 'A partial similarity match was found with another MP record using similar name and constituency pattern.',
        performance: 'Spent ₹62L vs expected ₹54.5L for 58% completion, a moderate overspend.',
        combined: 'The MP is YELLOW because the financial and performance signals are moderate rather than extreme.'
      }
    },
    {
      mp_name: 'Sushma Iyer',
      state: 'West Bengal',
      constituency: 'Howrah',
      allocated_amount: 6200000,
      state_median: 7000000,
      state_mad: 1500000,
      spent_percentage: 54,
      completion_percentage: 71,
      risk_score: 44.5,
      risk_level: 'BLUE',
      financial_risk: 20,
      duplicate_risk: 0,
      performance_risk: 50,
      risk_explanation: {
        financial: 'Allocation ₹62L is close to the state median ₹70L and does not breach the anomaly threshold.',
        duplicate: 'No duplicate signal detected.',
        performance: 'Spent ₹33L vs expected ₹44L for 71% completion, implying underutilization relative to completion.',
        combined: 'Overall risk is BLUE due to moderate performance mismatch rather than financial anomaly.'
      }
    },
    {
      mp_name: 'Nikhil Rao',
      state: 'Bihar',
      constituency: 'Patna',
      allocated_amount: 5100000,
      state_median: 5400000,
      state_mad: 1200000,
      spent_percentage: 48,
      completion_percentage: 52,
      risk_score: 26.7,
      risk_level: 'GREEN',
      financial_risk: 20,
      duplicate_risk: 0,
      performance_risk: 0,
      risk_explanation: {
        financial: 'Allocation ₹51L is within the expected state range around the ₹54L median.',
        duplicate: 'No duplicate records detected.',
        performance: 'Spent ₹24.5L vs expected ₹26.5L for 52% completion, which is aligned with expected output.',
        combined: 'Overall risk is GREEN because the record remains within expected range on all three indicators.'
      }
    },
    {
      mp_name: 'Ayesha Khan',
      state: 'Tamil Nadu',
      constituency: 'Coimbatore',
      allocated_amount: 10500000,
      state_median: 6700000,
      state_mad: 1800000,
      spent_percentage: 90,
      completion_percentage: 60,
      risk_score: 78.8,
      risk_level: 'RED',
      financial_risk: 80,
      duplicate_risk: 0,
      performance_risk: 80,
      risk_explanation: {
        financial: 'Allocation ₹1.05Cr is well above the state median ₹67L and 3×MAD threshold.',
        duplicate: 'No duplicate match found.',
        performance: 'Spent ₹94.5L vs expected ₹63L for 60% completion, indicating a strong overspend.',
        combined: 'This is a RED record because both financial and performance evidence points to unusually high risk.'
      }
    }
  ]
};

const riskTheme = {
  RED: { background: '#ffebeb', color: '#d93025' },
  YELLOW: { background: '#fff4db', color: '#b45309' },
  BLUE: { background: '#eaf2ff', color: '#2563eb' },
  GREEN: { background: '#eafaf1', color: '#188038' },
};

function MockPrototype() {
  const [stats] = useState(mockDashboard.stats);
  const [mps] = useState(mockDashboard.mps);
  const [states] = useState(mockDashboard.states);
  const [selectedMp, setSelectedMp] = useState(mockDashboard.mps[0] || null);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');

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
          <button type="button" className="button secondary small">
            Refresh data
          </button>
          <button type="button" className="button primary small">
            Run analysis
          </button>
        </div>
      </header>

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

      {showRecords && (
        <div className="workspace-grid">
          <aside className="panel queue-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Priority queue</p>
                <h3>Projects to look at next</h3>
              </div>
              <button type="button" className="ghost-button">Refresh</button>
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
                    defaultValue=""
                  />
                </div>

                <div className="detail-actions">
                  <button type="button" className="button secondary">
                    False alarm
                  </button>
                  <button type="button" className="button primary">
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
              <p>Allocation is compared against each state's median and MAD thresholds to spot unusually high spending patterns.</p>
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
    </div>
  );
}

export default MockPrototype;
