import { useEffect, useRef, useState } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Counts a figure up on first paint.
 *
 * The point is not decoration: watching the collected-rent number climb to its
 * value draws the eye to the one number the page exists to report. It runs once
 * per value change, and not at all when the reader has asked for less motion —
 * in which case the final value is shown immediately.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) {
      setValue(target);
      previous.current = target;
      return;
    }

    const from = previous.current;
    const delta = target - from;
    if (delta === 0) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // Ease-out cubic: fast at first, settling into the final figure.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else previous.current = target;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
