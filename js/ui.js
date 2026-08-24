// ============================================================
// ui.js — all direct DOM reads/writes live here. This module
// knows nothing about quiz rules or state transitions; it only
// renders data it's given and reports raw user gestures (click,
// swipe) back to the caller via callbacks. app.js is the only
// module that interprets what those gestures MEAN.
// ============================================================

import { panelColorToHex } from './settings.js';

/** Grabs every element the app needs, once, by id. */
export function queryElements() {
  const byId = (id) => document.getElementById(id);
  return {
    screens: {
      loading: byId('screen-loading'),
      home: byId('screen-home'),
      settings: byId('screen-settings'),
      quiz: byId('screen-quiz'),
      results: byId('screen-results'),
      review: byId('screen-review'),
      error: byId('screen-error'),
    },
    rotateOverlay: byId('screen-rotate'),
    home: {
      mermaidBg: byId('mermaid-bg'),
      affirmationText: byId('affirmation-text'),
      btnWelcomeStart: byId('btn-welcome-start'),
      homeMenu: byId('home-menu'),
      btnKumite: byId('btn-kumite'),
      btnKata: byId('btn-kata'),
      btnSettings: byId('btn-settings'),
      btnExit: byId('btn-exit'),
      exitMessage: byId('exit-message'),
      datasetStatus: byId('dataset-status'),
    },
    settingsForm: {
      questionTime: byId('input-question-time'),
      selectionMode: byId('select-selection-mode'),
      questionCount: byId('input-question-count'),
      questionCountRow: byId('row-question-count'),
      panelColor: byId('select-panel-color'),
      btnSave: byId('btn-settings-save'),
      btnBack: byId('btn-settings-back'),
    },
    quiz: {
      progressIndicator: byId('progress-indicator'),
      btnPause: byId('btn-pause'),
      questionPanel: byId('question-panel'),
      questionText: byId('question-text'),
      timerTrack: byId('timer-bar-track'),
      timerFill: byId('timer-bar-fill'),
      btnTrue: byId('btn-true'),
      btnFalse: byId('btn-false'),
      pauseOverlay: byId('pause-overlay'),
      btnResume: byId('btn-resume'),
      fadeOverlay: byId('fade-overlay'),
    },
    results: {
      total: byId('res-total'),
      correct: byId('res-correct'),
      wrong: byId('res-wrong'),
      unanswered: byId('res-unanswered'),
      percentage: byId('res-percentage'),
      btnReview: byId('btn-review'),
      btnExport: byId('btn-export'),
      btnHome: byId('btn-results-home'),
      reviewEmptyMsg: byId('review-empty-msg'),
    },
    review: {
      progress: byId('review-progress'),
      questionText: byId('review-question-text'),
      userAnswer: byId('review-user-answer'),
      correctAnswer: byId('review-correct-answer'),
      btnNext: byId('btn-review-next'),
      btnBack: byId('btn-review-back'),
    },
    error: {
      message: byId('error-message'),
      btnHome: byId('btn-error-home'),
    },
    confirm: {
      overlay: byId('confirm-dialog'),
      text: byId('confirm-text'),
      btnCancel: byId('btn-confirm-cancel'),
      btnOk: byId('btn-confirm-ok'),
    },
    offlineBanner: byId('offline-banner'),
  };
}

/** Shows exactly one top-level screen, hides all others. */
export function showScreen(els, key) {
  for (const [name, node] of Object.entries(els.screens)) {
    if (!node) continue;
    node.hidden = name !== key;
  }
}

/** Picks one of 13 mermaid background images at random (section 14). */
export function applyRandomMermaidBackground(els) {
  const n = Math.floor(Math.random() * 13) + 1;
  els.home.mermaidBg.style.backgroundImage = `url("assets/mermaid-${n}.png")`;
}

export function renderAffirmation(els, text) {
  els.home.affirmationText.textContent = text;
}

export function renderDatasetStatus(els, { kumiteOk, kataOk }) {
  const parts = [];
  if (!kumiteOk) parts.push('KUMITE: δεδομένα μη διαθέσιμα');
  if (!kataOk) parts.push('KATA: δεδομένα μη διαθέσιμα');
  els.home.datasetStatus.textContent = parts.join(' · ');
  els.home.btnKumite.disabled = !kumiteOk;
  els.home.btnKata.disabled = !kataOk;
}

export function applyPanelColor(els, panelColorKey) {
  els.quiz.questionPanel.style.background = panelColorToHex(panelColorKey);
}

export function renderQuestion(els, item, index, total) {
  els.quiz.questionText.textContent = item.question;
  els.quiz.progressIndicator.textContent = `Ερώτηση ${index + 1} / ${total}`;
  els.quiz.btnTrue.disabled = false;
  els.quiz.btnFalse.disabled = false;
  els.quiz.pauseOverlay.hidden = true;
  setTimerBar(els, 0, false);
}

/** fraction: 0..1 elapsed. paused: bool, forces the grey state. */
export function setTimerBar(els, fraction, paused) {
  const pct = Math.round(fraction * 100);
  els.quiz.timerFill.style.width = pct + '%';
  els.quiz.timerTrack.setAttribute('aria-valuenow', String(pct));

  const remaining = 1 - fraction;
  els.quiz.timerFill.classList.remove('state-warning', 'state-critical', 'state-paused');
  if (paused) {
    els.quiz.timerFill.classList.add('state-paused');
  } else if (remaining <= 0.10) {
    els.quiz.timerFill.classList.add('state-critical');
  } else if (remaining <= 0.25) {
    els.quiz.timerFill.classList.add('state-warning');
  }
}

export function setAnswerButtonsEnabled(els, enabled) {
  els.quiz.btnTrue.disabled = !enabled;
  els.quiz.btnFalse.disabled = !enabled;
}

export function showPauseOverlay(els, show) {
  els.quiz.pauseOverlay.hidden = !show;
}

/** Runs the section-33 fade transition. Resolves after the full duration. */
export function runFadeTransition(els, durationMs = 2000) {
  const overlay = els.quiz.fadeOverlay;
  return new Promise((resolve) => {
    overlay.classList.add('fade-active');
    setTimeout(() => {
      overlay.classList.remove('fade-active');
      resolve();
    }, durationMs);
  });
}

export function renderResults(els, results) {
  els.results.total.textContent = String(results.total);
  els.results.correct.textContent = String(results.correct);
  els.results.wrong.textContent = String(results.wrong);
  els.results.unanswered.textContent = String(results.unanswered);
  els.results.percentage.textContent = results.percentage.toFixed(1) + '%';

  const hasReviewable = results.wrong + results.unanswered > 0;
  els.results.btnReview.disabled = !hasReviewable;
  els.results.reviewEmptyMsg.hidden = hasReviewable;
}

export function renderReviewItem(els, item, index, total) {
  els.review.progress.textContent = `Λάθος/Αναπάντητη ${index + 1} / ${total}`;
  els.review.questionText.textContent = item.question;
  els.review.userAnswer.textContent = item.userAnswer ?? 'NO ANSWER';
  els.review.correctAnswer.textContent = item.correctAnswer;
}

export function renderError(els, message) {
  els.error.message.textContent = message;
}

/** Shows the confirm dialog; resolves true/false based on the user's choice. */
export function confirmDialog(els, message) {
  els.confirm.text.textContent = message;
  els.confirm.overlay.hidden = false;
  return new Promise((resolve) => {
    const cleanup = () => {
      els.confirm.overlay.hidden = true;
      els.confirm.btnOk.removeEventListener('click', onOk);
      els.confirm.btnCancel.removeEventListener('click', onCancel);
    };
    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    els.confirm.btnOk.addEventListener('click', onOk);
    els.confirm.btnCancel.addEventListener('click', onCancel);
  });
}

/**
 * Attaches swipe + click detection to the question panel.
 * - Horizontal swipe (>= ~50px, more horizontal than vertical) => onNext
 * - Vertical/diagonal swipe => ignored (section 31)
 * - Plain click/tap with negligible movement => onNext (section 32)
 * Returns a cleanup function.
 */
export function bindQuestionPanelGestures(panelEl, onNext) {
  const SWIPE_THRESHOLD_PX = 50;
  let touchStartX = null;
  let touchStartY = null;

  function onTouchStart(e) {
    const t = e.changedTouches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }

  function onTouchEnd(e) {
    if (touchStartX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD_PX && absDy < SWIPE_THRESHOLD_PX) {
      // Negligible movement: treat as a tap, handled by the click
      // listener below (avoids double-firing on touch devices that
      // also emit a synthetic click).
      return;
    }
    if (absDx > absDy) {
      // Predominantly horizontal => NEXT, regardless of left/right.
      onNext('swipe');
    }
    // Predominantly vertical/diagonal => ignored per section 31.
  }

  function onClick() {
    onNext('click');
  }

  panelEl.addEventListener('touchstart', onTouchStart, { passive: true });
  panelEl.addEventListener('touchend', onTouchEnd, { passive: true });
  panelEl.addEventListener('click', onClick);

  return function unbind() {
    panelEl.removeEventListener('touchstart', onTouchStart);
    panelEl.removeEventListener('touchend', onTouchEnd);
    panelEl.removeEventListener('click', onClick);
  };
}

export function setOfflineBannerVisible(els, visible) {
  els.offlineBanner.hidden = !visible;
}

/** Section 46: toggles the fixed "please rotate your device" overlay. */
export function setRotateOverlayVisible(els, visible) {
  els.rotateOverlay.hidden = !visible;
}
