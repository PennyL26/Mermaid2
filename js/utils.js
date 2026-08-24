// ============================================================
// utils.js — small, pure, dependency-free helper functions.
// No app state lives here. Every function is deterministic
// given its inputs (except the RNG-based shuffle, which is
// explicitly randomized on purpose).
// ============================================================

/**
 * Unbiased Fisher-Yates (Knuth) shuffle. Returns a NEW array;
 * does not mutate the input. This is the only shuffle mechanism
 * used anywhere in the app (never Array.sort with a random
 * comparator, which is a biased shuffle).
 * @param {Array} arr
 * @returns {Array} shuffled copy
 */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks exactly n distinct elements from arr using an unbiased
 * partial Fisher-Yates shuffle, then returns the first n.
 * @param {Array} arr
 * @param {number} n
 */
export function pickRandomN(arr, n) {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, n);
}

/** Clamp a number between min and max (inclusive). */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** True if value is a finite number (rejects NaN, Infinity, strings). */
export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/** True if value is a positive integer (>= 1). */
export function isPositiveInteger(value) {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 1;
}

/** Trims a value to a string; returns '' for null/undefined. */
export function safeTrim(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Normalizes a TRUE/FALSE cell value per spec section 11.
 * Accepts case-insensitive, whitespace-padded TRUE/FALSE.
 * Returns 'TRUE', 'FALSE', or null if invalid.
 */
export function normalizeBoolAnswer(raw) {
  const trimmed = safeTrim(raw).toUpperCase();
  if (trimmed === 'TRUE') return 'TRUE';
  if (trimmed === 'FALSE') return 'FALSE';
  return null;
}

/** Formats a Date as YYYYMMDD_HHMMSS for export filenames. */
export function formatTimestampForFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    '_' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Triggers a browser download of a text blob.
 * @param {string} filename
 * @param {string} content
 * @param {string} mimeType
 */
export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  // Prepend BOM so Excel opens UTF-8 CSVs with Greek text correctly.
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Escapes a value for safe inclusion in a CSV cell. */
export function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Simple environment check used for logging verbosity (section 62). */
export function isDevelopmentEnvironment() {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '' || host === '[::1]';
}

/**
 * Lightweight logger gated by environment. In production only
 * warnings/errors are printed; in development everything is.
 */
export const log = {
  dev(...args) {
    if (isDevelopmentEnvironment()) console.log('[dev]', ...args);
  },
  warn(...args) {
    console.warn(...args);
  },
  error(...args) {
    console.error(...args);
  },
};
