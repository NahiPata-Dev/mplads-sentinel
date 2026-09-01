import React from 'react';

function StatCard({ label, value, accentClass = '', note = '' }) {
  return (
    <div className={`stat-card ${accentClass}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

function StatsCards({ stats, highPriorityCount, mediumPriorityCount, evidenceCoverage }) {
  return (
    <section className="stats-grid">
      <StatCard label="Live records" value={stats.total_mp} note="active MPs in queue" accentClass="blue" />
      <StatCard label="High priority" value={highPriorityCount} note="requires review" accentClass="red" />
      <StatCard label="Medium priority" value={mediumPriorityCount} note="keep in queue" accentClass="yellow" />
      <StatCard label="Evidence coverage" value={`${evidenceCoverage}%`} note="documents verified" accentClass="indigo" />
    </section>
  );
}

export default StatsCards;
