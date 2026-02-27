import { useEffect } from 'react';
import { Confetti } from './Confetti.jsx';

const EMOJI_MAP = { 1: '😕', 2: '🙂', 3: '😐', 4: '😄', 5: '🚀' };

export function ConfirmationView({ rating, onDone }) {
  const isRocket = rating === 5;

  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      <Confetti active={isRocket} />
      <div className="page">
        <div className="card confirmation">
          <span className="confirmation-emoji" aria-hidden="true">
            {EMOJI_MAP[rating] || '😄'}
          </span>
          <div className="confirmation-message">Thanks — see you next week.</div>
          <div className="confirmation-sub">Loading results…</div>
        </div>
      </div>
    </>
  );
}
