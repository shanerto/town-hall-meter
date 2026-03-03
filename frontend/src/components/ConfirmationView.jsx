import { useState } from 'react';
import { api } from '../api.js';
import { Confetti } from './Confetti.jsx';

const EMOJI_MAP = { 1: '🥱', 2: '🤷', 3: '🙂', 4: '👏', 5: '🚀' };

const COMMENT_PROMPTS = {
  1: 'What made it feel like a snooze?',
  2: 'What could have made it better?',
  3: 'What worked well today?',
  4: 'What stood out most?',
  5: 'What made this one great?',
};

export function ConfirmationView({ rating, townHallId, previousComment }) {
  const [comment, setComment] = useState(previousComment || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isRocket = rating === 5;

  async function handleSend() {
    setSaving(true);
    try {
      await api.submitComment(townHallId, comment.trim() || null);
    } catch {
      // Best-effort — still show saved so the user isn't stuck
    } finally {
      setSaving(false);
      setSaved(true);
    }
  }

  return (
    <>
      <Confetti active={isRocket} />
      <div className="page">
        <div className="card confirmation">
          <div className="confirmation-emoji-badge">
            <span className="confirmation-emoji" aria-hidden="true">
              {EMOJI_MAP[rating] || '😄'}
            </span>
          </div>
          <div className="confirmation-message">Thanks — see you next week.</div>

          {saved ? (
            <div className="comment-saved">✓ Saved</div>
          ) : (
            <div className="comment-section">
              <div key={rating} className="comment-prompt">
                {COMMENT_PROMPTS[rating] ?? 'Anything you want to add?'}
                <span className="comment-prompt-optional"> (Optional)</span>
              </div>
              <textarea
                className="form-input comment-textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts…"
                rows={3}
                disabled={saving}
              />
              <div className="comment-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSend}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
