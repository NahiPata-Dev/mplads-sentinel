import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import StatsCards from './components/StatsCards';
import RiskTable from './components/RiskTable';
import RiskModal from './components/RiskModal';

const emptyStats = {
  total_mp: 0,
  red_count: 0,
  yellow_count: 0,
  blue_count: 0,
  green_count: 0,
  avg_risk: 0,
};

function App() {
  const [stats, setStats] = useState(emptyStats);
  const [mps, setMps] = useState([]);
  const [selectedMp, setSelectedMp] = useState(null);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredMps = useMemo(() => {
    return mps.filter((mp) => {
      const matchesFilter = riskFilter === 'ALL' || mp.risk_level === riskFilter;
      const matchesSearch = mp.mp_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [mps, riskFilter, searchTerm]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsResponse, mpsResponse] = await Promise.all([
          axios.get('/api/dashboard/stats'),
          axios.get('/api/mps', { params: { limit: 200 } }),
        ]);

        setStats(statsResponse.data);
        setMps(mpsResponse.data.mps || []);
      } catch (err) {
        console.error(err);
        setError('Unable to reach the MPLADS Sentinel backend. Please start the FastAPI API server.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleFeedback = async (mpName, label, notes = '') => {
    try {
      await axios.post('/api/feedback', {
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

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">MPLADS Sentinel AI</p>
          <h1>MP Risk Monitoring Dashboard</h1>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading dashboard data…</div>
      ) : (
        <>
          <StatsCards stats={stats} />

          <section className="panel">
            <RiskTable
              mps={filteredMps}
              riskFilter={riskFilter}
              setRiskFilter={setRiskFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onRowClick={setSelectedMp}
            />
          </section>
        </>
      )}

      {selectedMp && (
        <RiskModal
          mp={selectedMp}
          onClose={() => setSelectedMp(null)}
          onFeedback={handleFeedback}
        />
      )}
    </div>
  );
}

export default App;
