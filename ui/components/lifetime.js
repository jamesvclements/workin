/** Own listeners, observers, timers, and frames for one mounted view. */
export function createLifetime() {
  const lifetime = new AbortController();
  const observers = [],
    timeouts = new Set(),
    frames = new Set();
  return {
    lifetime,
    listen: (target, type, fn, options = {}) =>
      target.addEventListener(type, fn, {
        ...options,
        signal: lifetime.signal,
      }),
    setTimeout(fn, ms) {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        if (!lifetime.signal.aborted) fn();
      }, ms);
      timeouts.add(id);
      return id;
    },
    clearTimeout(id) {
      window.clearTimeout(id);
      timeouts.delete(id);
    },
    requestAnimationFrame(fn) {
      const id = window.requestAnimationFrame((time) => {
        frames.delete(id);
        if (!lifetime.signal.aborted) fn(time);
      });
      frames.add(id);
      return id;
    },
    cancelAnimationFrame(id) {
      window.cancelAnimationFrame(id);
      frames.delete(id);
    },
    ResizeObserver: class extends window.ResizeObserver {
      constructor(fn) {
        super(fn);
        observers.push(this);
      }
    },
    destroy() {
      lifetime.abort();
      for (const id of timeouts) window.clearTimeout(id);
      for (const id of frames) window.cancelAnimationFrame(id);
      for (const observer of observers) observer.disconnect();
      timeouts.clear();
      frames.clear();
    },
  };
}
