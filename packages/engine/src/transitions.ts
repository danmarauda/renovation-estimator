interface Transition {
  duration: number;
  elapsed: number;
  step: (progress: number) => void;
  done?: () => void;
}

export interface TransitionOptions {
  reducedMotion?: boolean;
  invalidate?: () => void;
}

export function createTransitions({ reducedMotion = false, invalidate = () => {} }: TransitionOptions = {}) {
  const transitions = new Map<string, Transition>();

  return {
    get size() { return transitions.size; },
    has(key: string) { return transitions.has(key); },
    cancel(key: string) { return transitions.delete(key); },
    clear() { transitions.clear(); },
    start(key: string, duration: number, step: (progress: number) => void, done?: () => void) {
      transitions.delete(key);
      if (reducedMotion || duration <= 0) {
        step(1);
        done?.();
      } else {
        transitions.set(key, { duration, elapsed: 0, step, done });
      }
      invalidate();
    },
    update(delta: number) {
      const active = transitions.size > 0;
      for (const [key, transition] of transitions) {
        transition.elapsed += Math.max(0, delta) * 1000;
        const progress = Math.min(1, transition.elapsed / transition.duration);
        if (progress === 1) transitions.delete(key);
        transition.step(progress);
        if (progress === 1) transition.done?.();
      }
      return active;
    },
  };
}
