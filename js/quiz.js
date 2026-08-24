// ============================================================
// quiz.js — owns one quiz session's data and the single,
// idempotent completion mechanism every input path funnels
// through (section 28). This is the module where all the
// race-condition guarantees in sections 27-37 and 53-56 live.
// ============================================================

import { shuffle, pickRandomN, log } from './utils.js';
import { QuestionTimer } from './timer.js';

export const QuestionStatus = Object.freeze({
  PENDING: 'PENDING', // not yet reached
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CORRECT: 'CORRECT',
  WRONG: 'WRONG',
  UNANSWERED: 'UNANSWERED',
});

/**
 * Builds the ordered list of questions for a session per the
 * three selection modes in section 18. Never mutates the
 * source dataset (section 54).
 */
function buildQuestionOrder(dataset, mode, count) {
  if (mode === 'all_ordered') {
    return dataset.slice(); // dataset is already sorted 1..N by excel.js
  }
  if (mode === 'all_random') {
    return shuffle(dataset);
  }
  // 'specific_random'
  return pickRandomN(dataset, count);
}

/**
 * A QuizSession owns exactly one exam run: an immutable settings
 * snapshot (section 15/44), the selected question order, and the
 * mutable per-question results. It exposes a single guarded
 * completeQuestion() so every possible trigger (answer, timeout,
 * swipe, click) is funneled through one idempotent gate.
 */
export class QuizSession {
  /**
   * @param {Array} dataset validated question dataset (from excel.js)
   * @param {Object} settingsSnapshot immutable settings for this run
   * @param {(event:{type:string, index:number})=>void} onEvent UI hook
   */
  constructor(dataset, settingsSnapshot, onEvent) {
    if (!Array.isArray(dataset) || dataset.length === 0) {
      throw new Error('QuizSession requires a non-empty dataset');
    }
    this.settings = Object.freeze({ ...settingsSnapshot }); // section 15 snapshot
    this.startedAt = new Date();
    this.onEvent = onEvent || (() => {});

    const order = buildQuestionOrder(
      dataset,
      this.settings.selectionMode,
      this.settings.questionCount
    );

    this.items = order.map((q) => ({
      number: q.number,
      question: q.question,
      correctAnswer: q.answer,
      status: QuestionStatus.PENDING,
      userAnswer: null, // 'TRUE' | 'FALSE' | null
    }));

    this.currentIndex = -1;
    this.timer = null;
    // Idempotency gate: exactly one thing may complete "the current
    // question" per activation. Reset every time a new question
    // becomes active; checked-and-set atomically inside JS's
    // single-threaded event loop, so no two triggers can both pass.
    this._completionLock = false;
    this._inTransition = false;
  }

  get total() {
    return this.items.length;
  }

  get currentItem() {
    return this.currentIndex >= 0 ? this.items[this.currentIndex] : null;
  }

  get isPaused() {
    const item = this.currentItem;
    return !!item && item.status === QuestionStatus.PAUSED;
  }

  get isActive() {
    const item = this.currentItem;
    return !!item && item.status === QuestionStatus.ACTIVE;
  }

  /**
   * Advances to the next question (or the first one) and starts
   * its timer. This is the only place a new timer is created,
   * and it always cancels any prior timer first (section 37).
   */
  activateNext(onTick) {
    if (this.timer) {
      this.timer.cancel();
      this.timer = null;
    }
    this.currentIndex += 1;
    this._completionLock = false;
    this._inTransition = false;

    if (this.currentIndex >= this.items.length) {
      this.onEvent({ type: 'FINISHED' });
      return false;
    }

    const item = this.items[this.currentIndex];
    item.status = QuestionStatus.ACTIVE;

    this.timer = new QuestionTimer(
      this.settings.questionTimeSeconds,
      onTick,
      () => this.completeQuestion({ type: 'timeout' })
    );
    this.timer.start();
    this.onEvent({ type: 'QUESTION_ACTIVATED', index: this.currentIndex });
    return true;
  }

  /** Pauses the current question's timer (section 34). No-op if not active. */
  pause() {
    if (!this.isActive || this._inTransition) return false;
    this.timer?.pause();
    this.currentItem.status = QuestionStatus.PAUSED;
    this.onEvent({ type: 'PAUSED', index: this.currentIndex });
    return true;
  }

  /** Resumes the current question's timer. No-op if not paused. */
  resume() {
    if (!this.isPaused) return false;
    this.currentItem.status = QuestionStatus.ACTIVE;
    this.timer?.resume();
    this.onEvent({ type: 'RESUMED', index: this.currentIndex });
    return true;
  }

  /**
   * THE central, idempotent completion gate (section 28-36).
   * Every possible trigger — TRUE/FALSE tap, timeout, click-next,
   * swipe-next — calls this with a descriptor. Only the first
   * caller for the current question actually does anything;
   * every subsequent caller (even from a "simultaneous" event) is
   * a no-op. This is what makes sections 27, 29-33, 36 hold.
   *
   * @param {{type:'answer'|'timeout'|'click'|'swipe', answer?:'TRUE'|'FALSE'}} trigger
   * @returns {boolean} true if this call actually completed the question
   */
  completeQuestion(trigger) {
    const item = this.currentItem;
    if (!item) return false;

    // Guard 1: only an ACTIVE question can be completed. This
    // blocks completion during PAUSED (section 34) and during
    // QUESTION_TRANSITION (section 33/35) automatically, since the
    // status is no longer ACTIVE in either of those windows.
    if (item.status !== QuestionStatus.ACTIVE) return false;

    // Guard 2: the atomic idempotency lock. Because JS callbacks
    // run to completion before the next one starts, this
    // check-and-set can never race — the very first trigger to
    // reach this line wins, full stop.
    if (this._completionLock) return false;
    this._completionLock = true;

    // Stop the timer immediately so it cannot fire onExpire again
    // and cannot keep advancing the timer bar (section 29 step 6).
    this.timer?.cancel();

    if (trigger.type === 'answer') {
      item.userAnswer = trigger.answer;
      item.status = trigger.answer === item.correctAnswer
        ? QuestionStatus.CORRECT
        : QuestionStatus.WRONG;
    } else {
      // timeout, click-without-answer, swipe-without-answer
      item.userAnswer = null;
      item.status = QuestionStatus.UNANSWERED;
    }

    this._inTransition = true;
    this.onEvent({ type: 'QUESTION_COMPLETED', index: this.currentIndex, trigger, item });
    return true;
  }

  /** Called once the fade transition (section 33) has finished. */
  transitionFinished() {
    this._inTransition = false;
  }

  get inTransition() {
    return this._inTransition;
  }

  /** Tears down any live timer. Call when abandoning a session. */
  destroy() {
    this.timer?.cancel();
    this.timer = null;
  }

  /**
   * Computes final results straight from recorded item statuses
   * (section 55) — never from separately-tracked UI counters, so
   * they cannot desync. Correct + Wrong + Unanswered === Total
   * always holds by construction.
   */
  getResults() {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    for (const item of this.items) {
      if (item.status === QuestionStatus.CORRECT) correct++;
      else if (item.status === QuestionStatus.WRONG) wrong++;
      else unanswered++; // covers UNANSWERED and any not-yet-reached PENDING
    }
    const total = this.items.length;
    const percentage = total > 0 ? (correct / total) * 100 : 0;
    return { total, correct, wrong, unanswered, percentage };
  }

  /** Items that were WRONG or UNANSWERED, for the review screen (section 40). */
  getReviewItems() {
    return this.items.filter(
      (i) => i.status === QuestionStatus.WRONG || i.status === QuestionStatus.UNANSWERED
    );
  }
}
