// ============================================================
// timer.js — a single-purpose, restartable countdown timer.
//
// Design goals driven by the spec:
//  - Section 17: elapsed time is derived from performance.now(),
//    never from counting setInterval ticks (ticks can drift/skip
//    when a tab is backgrounded).
//  - Section 25: onTick reports a 0..1 progress fraction so the
//    UI can render the timer bar purely from real elapsed time.
//  - Section 34/37: pause/resume/cancel are explicit, and at most
//    one requestAnimationFrame loop is ever in flight per timer
//    instance — cancel() always stops the loop.
//  - Section 30: onExpire fires exactly once per run.
// ============================================================

export class QuestionTimer {
  /**
   * @param {number} durationSeconds total countdown duration
   * @param {(fraction:number, remainingMs:number)=>void} onTick
   * @param {()=>void} onExpire called exactly once when time runs out
   */
  constructor(durationSeconds, onTick, onExpire) {
    this.durationMs = durationSeconds * 1000;
    this.onTick = onTick;
    this.onExpire = onExpire;

    this._rafId = null;
    this._startTimestamp = null; // performance.now() when this run segment started
    this._elapsedBeforePause = 0; // ms accumulated across prior run segments
    this._expired = false;
    this._running = false;
  }

  /** Starts the timer fresh (elapsed = 0). */
  start() {
    this._elapsedBeforePause = 0;
    this._expired = false;
    this._resumeInternal();
  }

  /** Resumes after a pause, continuing from the remaining time. */
  resume() {
    if (this._running || this._expired) return;
    this._resumeInternal();
  }

  _resumeInternal() {
    this._running = true;
    this._startTimestamp = performance.now();
    this._scheduleFrame();
  }

  /** Pauses the timer; elapsed time up to now is preserved. */
  pause() {
    if (!this._running) return;
    this._running = false;
    this._elapsedBeforePause = this._elapsedSoFar();
    this._cancelFrame();
  }

  /** Fully stops and discards this timer. Safe to call multiple times. */
  cancel() {
    this._running = false;
    this._cancelFrame();
  }

  _elapsedSoFar() {
    if (!this._running || this._startTimestamp === null) {
      return this._elapsedBeforePause;
    }
    return this._elapsedBeforePause + (performance.now() - this._startTimestamp);
  }

  _scheduleFrame() {
    this._cancelFrame();
    const step = () => {
      if (!this._running) return;
      const elapsed = this._elapsedSoFar();
      const remaining = Math.max(0, this.durationMs - elapsed);
      const fraction = this.durationMs > 0 ? 1 - remaining / this.durationMs : 1;

      this.onTick(Math.min(1, Math.max(0, fraction)), remaining);

      if (remaining <= 0) {
        if (!this._expired) {
          this._expired = true;
          this._running = false;
          this._cancelFrame();
          this.onExpire();
        }
        return;
      }
      this._rafId = requestAnimationFrame(step);
    };
    this._rafId = requestAnimationFrame(step);
  }

  _cancelFrame() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
}
