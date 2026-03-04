import { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';

const OPTION_DATA = {
  // restFrame: frame to display when idle (paused still).
  // snooze uses frame 70 (~50% of 141) so the yawning hand-over-mouth pose
  // is visible instead of the neutral start frame.
  snooze:    { src: '/snooze.json',    restFrame: 70 },
  fine:      { src: '/fine.json',      restFrame: 0 },
  goodstuff: { src: '/goodstuff.json', restFrame: 0 },
  strong:    { src: '/strong.json',    restFrame: 0 },
  crushedit: { src: '/crushedit.json', restFrame: 0 },
};

// Module-level cache so each JSON file is fetched only once per session
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
 *   option     – snooze | fine | goodstuff | strong | crushedit
 *   mode       – "hover" | "loop"
 *   isHovered  – (hover mode) boolean from parent; true = play from frame 0, false = seek to restFrame
 *   size       – number (px); wrapper and Lottie use identical dimensions — no layout shift
 *   className  – forwarded to outer wrapper span
 *
 * Behavior:
 *   hover mode  – autoplay=false, loop=true; ref-controlled play/stop based on isHovered
 *   loop mode   – autoplay=true, loop=true (both disabled when prefers-reduced-motion)
 *
 * The Lottie JSON is always fetched (reduced-motion users still see the still frame).
 * A fixed-size empty span is rendered while the fetch is in flight.
 */
export function AnimatedEmoji({ option, mode, isHovered, size, className }) {
  const [animData, setAnimData] = useState(() => animCache[option] ?? null);
  const lottieRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  // Fetch animation data — always, so we can show frame 0 even with reduced motion
  useEffect(() => {
    if (animCache[option]) {
      if (!animData) setAnimData(animCache[option]);
      return;
    }
    let cancelled = false;
    fetch(OPTION_DATA[option].src)
      .then((r) => r.json())
      .then((d) => {
        animCache[option] = d;
        if (!cancelled) setAnimData(d);
      })
      .catch(() => {
        // Network failure — keep empty placeholder; no layout shift
      });
    return () => {
      cancelled = true;
    };
  }, [option]); // eslint-disable-line react-hooks/exhaustive-deps

  // Control playback for hover mode via ref.
  // `animData` is included so the effect re-fires after the Lottie mounts,
  // picking up any hover state that arrived before the data finished loading.
  useEffect(() => {
    if (mode !== 'hover' || !lottieRef.current) return;
    const restFrame = OPTION_DATA[option].restFrame;
    if (isHovered && !reducedMotion) {
      // Always start from the very beginning so the full gesture plays each time
      lottieRef.current.goToAndPlay(0, true);
    } else {
      // Return to (or stay at) the meaningful resting pose for this emoji
      lottieRef.current.goToAndStop(restFrame, true);
    }
  }, [isHovered, reducedMotion, mode, animData, option]);

  const px = size ? `${size}px` : '100%';
  const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: px,
    height: px,
    flexShrink: 0,
  };

  // Fixed-size placeholder while JSON is in flight
  if (!animData) {
    return <span className={className} style={wrapperStyle} aria-hidden="true" />;
  }

  // hover mode: never autoplay; loop=true so play() repeats while hovered
  // loop mode:  autoplay + loop unless user prefers reduced motion
  const autoplay = mode === 'loop' && !reducedMotion;
  const loop = mode === 'hover' ? true : !reducedMotion;

  return (
    <span className={className} style={wrapperStyle} aria-hidden="true">
      <Lottie
        lottieRef={lottieRef}
        animationData={animData}
        autoplay={autoplay}
        loop={loop}
        style={{ width: px, height: px }}
      />
    </span>
  );
}
