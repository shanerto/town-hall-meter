import { useState } from 'react';
import { api } from '../api.js';
import { Confetti } from './Confetti.jsx';
import { AnimatedEmoji } from './AnimatedEmoji.jsx';

const RATING_TO_OPTION = { 1: 'snooze', 2: 'fine', 3: 'goodstuff', 4: 'strong', 5: 'crushedit' };

const COMMENT_PROMPTS = {
  1: 'What made it feel like a snooze?',
  2: 'What could have made it better?',
  3: 'What worked well today?',
  4: 'What stood out most?',
  5: 'What made this one great?',
};

export function ConfirmationView({ rating, townHallId, previousComment }) {
  const [comment, setComment] = useState(previousComment || '');
  const [commentOpen, setCommentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const isRocket = rating === 5;

  async function handleSend() {
    setSaving(true);
    try {
      await api.submitComment(townHallId, comment.trim() || null);
    } catch {
      // Best-effort — still show sent so the user isn't stuck
    } finally {
      setSaving(false);
      setSent(true);
    }
  }

  return (
    <>
      <Confetti active={isRocket} />
      <div className="page">
        <div className="card confirmation">
          <div className="confirmation-emoji-badge">
            <AnimatedEmoji
              option={RATING_TO_OPTION[rating] ?? 'crushedit'}
              mode="loop"
              size={56}
              className="confirmation-emoji"
            />
          </div>
          <div className="confirmation-message">Thanks — see you next week.</div>
          <div className="vote-recorded">Your vote has been recorded.</div>

          {sent ? (
            <div className="comment-sent">Comment sent.</div>
          ) : commentOpen ? (
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
                autoFocus
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
          ) : (
            <button className="comment-trigger" onClick={() => setCommentOpen(true)}>
              Want to leave a comment?
            </button>
          )}
        </div>
      </div>
    </>
  );
}
