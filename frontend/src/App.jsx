import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import { VotingCard } from './components/VotingCard.jsx';
import { ConfirmationView } from './components/ConfirmationView.jsx';
import { ResultsView } from './components/ResultsView.jsx';
import { AdminView } from './components/AdminView.jsx';

// Simple hash-based routing
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const isAdmin = hash === '#admin';

  const [view, setView] = useState('loading'); // 'loading' | 'voting' | 'confirming' | 'results'
  const [townHall, setTownHall] = useState(null);
  const [lastRating, setLastRating] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const loadResults = useCallback(async (thId) => {
    try {
      const data = await api.getResults(thId);
      setResults(data);
      setView('results');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) return;

    async function init() {
      try {
        const th = await api.getCurrentTownHall();
        setTownHall(th);

        const status = await api.getVoteStatus(th.id);
        if (status.hasVoted) {
          await loadResults(th.id);
        } else {
          setView('voting');
        }
      } catch (err) {
        setError(err.message || 'Could not connect to server.');
      }
    }

    init();
  }, [isAdmin, loadResults]);

  async function handleVote(rating) {
    setLastRating(rating);
    setView('confirming');
    try {
      await api.submitVote(townHall.id, rating);
    } catch (err) {
      if (err.status === 409) {
        // Already voted — go straight to results
        await loadResults(townHall.id);
        return;
      }
      setError(err.message);
    }
  }

  async function handleConfirmationDone() {
    if (townHall) await loadResults(townHall.id);
  }

  if (isAdmin) {
    return (
      <>
        <nav className="nav">
          <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}>
            ← Voting
          </a>
        </nav>
        <AdminView onBack={() => { window.location.hash = ''; }} />
      </>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Something went wrong</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (view === 'loading') {
    return (
      <div className="loading-page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <nav className="nav">
        <a
          className="nav-link"
          href="#admin"
          onClick={(e) => { e.preventDefault(); window.location.hash = 'admin'; }}
        >
          Admin
        </a>
      </nav>

      {view === 'voting' && (
        <VotingCard townHall={townHall} onVote={handleVote} />
      )}

      {view === 'confirming' && (
        <ConfirmationView rating={lastRating} onDone={handleConfirmationDone} />
      )}

      {view === 'results' && results && (
        <ResultsView results={results} />
      )}
    </>
  );
}
