import { useState } from 'react';
import { AnimatedEmoji } from './AnimatedEmoji.jsx';

const RATING_TO_OPTION = { 1: 'snooze', 2: 'fine', 3: 'goodstuff', 4: 'strong', 5: 'crushedit' };

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const RATING_EMOJIS = ['😕', '🙂', '😐', '😄', '🚀'];

function ratingToEmoji(avg) {
  const idx = Math.min(4, Math.max(0, Math.round(avg) - 1));
  return RATING_EMOJIS[idx];
}

function TrendLine({ data }) {
  if (!data || data.length < 2) return null;

  const W = 480;
  const H = 110;
  const PAD = { top: 14, right: 16, bottom: 28, left: 28 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const xOf = (i) => PAD.left + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW);
  const yOf = (v) => PAD.top + iH - ((v - 1) / 4) * iH;

  const pts = data.map((d, i) => [xOf(i), yOf(d.average || 0)]);
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${(PAD.top + iH).toFixed(1)} L ${PAD.left} ${(PAD.top + iH).toFixed(1)} Z`;

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="Score trend"
    >
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0094D8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0094D8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis grid lines */}
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} y1={yOf(v)}
            x2={W - PAD.right} y2={yOf(v)}
            stroke="#f3f4f6" strokeWidth="1"
          />
          <text
            x={PAD.left - 6} y={yOf(v)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="9" fill="#d1d5db"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#trendFill)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#0094D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#0094D8" />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={xOf(i)} y={H - 4}
          textAnchor="middle"
          fontSize="8.5" fill="#9ca3af"
        >
          {formatDateShort(d.date)}
        </text>
      ))}
    </svg>
  );
}

function DistributionBar({ row, maxCount }) {
  const pct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

  return (
    <div className="dist-row">
      <AnimatedEmoji option={RATING_TO_OPTION[row.rating]} mode="hover" isHovered={false} size={28} />
      <span className="dist-label">{row.label}</span>
      <div className="dist-bar-track">
        <div className="dist-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="dist-count">{row.count}</span>
    </div>
  );
}

export function ResultsView({ results }) {
  const { townHall, average, totalResponses, distribution, trend } = results;
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="page">
      <div className="card">
        <div className="app-header">
          {logoError ? (
            <span className="brand-logo-fallback">Town Hall</span>
          ) : (
            <img
              src="/logo.png"
              alt="Town Hall"
              className="brand-logo"
              onError={() => setLogoError(true)}
            />
          )}
          <div className="app-date">{formatDate(townHall.date)}</div>
        </div>

        <div className="results-stats">
          <div className="stat">
            <span className="stat-emoji" aria-hidden="true">{ratingToEmoji(average)}</span>
            <span className="stat-value">{average ? average.toFixed(1) : '—'}</span>
            <span className="stat-label">avg score</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalResponses}</span>
            <span className="stat-label">responses</span>
          </div>
        </div>

        <div className="distribution" aria-label="Rating distribution">
          {distribution.map((row) => (
            <DistributionBar key={row.rating} row={row} maxCount={maxCount} />
          ))}
        </div>

        {trend && trend.length >= 2 && (
          <div className="trend-section">
            <div className="trend-title">Last {trend.length} Town Halls</div>
            <TrendLine data={trend} />
          </div>
        )}
      </div>
    </div>
  );
}
