import React, { useState } from 'react';

function RiskModal({ mp, onClose, onFeedback }) {
  const [notes, setNotes] = useState('');

  if (!mp) return null;

  const explanation = mp.risk_explanation || {};
  const explanationList = [
    explanation.financial,
    explanation.duplicate,
    explanation.performance,
    explanation.combined,
  ].filter(Boolean);

  const submit = (label) => {
    onFeedback(mp.mp_name, label, notes);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Risk Details</p>
            <h2>{mp.mp_name}</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="mp-meta">
          <span>{mp.state}</span>
          <span>{mp.constituency}</span>
          <span>₹{Number(mp.allocated_amount).toLocaleString()}</span>
          <span>{mp.risk_level}</span>
        </div>

        <div className="score-grid">
          <div className="mini-card">
            <label>Financial</label>
            <strong>{mp.financial_risk ?? 0}</strong>
          </div>
          <div className="mini-card">
            <label>Duplicate</label>
            <strong>{mp.duplicate_risk ?? 0}</strong>
          </div>
          <div className="mini-card">
            <label>Performance</label>
            <strong>{mp.performance_risk ?? 0}</strong>
          </div>
          <div className="mini-card">
            <label>Overall</label>
            <strong>{Number(mp.risk_score ?? 0).toFixed(1)}</strong>
          </div>
        </div>

        <div className="explanation-box">
          <h3>Why this MP was flagged</h3>
          <ul>
            {explanationList.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="feedback-box">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional analyst notes"
          />
        </div>

        <div className="modal-actions">
          <button className="button secondary" onClick={() => submit('FALSE_ALARM')}>
            ❌ False Alarm
          </button>
          <button className="button primary" onClick={() => submit('CONFIRMED')}>
            ✅ Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default RiskModal;
