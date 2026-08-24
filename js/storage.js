// ============================================================
// storage.js — the ONLY module that touches localStorage.
// Centralizes default settings values (section 20) and
// validates anything read back, so corrupt/tampered
// localStorage can never crash the app (section 18 / test 18).
// ============================================================

import { isPositiveInteger, log } from './utils.js';

const STORAGE_KEY = 'karateQuizSettings.v1';

/** Section 20: defaults are centralized here, and only here. */
export const DEFAULT_SETTINGS = Object.freeze({
  questionTimeSeconds: 15,
  selectionMode: 'specific_random', // 'specific_random' | 'all_ordered' | 'all_random'
  questionCount: 20,
  panelColor: 'white', // 'white' | 'pink' | 'yellow' | 'beige'
  timerBarColor: '#4CAF50',
});

export const QUESTION_TIME_MIN = 4;
export const QUESTION_TIME_MAX = 60;

const VALID_SELECTION_MODES = ['specific_random', 'all_ordered', 'all_random'];
const VALID_PANEL_COLORS = ['white', 'pink', 'yellow', 'beige'];

/**
 * Validates a settings-shaped object field by field. Any invalid
 * field silently falls back to its default rather than rejecting
 * the whole object — this is more forgiving of partial corruption.
 */
function sanitizeSettings(raw) {
  const out = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return out;

  if (
    isPositiveInteger(raw.questionTimeSeconds) &&
    raw.questionTimeSeconds >= QUESTION_TIME_MIN &&
    raw.questionTimeSeconds <= QUESTION_TIME_MAX
  ) {
    out.questionTimeSeconds = raw.questionTimeSeconds;
  }

  if (VALID_SELECTION_MODES.includes(raw.selectionMode)) {
    out.selectionMode = raw.selectionMode;
  }

  if (isPositiveInteger(raw.questionCount)) {
    out.questionCount = raw.questionCount;
  }

  if (VALID_PANEL_COLORS.includes(raw.panelColor)) {
    out.panelColor = raw.panelColor;
  }

  if (typeof raw.timerBarColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.timerBarColor)) {
    out.timerBarColor = raw.timerBarColor;
  }

  return out;
}

/**
 * Reads settings from localStorage. Never throws. Falls back to
 * DEFAULT_SETTINGS (partially or wholly) on any corruption.
 */
export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return sanitizeSettings(parsed);
  } catch (err) {
    log.warn('Corrupt settings in localStorage, using defaults.', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persists settings to localStorage. Settings are sanitized
 * before writing so we never persist invalid data.
 */
export function saveSettings(settings) {
  const clean = sanitizeSettings(settings);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (err) {
    // Storage may be full or disabled (e.g. private browsing). The
    // app must keep working in-memory even if persistence fails.
    log.warn('Could not persist settings to localStorage.', err);
  }
  return clean;
}
