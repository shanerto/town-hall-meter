import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api.js';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function ScoreDots({ avg }) {
  if (!avg) return <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>;
  return <span className="score-badge">{avg.toFixed(1)}</span>;
}

function LoginForm({ onLogin }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await adminApi.getTownHalls(token.trim());
      onLogin(token.trim());
    } catch {
      setError('Invalid admin token. Please try again.');
    }
  }

  return (
    <div className="page admin-login">
      <div className="card">
        <div className="admin-login-title">Admin Access</div>
        <div className="admin-login-sub">Enter your admin token to continue.</div>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label className="form-label" htmlFor="token">Admin Token</label>
            <input
              id="token"
              type="password"
              className="form-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter token"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary">Sign In</button>
          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  );
}


function TownHallRow({ row, token, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(row.date);
  const [title, setTitle] = useState(row.title || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await adminApi.updateTownHall(token, row.id, { date, title: title || null });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete Town Hall on ${row.date}? This will remove all votes.`)) return;
    await adminApi.deleteTownHall(token, row.id);
    onRefresh();
  }

  if (editing) {
    return (
      <tr>
        <td>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </td>
        <td>
          <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        </td>
        <td><ScoreDots avg={row.average} /></td>
        <td>{row.total_responses}</td>
        <td>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? '…' : 'Save'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>{formatDate(row.date)}</td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{row.title || '—'}</td>
      <td><ScoreDots avg={row.average} /></td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{row.total_responses}</td>
      <td>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
        </div>
      </td>
    </tr>
  );
}

// ── Results tab ────────────────────────────────────────────────────────────────

const EMOJIS_LIST = ['😕', '🙂', '😐', '😄', '🚀'];

function DistributionBars({ distribution }) {
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  return (
    <div className="distribution" style={{ marginBottom: '1rem' }}>
      {distribution.map((d) => (
        <div key={d.rating} className="dist-row">
          <span className="dist-emoji">{d.emoji}</span>
          <span className="dist-label">{d.label}</span>
          <div className="dist-bar-track">
            <div className="dist-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} />
          </div>
          <span className="dist-count">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function TownHallResult({ th }) {
  const [ratingFilter, setRatingFilter] = useState(null);

  const filteredComments = ratingFilter
    ? th.comments.filter((c) => c.rating === ratingFilter)
    : th.comments;

  const usedRatings = [...new Set(th.comments.map((c) => c.rating))].sort();

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="results-header" style={{ marginBottom: '1rem' }}>
        <div className="results-title">{th.title || 'Town Hall'}</div>
        <div className="results-date">{formatDate(th.date)}</div>
      </div>

      <div className="results-stats" style={{ marginBottom: '1.25rem' }}>
        <div className="stat">
          <span className="stat-value">{th.average != null ? th.average.toFixed(1) : '—'}</span>
          <span className="stat-label">avg rating</span>
        </div>
        <div className="stat">
          <span className="stat-value">{th.totalResponses}</span>
          <span className="stat-label">responses</span>
        </div>
      </div>

      <DistributionBars distribution={th.distribution} />

      {th.comments.length > 0 && (
        <div className="comments-section">
          <div className="comments-heading">
            Comments ({th.comments.length})
          </div>

          {usedRatings.length > 1 && (
            <div className="rating-filter">
              <button
                className={`btn btn-sm ${ratingFilter === null ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRatingFilter(null)}
              >
                All
              </button>
              {usedRatings.map((r) => (
                <button
                  key={r}
                  className={`btn btn-sm ${ratingFilter === r ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setRatingFilter(ratingFilter === r ? null : r)}
                >
                  {EMOJIS_LIST[r - 1]}
                </button>
              ))}
            </div>
          )}

          <div className="comments-list">
            {filteredComments.map((c, i) => (
              <div key={i} className="comment-item">
                <div className="comment-meta">
                  <span className="comment-emoji-badge">{c.emoji}</span>
                  <span className="comment-time">{formatDateTime(c.timestamp)}</span>
                </div>
                <div className="comment-text">{c.comment}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {th.comments.length === 0 && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          No comments for this town hall.
        </div>
      )}
    </div>
  );
}

function ResultsTab({ token }) {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await adminApi.getResults(token);
        setWeeks(data);
        if (data.length > 0) setSelectedWeek(data[0].weekKey);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const currentWeek = weeks.find((w) => w.weekKey === selectedWeek);

  if (loading) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
        No results yet.
      </div>
    );
  }

  return (
    <div>
      <div className="week-selector">
        <label className="form-label" htmlFor="week-select" style={{ marginBottom: '0.375rem', display: 'block' }}>
          Calendar week
        </label>
        <select
          id="week-select"
          className="form-input"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          style={{ maxWidth: '320px' }}
        >
          {weeks.map((w) => (
            <option key={w.weekKey} value={w.weekKey}>
              {w.weekLabel} ({w.weekKey})
            </option>
          ))}
        </select>
      </div>

      {currentWeek && currentWeek.townHalls.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No town halls this week.</div>
      )}

      {currentWeek && currentWeek.townHalls.map((th) => (
        <TownHallResult key={th.id} th={th} />
      ))}
    </div>
  );
}

// ── Main AdminView ─────────────────────────────────────────────────────────────

export function AdminView({ onBack }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('thm_admin_token') || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'results'

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.getTownHalls(token);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  function handleLogin(t) {
    sessionStorage.setItem('thm_admin_token', t);
    setToken(t);
  }

  function handleLogout() {
    sessionStorage.removeItem('thm_admin_token');
    setToken('');
    setRows([]);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await adminApi.downloadExport(token);
    } finally {
      setExporting(false);
    }
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div>
          <h1 className="admin-heading">Admin Dashboard</h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
            Town Hall Meter
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {onBack && (
            <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage
        </button>
        <button
          className={`admin-tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      {activeTab === 'manage' && (
        <>
          <div className="card">
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
              ALL TOWN HALLS
            </h2>

            {loading ? (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : rows.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
                No town halls yet. The next one will be created automatically on Sunday.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Avg Score</th>
                      <th>Responses</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <TownHallRow key={row.id} row={row} token={token} onRefresh={load} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'results' && (
        <ResultsTab token={token} />
      )}
    </div>
  );
}
