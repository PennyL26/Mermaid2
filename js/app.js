// ============================================================
// app.js — the orchestrator. This is intentionally the only
// module that knows about ALL the others; it wires DOM events
// to quiz.js actions and quiz.js events to UI renders, and owns
// the few pieces of top-level control flow (which screen is
// showing, which dataset is active) that don't belong in any
// single lower-level module.
// ============================================================

import { appState, AppState } from './state.js';
import { DATA_PATHS, loadQuestionDataset, loadAffirmationsDataset } from './excel.js';
import { QuizSession } from './quiz.js';
import { loadSettings } from './storage.js';
import {
  populateSettingsForm,
  toggleQuestionCountVisibility,
  readAndSaveSettingsForm,
} from './settings.js';
import {
  queryElements,
  showScreen,
  applyRandomMermaidBackground,
  renderAffirmation,
  renderDatasetStatus,
  applyPanelColor,
  renderQuestion,
  setTimerBar,
  setAnswerButtonsEnabled,
  showPauseOverlay,
  runFadeTransition,
  renderResults,
  renderReviewItem,
  renderError,
  confirmDialog,
  bindQuestionPanelGestures,
  setOfflineBannerVisible,
  setRotateOverlayVisible,
} from './ui.js';
import {
  shuffle,
  formatTimestampForFilename,
  downloadTextFile,
  csvEscape,
  log,
} from './utils.js';

const els = queryElements();

// ---- App-level data, separate from any one quiz session ------------------
let kumiteDataset = null; // array of {number, question, answer} | null if invalid
let kataDataset = null;
let affirmationTexts = [];

let quizSession = null;
let homeMenuRevealed = false;

let reviewItems = [];
let reviewIndex = 0;

let unbindPanelGestures = null;

// ===========================================================================
// Bootstrap
// ===========================================================================

async function bootstrap() {
  appState.setState(AppState.LOADING);
  showScreen(els, 'loading');
  registerServiceWorker();
  wireStaticEventListeners();
  setupOnlineOfflineIndicator();
  setupOrientationWatcher();

  const [kumiteResult, kataResult, affirmationsResult] = await Promise.all([
    loadQuestionDataset(DATA_PATHS.kumite),
    loadQuestionDataset(DATA_PATHS.kata),
    loadAffirmationsDataset(DATA_PATHS.affirmations),
  ]);

  // Section 12/50: KUMITE and KATA are validated and enabled/disabled
  // completely independently. One failing never disables the other.
  kumiteDataset = kumiteResult.ok ? kumiteResult.questions : null;
  kataDataset = kataResult.ok ? kataResult.questions : null;
  if (!kumiteResult.ok) log.warn('KUMITE dataset unavailable:', kumiteResult.errorMessage);
  if (!kataResult.ok) log.warn('KATA dataset unavailable:', kataResult.errorMessage);

  affirmationTexts = affirmationsResult.ok
    ? affirmationsResult.texts
    : [{ number: 1, text: 'Καλή επιτυχία στην εξέτασή σου!' }];
  if (!affirmationsResult.ok) {
    log.warn('Affirmations dataset unavailable, using fallback message.', affirmationsResult.errorMessage);
  }

  goHome();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      log.warn('Service worker registration failed (app still works online).', err);
    });
  }
}

// ===========================================================================
// HOME screen
// ===========================================================================

function goHome() {
  appState.setState(AppState.HOME);
  showScreen(els, 'home');
  applyRandomMermaidBackground(els);

  const pick = affirmationTexts[Math.floor(Math.random() * affirmationTexts.length)];
  renderAffirmation(els, pick.text);

  renderDatasetStatus(els, { kumiteOk: !!kumiteDataset, kataOk: !!kataDataset });

  els.home.exitMessage.hidden = true;

  if (homeMenuRevealed) {
    els.home.btnWelcomeStart.hidden = true;
    els.home.homeMenu.hidden = false;
  } else {
    els.home.btnWelcomeStart.hidden = false;
    els.home.homeMenu.hidden = true;
  }
}

function revealHomeMenu() {
  homeMenuRevealed = true;
  els.home.btnWelcomeStart.hidden = true;
  els.home.homeMenu.hidden = false;
}

function attemptExit() {
  // Modern browsers generally block window.close() on a tab/window
  // the script didn't itself open, so this is best-effort; the
  // fallback message (section 14) covers the common case.
  window.close();
  setTimeout(() => {
    if (!document.hidden) {
      els.home.homeMenu.hidden = true;
      els.home.btnWelcomeStart.hidden = true;
      els.home.exitMessage.hidden = false;
    }
  }, 300);
}

// ===========================================================================
// SETTINGS screen
// ===========================================================================

function goSettings() {
  appState.setState(AppState.SETTINGS);
  showScreen(els, 'settings');
  populateSettingsForm(els.settingsForm);
}

function saveSettingsAndReturnHome() {
  readAndSaveSettingsForm(els.settingsForm);
  goHome();
}

// ===========================================================================
// QUIZ flow
// ===========================================================================

function startQuiz(datasetKey) {
  const dataset = datasetKey === 'kumite' ? kumiteDataset : kataDataset;
  if (!dataset) return; // button should already be disabled in this case

  const settingsSnapshot = loadSettings(); // section 15: frozen at start time

  if (
    settingsSnapshot.selectionMode === 'specific_random' &&
    settingsSnapshot.questionCount > dataset.length
  ) {
    goError(
      `Ζητήθηκαν ${settingsSnapshot.questionCount} ερωτήσεις, αλλά το dataset περιέχει μόνο ${dataset.length} έγκυρες ερωτήσεις. Μειώστε τον αριθμό ερωτήσεων στις Ρυθμίσεις.`
    );
    return;
  }

  quizSession = new QuizSession(dataset, settingsSnapshot, handleQuizEvent);
  appState.setState(AppState.QUIZ_READY);
  showScreen(els, 'quiz');
  applyPanelColor(els, settingsSnapshot.panelColor);

  if (unbindPanelGestures) unbindPanelGestures();
  unbindPanelGestures = bindQuestionPanelGestures(els.quiz.questionPanel, (gestureType) => {
    quizSession?.completeQuestion({ type: gestureType });
  });

  quizSession.activateNext(onTimerTick);
}

function onTimerTick(fraction) {
  setTimerBar(els, fraction, false);
}

/**
 * The single dispatch point for everything the quiz session
 * reports. This is where quiz-session events become screen
 * changes and renders.
 */
async function handleQuizEvent(evt) {
  switch (evt.type) {
    case 'QUESTION_ACTIVATED': {
      appState.setState(AppState.QUESTION_ACTIVE);
      renderQuestion(els, quizSession.currentItem, quizSession.currentIndex, quizSession.total);
      break;
    }
    case 'PAUSED': {
      appState.setState(AppState.QUESTION_PAUSED);
      showPauseOverlay(els, true);
      setAnswerButtonsEnabled(els, false);
      setTimerBar(els, timerFractionAtPause(), true);
      break;
    }
    case 'RESUMED': {
      appState.setState(AppState.QUESTION_ACTIVE);
      showPauseOverlay(els, false);
      setAnswerButtonsEnabled(els, true);
      break;
    }
    case 'QUESTION_COMPLETED': {
      appState.setState(AppState.QUESTION_TRANSITION);
      setAnswerButtonsEnabled(els, false);
      await runFadeTransition(els, 2000);
      // Guard: a HOME abandonment during the fade may have already
      // torn down the session (see abandonQuizWithConfirmation).
      if (!quizSession) return;
      quizSession.transitionFinished();
      quizSession.activateNext(onTimerTick);
      break;
    }
    case 'FINISHED': {
      finishQuiz();
      break;
    }
    default:
      break;
  }
}

// Timer bar has no direct "current fraction" getter exposed by the
// timer itself at pause time in a form ui.js needs; we simply keep
// the bar as-is visually (CSS still shows last painted width) and
// only swap its color to the paused grey state.
function timerFractionAtPause() {
  const currentWidth = els.quiz.timerFill.style.width || '0%';
  return parseFloat(currentWidth) / 100 || 0;
}

function finishQuiz() {
  const results = quizSession.getResults();
  reviewItems = quizSession.getReviewItems();
  reviewIndex = 0;
  appState.setState(AppState.RESULTS);
  showScreen(els, 'results');
  renderResults(els, results);
}

async function abandonQuizWithConfirmation() {
  if (!appState.is(AppState.QUESTION_ACTIVE, AppState.QUESTION_PAUSED)) return;
  const wasActive = appState.current === AppState.QUESTION_ACTIVE;
  if (wasActive) quizSession?.pause();

  const confirmed = await confirmDialog(
    els,
    'Are you sure you want to leave this examination? Current results will be lost.'
  );

  if (confirmed) {
    quizSession?.destroy();
    quizSession = null;
    if (unbindPanelGestures) { unbindPanelGestures(); unbindPanelGestures = null; }
    goHome();
  } else if (wasActive) {
    quizSession?.resume();
  }
}

// ===========================================================================
// RESULTS / REVIEW
// ===========================================================================

function goReview() {
  if (reviewItems.length === 0) return;
  appState.setState(AppState.REVIEW);
  showScreen(els, 'review');
  renderReviewItem(els, reviewItems[reviewIndex], reviewIndex, reviewItems.length);
}

function reviewNext() {
  reviewIndex = (reviewIndex + 1) % reviewItems.length;
  renderReviewItem(els, reviewItems[reviewIndex], reviewIndex, reviewItems.length);
}

function backToResultsFromReview() {
  appState.setState(AppState.RESULTS);
  showScreen(els, 'results');
}

function returnHomeFromResults() {
  quizSession?.destroy();
  quizSession = null;
  reviewItems = [];
  reviewIndex = 0;
  goHome();
}

function exportResults() {
  if (!quizSession) return;
  const now = new Date();
  const stamp = formatTimestampForFilename(now);
  const results = quizSession.getResults();

  const csvHeader = ['Αριθμός', 'Ερώτηση', 'Απάντηση χρήστη', 'Σωστή απάντηση', 'Κατάσταση'];
  const csvRows = quizSession.items.map((item) =>
    [
      item.number,
      item.question,
      item.userAnswer ?? 'NO ANSWER',
      item.correctAnswer,
      item.status,
    ]
      .map(csvEscape)
      .join(',')
  );
  const csvContent = [csvHeader.map(csvEscape).join(','), ...csvRows].join('\r\n');

  const txtContent = [
    `Εξέταση: ${stamp}`,
    `Σύνολο ερωτήσεων: ${results.total}`,
    `Σωστές απαντήσεις: ${results.correct}`,
    `Λάθος απαντήσεις: ${results.wrong}`,
    `Αναπάντητες: ${results.unanswered}`,
    `Ποσοστό επιτυχίας: ${results.percentage.toFixed(1)}%`,
  ].join('\r\n');

  downloadTextFile(`exam_results_${stamp}.csv`, csvContent, 'text/csv;charset=utf-8');
  downloadTextFile(`exam_results_${stamp}.txt`, txtContent, 'text/plain;charset=utf-8');
}

// ===========================================================================
// ERROR screen
// ===========================================================================

function goError(message) {
  appState.setState(AppState.ERROR);
  showScreen(els, 'error');
  renderError(els, message);
}

// ===========================================================================
// Static (one-time) event wiring
// ===========================================================================

function wireStaticEventListeners() {
  els.home.btnWelcomeStart.addEventListener('click', revealHomeMenu);
  els.home.btnKumite.addEventListener('click', () => startQuiz('kumite'));
  els.home.btnKata.addEventListener('click', () => startQuiz('kata'));
  els.home.btnSettings.addEventListener('click', goSettings);
  els.home.btnExit.addEventListener('click', attemptExit);

  els.settingsForm.selectionMode.addEventListener('change', () =>
    toggleQuestionCountVisibility(els.settingsForm)
  );
  els.settingsForm.btnSave.addEventListener('click', saveSettingsAndReturnHome);
  els.settingsForm.btnBack.addEventListener('click', goHome);

  els.quiz.btnTrue.addEventListener('click', () =>
    quizSession?.completeQuestion({ type: 'answer', answer: 'TRUE' })
  );
  els.quiz.btnFalse.addEventListener('click', () =>
    quizSession?.completeQuestion({ type: 'answer', answer: 'FALSE' })
  );
  els.quiz.btnPause.addEventListener('click', () => quizSession?.pause());
  els.quiz.btnResume.addEventListener('click', () => quizSession?.resume());

  els.results.btnReview.addEventListener('click', goReview);
  els.results.btnExport.addEventListener('click', exportResults);
  els.results.btnHome.addEventListener('click', returnHomeFromResults);

  els.review.btnNext.addEventListener('click', reviewNext);
  els.review.btnBack.addEventListener('click', backToResultsFromReview);

  els.error.btnHome.addEventListener('click', () => {
    quizSession?.destroy();
    quizSession = null;
    goHome();
  });

  document.addEventListener('keydown', handleKeydown);
}

// Section 48: keyboard shortcuts. Guarded so a shortcut can never
// fire a second logical action on top of one already in flight —
// it simply calls the same guarded methods every other input path
// calls, so quiz.js's idempotency guard covers keyboard too.
function handleKeydown(e) {
  if (e.repeat) return; // avoid auto-repeat spamming actions

  const inQuestion = appState.is(AppState.QUESTION_ACTIVE, AppState.QUESTION_PAUSED);

  switch (e.key) {
    case ' ':
    case 'Enter':
      if (appState.current === AppState.QUESTION_ACTIVE) {
        e.preventDefault();
        quizSession?.completeQuestion({ type: 'click' });
      }
      break;
    case 't':
    case 'T':
      if (appState.current === AppState.QUESTION_ACTIVE) {
        quizSession?.completeQuestion({ type: 'answer', answer: 'TRUE' });
      }
      break;
    case 'f':
    case 'F':
      if (appState.current === AppState.QUESTION_ACTIVE) {
        quizSession?.completeQuestion({ type: 'answer', answer: 'FALSE' });
      }
      break;
    case 'p':
    case 'P':
      if (appState.current === AppState.QUESTION_ACTIVE) quizSession?.pause();
      else if (appState.current === AppState.QUESTION_PAUSED) quizSession?.resume();
      break;
    case 'Escape':
      if (inQuestion) {
        e.preventDefault();
        abandonQuizWithConfirmation();
      }
      break;
    default:
      break;
  }
}

// ===========================================================================
// Online/offline indicator (section 6)
// ===========================================================================

function setupOnlineOfflineIndicator() {
  const update = () => setOfflineBannerVisible(els, !navigator.onLine);
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ===========================================================================
// Landscape orientation watcher (section 46)
// ===========================================================================

function setupOrientationWatcher() {
  const MOBILE_MAX_WIDTH = 900;
  const update = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    const isMobileSized = Math.min(window.innerWidth, window.innerHeight) <= MOBILE_MAX_WIDTH;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const shouldWarn = isPortrait && isMobileSized && hasCoarsePointer;
    setRotateOverlayVisible(els, shouldWarn);
  };
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  update();
}

// ===========================================================================
bootstrap();
