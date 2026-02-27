import { useState } from 'react';

const OPTIONS = [
  { rating: 1, emoji: '😕', label: 'Not it' },
  { rating: 2, emoji: '🙂', label: 'Okay-ish' },
  { rating: 3, emoji: '😐', label: 'Did the job' },
  { rating: 4, emoji: '😄', label: 'Really good' },
  { rating: 5, emoji: '🚀', label: "Let's go" },
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function VotingCard({ townHall, onVote }) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSelect(option) {
    if (submitting || selected !== null) return;
    setSelected(option.rating);
    setSubmitting(true);

    // Small delay for the animation to feel intentional
    await new Promise((r) => setTimeout(r, 200));
    onVote(option.rating);
  }

  return (
    <div className="page">
      <div className="card">
        <div className="app-header">
          <div className="app-title">Town Hall Meter</div>
          {townHall && (
            <div className="app-date">{formatDate(townHall.date)}</div>
          )}
        </div>

        <div className="question">How valuable was today's Town Hall?</div>

        <div className="emoji-options" role="group" aria-label="Rating options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.rating}
              className={`emoji-option${selected === opt.rating ? ' selected' : ''}`}
              onClick={() => handleSelect(opt)}
              disabled={submitting}
              aria-label={`${opt.emoji} ${opt.label}`}
              aria-pressed={selected === opt.rating}
            >
              <span className="emoji-glyph" aria-hidden="true">{opt.emoji}</span>
              <span className="emoji-label">{opt.label}</span>
              <span className="emoji-underline" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
