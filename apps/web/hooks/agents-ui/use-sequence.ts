import { useEffect, useState } from 'react';

export function useSequence<T>(frames: T[], interval: number): T | undefined {
  const [tick, setTick] = useState<{ frames: T[]; index: number } | null>(null);
  useEffect(() => {
    if (frames.length < 2 || !Number.isFinite(interval) || interval <= 0) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: number | undefined;
    let index = 0;
    function update() {
      window.clearInterval(timer);
      if (!motion.matches && !document.hidden) timer = window.setInterval(() => {
        index = (index + 1) % frames.length;
        setTick({ frames, index });
      }, interval);
    }
    update(); motion.addEventListener('change', update); document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); motion.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
  }, [frames, interval]);
  return frames[tick?.frames === frames ? tick.index : 0];
}
