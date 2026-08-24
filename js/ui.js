/**
 * UI Manager
 * Handles all DOM updates and user interface interactions
 */

import { AppStateKeys } from './state.js';

export class UI {
    constructor(state) {
        this.state = state;
        this.elements = this.cacheElements();
        this.affirmations = [];
        this.datasets = {
            kumite: false,
            kata: false
        };
        this.reviewIndex = 0;
        this.reviewQuestions = [];
        this.currentQuestion = null;
        
        // Bind methods
        this.showLoading = this.showLoading.bind(this);
        this.showHome = this.showHome.bind(this);
        this.showSettings = this.showSettings.bind(this);
        this.showQuiz = this.showQuiz.bind(this);
        this.showResults = this.showResults.bind(this);
        this.showError = this.showError.bind(this);
    }

    cacheElements() {
        return {
            // Screens
            loading: document.getElementById('loading-screen'),
            home: document.getElementById('home-screen'),
            settings: document.getElementById('settings-screen'),
            quiz: document.getElementById('quiz-screen'),
            results: document.getElementById('results-screen'),
            
            // Home
            greeting: document.querySelector('.greeting'),
            affirmation: document.getElementById('affirmation-text'),
            welcomeBtn: document.getElementById('welcome-btn'),
            kumiteBtn: document.getElementById('kumite-btn'),
            kataBtn: document.getElementById('kata-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            exitBtn: document.getElementById('exit-btn'),
            datasetStatus: document.getElementById('dataset-status'),
            homeBg: document.getElementById('home-bg'),
            
            // Quiz
            quizTitle: document.getElementById('quiz-title'),
            progress: document.getElementById('progress-indicator'),
            questionPanel: document.getElementById('question-panel'),
            questionText: document.getElementById('question-text'),
            timerBar: document.getElementById('timer-bar'),
            trueBtn: document.getElementById('true-btn'),
            falseBtn: document.getElementById('false-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            pauseOverlay: document.getElementById('pause-overlay'),
            resumeBtn: document.getElementById('resume-btn'),
            
            // Results
            totalQuestions: document.getElementById('total-questions'),
            correctAnswers: document.getElementById('correct-answers'),
            wrongAnswers: document.getElementById('wrong-answers'),
            unansweredAnswers: document.getElementById('unanswered-answers'),
            successPercentage: document.getElementById('success-percentage'),
            reviewBtn: document.getElementById('review-btn'),
            reviewContainer: document.getElementById('review-container'),
            reviewQuestionText: document.getElementById('review-question-text'),
            reviewUserAnswer: document.getElementById('review-user-answer'),
            reviewCorrectAnswer: document.getElementById('review-correct-answer'),
            reviewProgress: document.getElementById('review-progress'),
            reviewNextBtn: document.getElementById('review-next-btn'),
            reviewCloseBtn: document.getElementById('review-close-btn'),
            
            // Other
            toast: document.getElementById('toast'),
            exitOverlay: document.getElementById('exit-overlay'),
            orientationWarning: document.getElementById('orientation-warning')
        };
    }

    showLoading() {
        this.hideAllScreens();
        this.elements.loading.classList.remove('hidden');
        this.state.setState(AppStateKeys.LOADING);
    }

    showHome() {
        this.hideAllScreens();
        this.elements.home.classList.remove('hidden');
        this.state.setState(AppStateKeys.HOME);
        
        // Show welcome button initially
        this.elements.welcomeBtn.style.display = 'block';
        
        // Random background image
        this.setRandomBackground();
        
        // Show random affirmation
        this.showRandomAffirmation();
        
        // Update dataset status
        this.updateDatasetStatus();
        
        // Hide controls initially
        document.querySelector('.home-controls').style.display = 'none';
    }

    showHomeControls(show) {
        document.querySelector('.home-controls').style.display = show ? 'grid' : 'none';
        if (show) {
            this.elements.welcomeBtn.style.display = 'none';
        }
    }

    setRandomBackground() {
        const num = Math.floor(Math.random() * 13) + 1;
        const bg = this.elements.homeBg;
        bg.style.backgroundImage = `url('assets/mermaid-${num}.png')`;
    }

    showRandomAffirmation() {
        if (this.affirmations && this.affirmations.length > 0) {
            const random = Math.floor(Math.random() * this.affirmations.length);
            this.elements.affirmation.textContent = this.affirmations[random].text;
        }
    }

    setAffirmations(affirmations) {
        this.affirmations = affirmations || [];
        if (this.affirmations.length > 0) {
            this.showRandomAffirmation();
        }
    }

    setDatasets(kumiteValid, kataValid) {
        this.datasets.kumite = kumiteValid;
        this.datasets.kata = kataValid;
        this.updateDatasetStatus();
        this.updateQuizButtons();
    }

    updateDatasetStatus() {
        const status = [];
        if (this.datasets.kumite) status.push('KUMITE ✓');
        else status.push('KUMITE ✗');
        if (this.datasets.kata) status.push('KATA ✓');
        else status.push('KATA ✗');
        
        this.elements.datasetStatus.textContent = `Διαθέσιμα datasets: ${status.join(' | ')}`;
    }

    updateQuizButtons() {
        this.elements.kumiteBtn.disabled = !this.datasets.kumite;
        this.elements.kataBtn.disabled = !this.datasets.kata;
    }

    showSettings() {
        this.hideAllScreens();
        this.elements.settings.classList.remove('hidden');
        this.state.setState(AppStateKeys.SETTINGS);
    }

    isSettingsVisible() {
        return !this.elements.settings.classList.contains('hidden');
    }

    showQuiz() {
        this.hideAllScreens();
        this.elements.quiz.classList.remove('hidden');
        this.state.setState(AppStateKeys.QUIZ_READY);
    }

    startQuiz() {
        // Transition from QUIZ_READY to QUESTION_ACTIVE
        this.state.setState(AppStateKeys.QUESTION_ACTIVE);
        this.enableQuizControls(true);
    }

    setupQuiz(mode, total, panelColor) {
        this.showQuiz();
        this.elements.quizTitle.textContent = mode.toUpperCase();
        this.elements.progress.textContent = `Ερώτηση 1 / ${total}`;
        this.elements.questionPanel.style.background = panelColor || '#ffffff';
        this.elements.timerBar.style.width = '0%';
        this.elements.timerBar.style.background = '#FFB6C1';
        this.elements.pauseOverlay.classList.add('hidden');
        this.elements.resumeBtn.style.display = 'block';
        
        // Reset review state
        this.reviewIndex = 0;
        this.reviewQuestions = [];
    }

    updateQuizProgress(current, total) {
        this.elements.progress.textContent = `Ερώτηση ${current} / ${total}`;
    }

    updateQuestionText(text) {
        this.elements.questionText.textContent = text || 'Loading question...';
    }

    updateTimerBar(percentage, color) {
        const bar = this.elements.timerBar;
        const pct = Math.min(100, Math.max(0, percentage * 100));
        bar.style.width = `${pct}%`;
        
        if (color) {
            bar.style.background = color;
        } else {
            // Determine color based on percentage
            if (pct <= 10) {
                bar.style.background = '#FF69B4'; // Hot Pink - Critical
            } else if (pct <= 25) {
                bar.style.background = '#FFC0CB'; // Classic Pink - Warning
            } else {
                bar.style.background = '#FFB6C1'; // Light Pink - Normal
            }
        }
    }

    updateQuestionResult(result) {
        // Visual feedback for answer
        const panel = this.elements.questionPanel;
        const color = result.status === 'correct' ? '#e8f5e9' : 
                     result.status === 'wrong' ? '#ffebee' : '#fff3e0';
        panel.style.background = color;
        
        // Update timer bar color based on result
        this.updateTimerBar(1, result.status === 'correct' ? '#4CAF50' : 
                                  result.status === 'wrong' ? '#f44336' : '#FF9800');
    }

    enableQuizControls(enabled) {
        this.elements.trueBtn.disabled = !enabled;
        this.elements.falseBtn.disabled = !enabled;
        this.elements.pauseBtn.disabled = !enabled;
        this.elements.questionPanel.classList.toggle('clickable', enabled);
    }

    showPause() {
        this.elements.pauseOverlay.classList.remove('hidden');
        this.state.setState(AppStateKeys.QUESTION_PAUSED);
        this.enableQuizControls(false);
        this.updateTimerBar(this.quizPauseProgress || 0, '#9E9E9E');
    }

    hidePause() {
        this.elements.pauseOverlay.classList.add('hidden');
        this.state.setState(AppStateKeys.QUESTION_ACTIVE);
        this.enableQuizControls(true);
    }

    setPauseProgress(progress) {
        this.quizPauseProgress = progress;
    }

    showResults(results) {
        this.hideAllScreens();
        this.elements.results.classList.remove('hidden');
        this.state.setState(AppStateKeys.RESULTS);
        
        // Display results
        this.elements.totalQuestions.textContent = results.total;
        this.elements.correctAnswers.textContent = results.correct;
        this.elements.wrongAnswers.textContent = results.wrong;
        this.elements.unansweredAnswers.textContent = results.unanswered;
        this.elements.successPercentage.textContent = `${results.percentage}%`;
        
        // Setup review
        this.reviewQuestions = results.details.filter(
            q => q.status === 'wrong' || q.status === 'unanswered'
        );
        this.reviewIndex = 0;
        
        if (this.reviewQuestions.length === 0) {
            this.elements.reviewBtn.disabled = true;
            this.elements.reviewContainer.classList.add('hidden');
        } else {
            this.elements.reviewBtn.disabled = false;
            this.elements.reviewContainer.classList.add('hidden');
        }
    }

    toggleReview() {
        const container = this.elements.reviewContainer;
        if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            this.state.setState(AppStateKeys.REVIEW);
            this.showReviewQuestion(0);
        } else {
            container.classList.add('hidden');
            this.state.setState(AppStateKeys.RESULTS);
        }
    }

    showReviewQuestion(index) {
        if (this.reviewQuestions.length === 0) return;
        
        const q = this.reviewQuestions[index];
        this.elements.reviewQuestionText.textContent = q.text;
        
        const userAnswer = q.userAnswer !== null ? (q.userAnswer ? 'TRUE' : 'FALSE') : 'NO ANSWER';
        const correctAnswer = q.correctAnswer ? 'TRUE' : 'FALSE';
        
        this.elements.reviewUserAnswer.textContent = `Η απάντησή σου: ${userAnswer}`;
        this.elements.reviewCorrectAnswer.textContent = `Σωστή απάντηση: ${correctAnswer}`;
        this.elements.reviewProgress.textContent = `${index + 1} / ${this.reviewQuestions.length}`;
        
        this.reviewIndex = index;
        
        // Update button
        this.elements.reviewNextBtn.textContent = 
            index === this.reviewQuestions.length - 1 ? '✓ Τέλος' : 'Επόμενη →';
    }

    nextReviewQuestion() {
        if (this.reviewIndex < this.reviewQuestions.length - 1) {
            this.showReviewQuestion(this.reviewIndex + 1);
        } else {
            this.closeReview();
        }
    }

    closeReview() {
        this.elements.reviewContainer.classList.add('hidden');
        this.state.setState(AppStateKeys.RESULTS);
    }

    showError(message) {
        this.showToast(`❌ ${message}`);
        console.error('UI Error:', message);
    }

    showToast(message, duration = 4000) {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.classList.remove('hidden');
        
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }

    showExitMessage() {
        this.elements.exitOverlay.classList.remove('hidden');
        this.state.setState(AppStateKeys.EXIT);
    }

    hideExitMessage() {
        this.elements.exitOverlay.classList.add('hidden');
        this.state.setState(AppStateKeys.HOME);
    }

    handleOrientationChange() {
        this.checkOrientation();
    }

    checkOrientation() {
        const warning = this.elements.orientationWarning;
        if (window.innerHeight > window.innerWidth && window.innerWidth < 768) {
            warning.classList.remove('hidden');
        } else {
            warning.classList.add('hidden');
        }
    }

    hideAllScreens() {
        Object.values(this.elements).forEach(el => {
            if (el && el.classList) {
                el.classList.add('hidden');
            }
        });
        
        // Special handling for overlays
        if (this.elements.pauseOverlay) {
            this.elements.pauseOverlay.classList.add('hidden');
        }
        if (this.elements.exitOverlay) {
            this.elements.exitOverlay.classList.add('hidden');
        }
        if (this.elements.orientationWarning) {
            this.elements.orientationWarning.classList.add('hidden');
        }
    }

    reset() {
        this.reviewIndex = 0;
        this.reviewQuestions = [];
        this.currentQuestion = null;
        this.hideAllScreens();
        this.showHome();
    }
}