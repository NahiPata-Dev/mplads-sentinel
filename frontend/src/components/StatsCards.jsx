import React from 'react';

function StatCard({ label, value, accentClass = '' }) {
  return (
    <div className={`stat-card ${accentClass}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function StatsCards({ stats }) {
  return (
    <section className="stats-grid">
      <StatCard label="Total MPs" value={stats.total_mp} accentClass="blue" />
      <StatCard label="RED" value={stats.red_count} accentClass="red" />
      <StatCard label="YELLOW" value={stats.yellow_count} accentClass="yellow" />
      <StatCard label="BLUE" value={stats.blue_count} accentClass="blue-light" />
    </section>
  );
}

export default StatsCards;
