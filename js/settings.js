// ============================================================
// settings.js — bridges the Settings screen's form controls to
// storage.js. Section 15: settings only ever affect the NEXT
// exam; an in-progress exam holds its own frozen snapshot
// (taken by quiz.js at construction time) and this module never
// touches that snapshot.
// ============================================================

import { loadSettings, saveSettings, QUESTION_TIME_MIN, QUESTION_TIME_MAX } from './storage.js';
import { isPositiveInteger, clamp } from './utils.js';

const PANEL_COLOR_HEX = {
  white: '#FFFFFF',
  pink: '#FFE4EC',
  yellow: '#FFF6D6',
  beige: '#F5EBDD',
};

export function panelColorToHex(colorKey) {
  return PANEL_COLOR_HEX[colorKey] || PANEL_COLOR_HEX.white;
}

/** Populates the Settings form fields from currently-saved settings. */
export function populateSettingsForm(els) {
  const s = loadSettings();
  els.questionTime.value = String(s.questionTimeSeconds);
  els.selectionMode.value = s.selectionMode;
  els.questionCount.value = String(s.questionCount);
  els.panelColor.value = s.panelColor;
  toggleQuestionCountVisibility(els);
  return s;
}

/** Shows/hides the question-count field per section 19. */
export function toggleQuestionCountVisibility(els) {
  const isSpecific = els.selectionMode.value === 'specific_random';
  els.questionCountRow.hidden = !isSpecific;
  els.questionCount.disabled = !isSpecific;
}

/**
 * Reads the form, clamps/validates values, and persists them.
 * Invalid numeric input is clamped into range rather than
 * silently rejected, so the user always ends up with something
 * sane instead of a confusing failure (section 16).
 */
export function readAndSaveSettingsForm(els) {
  let questionTimeSeconds = parseInt(els.questionTime.value, 10);
  if (!Number.isFinite(questionTimeSeconds)) questionTimeSeconds = 15;
  questionTimeSeconds = clamp(questionTimeSeconds, QUESTION_TIME_MIN, QUESTION_TIME_MAX);

  const selectionMode = els.selectionMode.value;

  let questionCount = parseInt(els.questionCount.value, 10);
  if (!isPositiveInteger(questionCount)) questionCount = 20;

  const panelColor = els.panelColor.value;

  const saved = saveSettings({
    questionTimeSeconds,
    selectionMode,
    questionCount,
    panelColor,
    timerBarColor: '#4CAF50',
  });

  // Reflect clamped values back into the form so the user sees
  // exactly what was saved.
  els.questionTime.value = String(saved.questionTimeSeconds);
  els.questionCount.value = String(saved.questionCount);

  return saved;
}
