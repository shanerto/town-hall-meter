import { useState } from 'react';
import { AnimatedEmoji } from './AnimatedEmoji.jsx';

const OPTIONS = [
  { rating: 1, label: 'Snooze',    lottieKey: 'snooze' },
  { rating: 2, label: 'Fine',       lottieKey: 'fine' },
  { rating: 3, label: 'Good stuff', lottieKey: 'goodstuff' },
  { rating: 4, label: 'Strong',     lottieKey: 'strong' },
  { rating: 5, label: 'Crushed it', lottieKey: 'crushedit' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function VotingCard({ townHall, onVote, previousRating = null }) {
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(null);

  async function handleSelect(rating) {
    if (submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 80));
    onVote(rating);
  }

  return (
    <div className="page">
      <div className="card">

        {/* Header */}
        <div className="app-header">
          {logoError ? (
            <span className="brand-logo-fallback">Town Hall Meter</span>
          ) : (
            <img
              src="/logo.png"
              alt="Town Hall"
              className="brand-logo"
              onError={() => setLogoError(true)}
            />
          )}
          {townHall && <div className="app-date">{formatDate(townHall.date)}</div>}
        </div>

        {/* Question */}
        <div className="question">{'How\u2019d we do today?'}</div>

        {/* Emoji selector */}
        <div className="emoji-grid" role="group" aria-label="Rating options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.rating}
              className="emoji-btn"
              onClick={() => handleSelect(opt.rating)}
              disabled={submitting}
              aria-label={opt.label}
              onMouseEnter={() => setHoveredRating(opt.rating)}
              onMouseLeave={() => setHoveredRating(null)}
            >
              <div className="emoji-circle">
                <AnimatedEmoji
                  option={opt.lottieKey}
                  mode="hover"
                  isHovered={hoveredRating === opt.rating}
                  size={42}
                />
              </div>
              <span className="emoji-label">{opt.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
