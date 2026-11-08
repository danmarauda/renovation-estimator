export function createTransitions({ reducedMotion = false, invalidate = () => {} } = {}) {
  const transitions = new Map();

  return {
    get size() { return transitions.size; },
    has(key) { return transitions.has(key); },
    cancel(key) { return transitions.delete(key); },
    clear() { transitions.clear(); },
    start(key, duration, step, done) {
      transitions.delete(key);
      if (reducedMotion || duration <= 0) {
        step(1);
        done?.();
      } else {
        transitions.set(key, { duration, elapsed: 0, step, done });
      }
      invalidate();
    },
    update(delta) {
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
