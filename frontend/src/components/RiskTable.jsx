import React from 'react';

const riskColors = {
  RED: '#d93025',
  YELLOW: '#f9ab00',
  BLUE: '#1a73e8',
  GREEN: '#188038',
};

function RiskTable({ mps, riskFilter, setRiskFilter, searchTerm, setSearchTerm, onRowClick }) {
  return (
    <div>
      <div className="toolbar">
        <div className="filter-group">
          <label htmlFor="risk-filter">Risk level</label>
          <select id="risk-filter" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="ALL">ALL</option>
            <option value="RED">RED</option>
            <option value="YELLOW">YELLOW</option>
            <option value="BLUE">BLUE</option>
            <option value="GREEN">GREEN</option>
          </select>
        </div>

        <div className="search-group">
          <label htmlFor="search-input">Search MP</label>
          <input
            id="search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name"
          />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>MP Name</th>
              <th>State</th>
              <th>Constituency</th>
              <th>Allocation</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {mps.map((mp) => (
              <tr key={`${mp.mp_name}-${mp.constituency}`} onClick={() => onRowClick(mp)} className="clickable-row">
                <td>{mp.mp_name}</td>
                <td>{mp.state}</td>
                <td>{mp.constituency}</td>
                <td>₹{Number(mp.allocated_amount).toLocaleString()}</td>
                <td>{Number(mp.risk_score).toFixed(1)}</td>
                <td>
                  <span
                    className="risk-pill"
                    style={{ backgroundColor: `${riskColors[mp.risk_level] || '#6b7280'}22`, color: riskColors[mp.risk_level] || '#6b7280' }}
                  >
                    {mp.risk_level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RiskTable;
