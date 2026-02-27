import { useState, useRef } from 'react';

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

function ratingToPercent(rating) {
  return ((rating - 1) / 4) * 100;
}

function percentToRating(percent) {
  return Math.round((Math.max(0, Math.min(100, percent)) / 100) * 4) + 1;
}

export function VotingCard({ townHall, onVote, previousRating = null }) {
  const [selected, setSelected] = useState(previousRating);
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const trackRef = useRef(null);
  const isUpdate = previousRating !== null;

  function getRatingFromClientX(clientX) {
    const rect = trackRef.current.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    return percentToRating(percent);
  }

  function handleTrackMouseDown(e) {
    if (submitting) return;
    e.preventDefault();
    setSelected(getRatingFromClientX(e.clientX));

    function onMouseMove(ev) {
      setSelected(getRatingFromClientX(ev.clientX));
    }
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function handleTrackTouchStart(e) {
    if (submitting) return;
    setSelected(getRatingFromClientX(e.touches[0].clientX));

    function onTouchMove(ev) {
      ev.preventDefault();
      setSelected(getRatingFromClientX(ev.touches[0].clientX));
    }
    function onTouchEnd() {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  }

  async function handleSubmit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 80));
    onVote(selected);
  }

  const thumbPercent = selected !== null ? ratingToPercent(selected) : 50;
  const hasSelection = selected !== null;
  const selectedOption = OPTIONS.find((o) => o.rating === selected);

  return (
    <div className="page">
      <div className="card">
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

        <div className="question">How valuable was today's Town Hall?</div>

        {/* Emojis above track */}
        <div className="slider-emoji-row" aria-hidden="true">
          {OPTIONS.map((opt) => (
            <span
              key={opt.rating}
              className={`slider-emoji${selected === opt.rating ? ' active' : ''}`}
            >
              {opt.emoji}
            </span>
          ))}
        </div>

        {/* Track */}
        <div
          className="slider-container"
          role="slider"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={selected ?? undefined}
          aria-label="Rating"
          tabIndex={0}
          onKeyDown={(e) => {
            if (submitting) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setSelected((s) => Math.min(5, (s ?? 0) + 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setSelected((s) => Math.max(1, (s ?? 6) - 1));
            }
          }}
        >
          <div
            ref={trackRef}
            className="slider-track"
            onMouseDown={handleTrackMouseDown}
            onTouchStart={handleTrackTouchStart}
          >
            {/* Filled portion */}
            <div
              className={`slider-fill${hasSelection ? ' visible' : ''}`}
              style={{ width: `${thumbPercent}%` }}
            />

            {/* Snap dots */}
            {OPTIONS.map((opt) => (
              <div
                key={opt.rating}
                className={`slider-dot${hasSelection && opt.rating <= selected ? ' active' : ''}`}
                style={{ left: `${ratingToPercent(opt.rating)}%` }}
              />
            ))}

            {/* Thumb */}
            <div
              className={`slider-thumb${hasSelection ? ' active' : ''}`}
              style={{ left: `${thumbPercent}%` }}
            />
          </div>
        </div>

        {/* Labels below track */}
        <div className="slider-label-row" aria-hidden="true">
          {OPTIONS.map((opt) => (
            <span
              key={opt.rating}
              className={`slider-label-item${selected === opt.rating ? ' active' : ''}`}
            >
              {opt.label}
            </span>
          ))}
        </div>

        {/* Helper text */}
        <div className="slider-helper" aria-live="polite">
          {selectedOption ? `Selected: ${selectedOption.label}` : '\u00A0'}
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary slider-submit"
          onClick={handleSubmit}
          disabled={!hasSelection || submitting}
        >
          {isUpdate ? 'Update rating' : 'Lock it in'}
        </button>
      </div>
    </div>
  );
}
