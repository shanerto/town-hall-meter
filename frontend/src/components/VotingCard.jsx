import { useState } from 'react';

const OPTIONS = [
  { rating: 1, emoji: '😕', label: 'Not it' },
  { rating: 2, emoji: '😐', label: 'Could be better' },
  { rating: 3, emoji: '🙂', label: 'Did the job' },
  { rating: 4, emoji: '😄', label: 'Really good' },
  { rating: 5, emoji: '🚀', label: "Let's go" },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function VotingCard({ townHall, onVote, previousRating = null }) {
  const [selected, setSelected] = useState(previousRating);
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const isUpdate = previousRating !== null;

  function handleSelect(rating) {
    if (submitting) return;
    setSelected(rating);
  }

  async function handleSubmit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 80));
    onVote(selected);
  }

  const selectedOption = OPTIONS.find((o) => o.rating === selected);

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
        <div className="question">How valuable was today's Town Hall?</div>

        {/* Emoji selector */}
        <div className="emoji-grid" role="group" aria-label="Rating options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.rating}
              className={`emoji-btn${selected === opt.rating ? ' selected' : ''}`}
              onClick={() => handleSelect(opt.rating)}
              disabled={submitting}
              aria-pressed={selected === opt.rating}
              aria-label={`${opt.label}`}
            >
              <div className="emoji-circle">
                <span className="emoji-glyph" aria-hidden="true">{opt.emoji}</span>
              </div>
              <span className="emoji-label">{opt.label}</span>
              <span className="emoji-dot" aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* Helper text */}
        <div className="vote-helper" aria-live="polite">
          {selectedOption ? `Selected: ${selectedOption.label}` : '\u00A0'}
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary vote-submit"
          onClick={handleSubmit}
          disabled={!selected || submitting}
        >
          {isUpdate ? 'Update rating' : 'Lock it in'}
        </button>

      </div>
    </div>
  );
}
