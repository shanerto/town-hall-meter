import { useState, useEffect, useRef } from 'react';
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
        <div className="admin-login-title">Admin Login</div>
        <form onSubmit={handleSubmit} className="admin-form">
          <input
            id="token"
            type="password"
            className="form-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter password"
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Log In</button>
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
        <span className="week-row-score">{avg != null ? avg.toFixed(1) : '—'}</span>
        <span className="week-row-responses">
          {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
        </span>
      </div>
      <span className="week-row-chevron">›</span>
    </button>
  );
}

// ── Trend chart ────────────────────────────────────────────────────────────────

const CHART_W = 560;
const CHART_H = 180;
const ML = 36, MR = 16, MT = 12, MB = 32;
const CW = CHART_W - ML - MR;
const CH = CHART_H - MT - MB;

function TrendChart({ data }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length < 1) return null;

  const xOf = (i) => data.length === 1 ? ML + CW / 2 : ML + (i / (data.length - 1)) * CW;
  const yOf = (avg) => MT + ((5 - avg) / 4) * CH;

  const hasLine = data.length >= 2;
  const linePath = hasLine
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.avg).toFixed(1)}`).join(' ')
    : null;
  const areaPath = hasLine
    ? [
        `M${xOf(0).toFixed(1)},${yOf(data[0].avg).toFixed(1)}`,
        ...data.slice(1).map((d, i) => `L${xOf(i + 1).toFixed(1)},${yOf(d.avg).toFixed(1)}`),
        `L${xOf(data.length - 1).toFixed(1)},${(MT + CH).toFixed(1)}`,
        `L${xOf(0).toFixed(1)},${(MT + CH).toFixed(1)}`,
        'Z',
      ].join(' ')
    : null;

  const step = data.length <= 8 ? 1 : data.length <= 16 ? 2 : 3;

  function tooltipStyle(x, y) {
    const pctX = (x / CHART_W) * 100;
    const pctY = (y / CHART_H) * 100;
    const xShift = x / CHART_W < 0.25 ? '8px' : x / CHART_W > 0.75 ? 'calc(-100% - 8px)' : '-50%';
    return {
      left: `${pctX}%`,
      top: `${pctY}%`,
      transform: `translate(${xShift}, calc(-100% - 10px))`,
    };
  }

  return (
    <div className="trend-chart-wrap">
      <div className="trend-chart-header">
        <span className="trend-chart-title">6-Month Trend</span>
        <span className="trend-chart-sub">Average weekly score</span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="trend-svg"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((r) => (
            <g key={r}>
              <line x1={ML} y1={yOf(r)} x2={ML + CW} y2={yOf(r)} stroke="#e5e7eb" strokeWidth="1" />
              <text x={ML - 6} y={yOf(r)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9ca3af">{r}</text>
            </g>
          ))}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="rgba(99,102,241,0.08)" />}

          {/* Line */}
          {linePath && <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % step !== 0 && i !== data.length - 1) return null;
            return (
              <text key={i} x={xOf(i)} y={CHART_H - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">
                {d.shortLabel}
              </text>
            );
          })}

          {/* Dots */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={xOf(i)}
              cy={yOf(d.avg)}
              r="5"
              fill="#6366f1"
              stroke="#ffffff"
              strokeWidth="2"
              style={{ cursor: 'default' }}
              onMouseEnter={() => setTooltip({ d, x: xOf(i), y: yOf(d.avg) })}
            />
          ))}
        </svg>

        {tooltip && (
          <div className="chart-tooltip" style={tooltipStyle(tooltip.x, tooltip.y)}>
            <div className="chart-tooltip-label">{tooltip.d.weekLabel}</div>
            <div className="chart-tooltip-score">{tooltip.d.avg.toFixed(1)} / 5</div>
            <div className="chart-tooltip-responses">
              {tooltip.d.totalResponses} {tooltip.d.totalResponses === 1 ? 'response' : 'responses'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Week detail ────────────────────────────────────────────────────────────────

const EMOJIS_LIST = ['😕', '🙂', '😐', '😄', '🚀'];

function DistributionBars({ distribution }) {
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  return (
    <div className="distribution">
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
    <div className="th-result">
      {/* Title block */}
      <div className="results-header">
        <div className="results-title">{th.title || 'Town Hall'}</div>
        <div className="results-date">{formatDate(th.date)}</div>
      </div>

      <div className="section-divider" />

      {/* Metrics */}
      <div className="results-stats">
        <div className="stat">
          <span className="stat-value">{th.average != null ? th.average.toFixed(1) : '—'}</span>
          <span className="stat-label">avg rating</span>
        </div>
        <div className="stat">
          <span className="stat-value">{th.totalResponses}</span>
          <span className="stat-label">responses</span>
        </div>
      </div>

      <div className="section-divider" />

      {/* Ratings breakdown */}
      <DistributionBars distribution={th.distribution} />

      <div className="section-divider" />

      {/* Comments */}
      {th.comments.length > 0 ? (
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
      ) : (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
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

  // 6-month rolling trend: oldest → newest, only weeks with votes
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const trendData = [...weeks]
    .reverse()
    .filter((w) => new Date(w.weekStart + 'T12:00:00') >= sixMonthsAgo)
    .map((w) => {
      const totalResponses = w.townHalls.reduce((s, th) => s + th.totalResponses, 0);
      const weightedSum = w.townHalls.reduce((s, th) => s + (th.average ?? 0) * th.totalResponses, 0);
      const avg = totalResponses > 0 ? weightedSum / totalResponses : null;
      const d = new Date(w.weekStart + 'T12:00:00');
      d.setDate(d.getDate() + 2); // Monday → Wednesday
      const shortLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { weekKey: w.weekKey, weekLabel: w.weekLabel, shortLabel, avg, totalResponses };
    })
    .filter((d) => d.avg !== null);

  return (
    <div className="admin-page">
      <div className="admin-panel">
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
          {currentWeek.townHalls.map((th) => (
            <TownHallResult key={th.id} th={th} />
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
          No results yet.
        </div>
      ) : (
        <>
          <TrendChart data={trendData} />
          <div className="week-list">
            {weeks.map((w) => (
              <WeekRow key={w.weekKey} week={w} onClick={() => setSelectedWeek(w.weekKey)} />
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
