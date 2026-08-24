/**
 * Timer Management
 * High-precision timer with pause/resume support
 */

export class Timer {
    constructor(options = {}) {
        this.duration = options.duration || 15000; // Default 15 seconds
        this.onTick = options.onTick || null;
        this.onComplete = options.onComplete || null;
        this.onPause = options.onPause || null;
        this.onResume = options.onResume || null;
        
        this.startTime = 0;
        this.elapsed = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.isComplete = false;
        this.timerId = null;
        this.lastTimestamp = 0;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.isComplete = false;
        this.startTime = performance.now() - this.elapsed;
        this.lastTimestamp = this.startTime;
        
        this.tick();
    }

    tick() {
        if (!this.isRunning || this.isPaused) return;
        
        const now = performance.now();
        this.elapsed = now - this.startTime;
        const progress = Math.min(this.elapsed / this.duration, 1);
        
        if (this.onTick) {
            this.onTick(progress);
        }
        
        if (progress >= 1) {
            this.complete();
            return;
        }
        
        // Schedule next tick
        this.timerId = requestAnimationFrame(() => this.tick());
    }

    pause() {
        if (!this.isRunning || this.isPaused || this.isComplete) return;
        
        this.isPaused = true;
        if (this.timerId) {
            cancelAnimationFrame(this.timerId);
            this.timerId = null;
        }
        
        if (this.onPause) {
            this.onPause(this.elapsed / this.duration);
        }
    }

    resume() {
        if (!this.isRunning || !this.isPaused || this.isComplete) return;
        
        this.isPaused = false;
        this.startTime = performance.now() - this.elapsed;
        
        if (this.onResume) {
            this.onResume(this.elapsed / this.duration);
        }
        
        this.tick();
    }

    complete() {
        if (this.isComplete) return;
        
        this.isComplete = true;
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.timerId) {
            cancelAnimationFrame(this.timerId);
            this.timerId = null;
        }
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    reset() {
        this.stop();
        this.elapsed = 0;
        this.isComplete = false;
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.timerId) {
            cancelAnimationFrame(this.timerId);
            this.timerId = null;
        }
    }

    getProgress() {
        return Math.min(this.elapsed / this.duration, 1);
    }

    getRemaining() {
        return Math.max(0, this.duration - this.elapsed);
    }

    isPausedState() {
        return this.isPaused;
    }

    isRunningState() {
        return this.isRunning && !this.isPaused;
    }

    destroy() {
        this.stop();
        this.onTick = null;
        this.onComplete = null;
        this.onPause = null;
        this.onResume = null;
    }
}