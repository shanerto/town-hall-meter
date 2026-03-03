import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

const OPTION_DATA = {
  snooze:    { emoji: '🥱', src: '/snooze.json' },
  fine:      { emoji: '🤷', src: '/fine.json' },
  goodstuff: { emoji: '🙂', src: '/goodstuff.json' },
  strong:    { emoji: '👏', src: '/strong.json' },
  crushedit: { emoji: '🚀', src: '/crushedit.json' },
};

// Module-level cache so fetched JSON survives remounts
const animCache = {};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * AnimatedEmoji
 *
 * Props:
 *   option   – one of: snooze | fine | goodstuff | strong | crushedit
 *   mode     – "hover"  → parent mounts this only while hovered; always plays immediately
 *              "loop"   → always mounted; plays looping animation
 *   size     – number (px). Both static emoji and Lottie use this exact size, preventing layout shift.
 *   className – forwarded to the outer wrapper span (e.g. for pop animation on confirm screen)
 */
export function AnimatedEmoji({ option, mode, size, className }) {
  const [animData, setAnimData] = useState(() => animCache[option] ?? null);
  const reducedMotion = usePrefersReducedMotion();

  const data = OPTION_DATA[option];

  useEffect(() => {
    if (reducedMotion) return;
    if (animCache[option]) {
      setAnimData(animCache[option]);
      return;
    }
    let cancelled = false;
    fetch(data.src)
      .then((r) => r.json())
      .then((d) => {
        animCache[option] = d;
        if (!cancelled) setAnimData(d);
      })
      .catch(() => {
        // Silently fall back to static emoji
      });
    return () => {
      cancelled = true;
    };
  }, [option, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const px = size ? `${size}px` : '100%';
  const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: px,
    height: px,
    flexShrink: 0,
  };

  const shouldAnimate = !reducedMotion && animData !== null;

  return (
    <span className={className} style={wrapperStyle} aria-hidden="true">
      {shouldAnimate ? (
        <Lottie
          animationData={animData}
          autoplay
          loop
          style={{ width: px, height: px }}
        />
      ) : (
        <span style={{ fontSize: 'inherit', lineHeight: 1, display: 'block', userSelect: 'none' }}>
          {data.emoji}
        </span>
      )}
    </span>
  );
}
