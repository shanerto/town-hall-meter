import { useState, useEffect } from 'react';
import { adminApi } from '../api.js';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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

// ── Week list ──────────────────────────────────────────────────────────────────

function WeekRow({ week, onClick }) {
  const totalResponses = week.townHalls.reduce((s, th) => s + th.totalResponses, 0);
  const ratedThs = week.townHalls.filter((th) => th.average != null);
  const avg = ratedThs.length > 0
    ? ratedThs.reduce((s, th) => s + th.average, 0) / ratedThs.length
    : null;

  return (
    <button className="week-row" onClick={onClick}>
      <div className="week-row-label">{week.weekLabel}</div>
      <div className="week-row-meta">
        {avg != null
          ? <span className="score-badge">{avg.toFixed(1)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
        }
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
        </span>
      </div>
      <span className="week-row-chevron">›</span>
    </button>
  );
}

// ── Week detail ────────────────────────────────────────────────────────────────

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

// ── Main AdminView ─────────────────────────────────────────────────────────────

export function AdminView({ onBack }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('thm_admin_token') || '');
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    adminApi.getResults(token)
      .then(setWeeks)
      .finally(() => setLoading(false));
  }, [token]);

  function handleLogin(t) {
    sessionStorage.setItem('thm_admin_token', t);
    setToken(t);
  }

  function handleLogout() {
    sessionStorage.removeItem('thm_admin_token');
    setToken('');
    setWeeks([]);
    setSelectedWeek(null);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await adminApi.downloadExport(token);
    } finally {
      setExporting(false);
    }
  }

  if (!token) return <LoginForm onLogin={handleLogin} />;

  const currentWeek = weeks.find((w) => w.weekKey === selectedWeek);

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <div>
          {selectedWeek ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedWeek(null)}>← All weeks</button>
          ) : (
            <h1 className="admin-heading">Admin Dashboard</h1>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          {onBack && !selectedWeek && (
            <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      ) : selectedWeek && currentWeek ? (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
            {currentWeek.weekLabel}
          </h2>
          {currentWeek.townHalls.map((th) => (
            <TownHallResult key={th.id} th={th} />
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
          No results yet.
        </div>
      ) : (
        <div className="week-list">
          {weeks.map((w) => (
            <WeekRow key={w.weekKey} week={w} onClick={() => setSelectedWeek(w.weekKey)} />
          ))}
        </div>
      )}
    </div>
  );
}
