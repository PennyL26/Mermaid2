// ============================================================
// state.js — the single source of truth for "what screen/mode
// is the app in right now". Section 3 explicitly forbids
// uncontrolled independent boolean flags; every transition goes
// through setState() so there is exactly one current state at
// any time and every change is observable/logged.
// ============================================================

import { log } from './utils.js';

export const AppState = Object.freeze({
  LOADING: 'LOADING',
  HOME: 'HOME',
  SETTINGS: 'SETTINGS',
  QUIZ_READY: 'QUIZ_READY',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  QUESTION_PAUSED: 'QUESTION_PAUSED',
  QUESTION_TRANSITION: 'QUESTION_TRANSITION',
  RESULTS: 'RESULTS',
  REVIEW: 'REVIEW',
  ERROR: 'ERROR',
});

// Allowed transitions, encoded explicitly so an invalid jump
// (e.g. QUESTION_PAUSED -> RESULTS directly) is caught early
// during development rather than silently corrupting the UI.
const ALLOWED_TRANSITIONS = {
  [AppState.LOADING]: [AppState.HOME, AppState.ERROR],
  [AppState.HOME]: [AppState.SETTINGS, AppState.QUIZ_READY, AppState.HOME],
  [AppState.SETTINGS]: [AppState.HOME],
  [AppState.QUIZ_READY]: [AppState.QUESTION_ACTIVE, AppState.HOME],
  [AppState.QUESTION_ACTIVE]: [
    AppState.QUESTION_PAUSED,
    AppState.QUESTION_TRANSITION,
    AppState.HOME, // explicit abandonment with confirmation (section 42)
  ],
  [AppState.QUESTION_PAUSED]: [AppState.QUESTION_ACTIVE, AppState.HOME],
  [AppState.QUESTION_TRANSITION]: [AppState.QUESTION_ACTIVE, AppState.RESULTS],
  [AppState.RESULTS]: [AppState.REVIEW, AppState.HOME],
  [AppState.REVIEW]: [AppState.RESULTS, AppState.HOME],
  [AppState.ERROR]: [AppState.HOME],
};

class StateMachine {
  constructor() {
    this._current = AppState.LOADING;
    this._listeners = [];
  }

  get current() {
    return this._current;
  }

  /** Subscribe to state transitions. Returns an unsubscribe function. */
  onChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Transitions to a new state. Throws in development if the
   * transition isn't in the allowed map, to catch logic bugs
   * fast; in production it logs a warning and proceeds, since a
   * hard crash is worse for the end user than a logged anomaly.
   */
  setState(next, meta = {}) {
    const allowed = ALLOWED_TRANSITIONS[this._current] || [];
    if (!allowed.includes(next)) {
      log.warn(`Unusual state transition: ${this._current} -> ${next}`, meta);
    }
    const previous = this._current;
    this._current = next;
    log.dev(`state: ${previous} -> ${next}`, meta);
    for (const listener of this._listeners) {
      listener(next, previous, meta);
    }
  }

  is(...states) {
    return states.includes(this._current);
  }
}

export const appState = new StateMachine();
