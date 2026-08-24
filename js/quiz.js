/**
 * Quiz Engine
 * Core quiz logic including timer management, question flow, and state management
 */

import { AppStateKeys } from './state.js';

export class QuizEngine {
    constructor(questions, settings, mode, onComplete, onQuizComplete, onError) {
        this.questions = questions;
        this.settings = settings;
        this.mode = mode;
        this.onComplete = onComplete;
        this.onQuizComplete = onQuizComplete;
        this.onError = onError;
        
        this.currentIndex = 0;
        this.results = [];
        this.isActive = false;
        this.isPaused = false;
        this.isTransitioning = false;
        this.currentQuestionCompleted = false;
        this.timer = null;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.pauseTime = 0;
        this.totalQuestions = questions.length;
        
        // Bind methods
        this.start = this.start.bind(this);
        this.answerQuestion = this.answerQuestion.bind(this);
        this.nextQuestion = this.nextQuestion.bind(this);
        this.togglePause = this.togglePause.bind(this);
        this.completeCurrentQuestion = this.completeCurrentQuestion.bind(this);
        this.handleTimeout = this.handleTimeout.bind(this);
        this.destroy = this.destroy.bind(this);
        this.getResults = this.getResults.bind(this);
    }

    start() {
        if (this.questions.length === 0) {
            this.onError('Δεν υπάρχουν διαθέσιμες ερωτήσεις');
            return;
        }
        
        this.isActive = true;
        this.currentIndex = 0;
        this.results = [];
        this.currentQuestionCompleted = false;
        
        // Show first question
        this.showQuestion(0);
    }

    showQuestion(index) {
        if (index >= this.questions.length) {
            this.finishQuiz();
            return;
        }

        this.currentIndex = index;
        this.currentQuestionCompleted = false;
        this.isTransitioning = false;
        
        const question = this.questions[index];
        this.onComplete({
            question: question,
            status: 'active'
        });
        
        // Start timer after a small delay to ensure UI is ready
        setTimeout(() => {
            if (this.isActive && !this.isPaused) {
                this.startTimer();
            }
        }, 100);
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.startTime = performance.now() - this.elapsedTime;
        const duration = this.settings.time * 1000;
        
        // Update timer bar initially
        this.updateTimerBar(0);
        
        this.timer = setInterval(() => {
            if (this.isPaused) return;
            if (this.isTransitioning) return;
            if (this.currentQuestionCompleted) return;
            
            const now = performance.now();
            this.elapsedTime = now - this.startTime;
            const progress = Math.min(this.elapsedTime / duration, 1);
            
            this.updateTimerBar(progress);
            
            if (progress >= 1) {
                this.handleTimeout();
            }
        }, 50);
    }

    updateTimerBar(progress) {
        // Update UI through the callback
        const percentage = Math.min(progress, 1);
        this.onComplete({
            timerProgress: percentage
        });
    }

    handleTimeout() {
        if (this.currentQuestionCompleted) return;
        if (this.isTransitioning) return;
        
        this.completeCurrentQuestion(null, 'unanswered');
    }

    answerQuestion(answer) {
        if (!this.isActive) return;
        if (this.isPaused) return;
        if (this.isTransitioning) return;
        if (this.currentQuestionCompleted) return;
        if (this.currentIndex >= this.questions.length) return;
        
        const question = this.questions[this.currentIndex];
        const isCorrect = (answer === question.answer);
        const status = isCorrect ? 'correct' : 'wrong';
        
        this.completeCurrentQuestion(answer, status);
    }

    nextQuestion() {
        if (!this.isActive) return;
        if (this.isPaused) return;
        if (this.isTransitioning) return;
        if (this.currentQuestionCompleted) return;
        
        // If no answer given, mark as unanswered
        this.completeCurrentQuestion(null, 'unanswered');
    }

    completeCurrentQuestion(userAnswer, status) {
        // Guard against double completion
        if (this.currentQuestionCompleted) return;
        if (this.isTransitioning) return;
        
        this.currentQuestionCompleted = true;
        this.isTransitioning = true;
        
        // Stop timer
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        const question = this.questions[this.currentIndex];
        const result = {
            index: this.currentIndex,
            number: question.number,
            text: question.text,
            correctAnswer: question.answer,
            userAnswer: userAnswer,
            status: status,
            isCorrect: status === 'correct'
        };
        
        this.results.push(result);
        
        // Notify UI of completion
        this.onComplete(result);
        
        // After transition, show next question
        setTimeout(() => {
            this.isTransitioning = false;
            this.elapsedTime = 0;
            
            if (this.currentIndex + 1 < this.questions.length) {
                this.showQuestion(this.currentIndex + 1);
            } else {
                this.finishQuiz();
            }
        }, 1000); // 1 second transition
    }

    togglePause() {
        if (!this.isActive) return;
        if (this.isTransitioning) return;
        if (this.currentIndex >= this.questions.length) return;
        
        if (this.isPaused) {
            // Resume
            this.isPaused = false;
            this.startTime = performance.now() - this.elapsedTime;
            this.onComplete({ paused: false });
        } else {
            // Pause
            this.isPaused = true;
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
            this.onComplete({ paused: true });
        }
    }

    finishQuiz() {
        this.isActive = false;
        this.isPaused = false;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // Calculate results
        const stats = this.calculateStats();
        this.onQuizComplete(stats);
    }

    calculateStats() {
        const total = this.results.length;
        const correct = this.results.filter(r => r.status === 'correct').length;
        const wrong = this.results.filter(r => r.status === 'wrong').length;
        const unanswered = this.results.filter(r => r.status === 'unanswered').length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        return {
            total,
            correct,
            wrong,
            unanswered,
            percentage,
            details: this.results,
            mode: this.mode
        };
    }

    getResults() {
        return this.calculateStats();
    }

    isActive() {
        return this.isActive;
    }

    isPausedState() {
        return this.isPaused;
    }

    destroy() {
        this.isActive = false;
        this.isPaused = false;
        this.isTransitioning = false;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.results = [];
        this.currentIndex = 0;
    }
}