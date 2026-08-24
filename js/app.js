/**
 * Main Application Module
 * Entry point for the True/False Quiz Application
 */

import { AppState } from './state.js';
import { UI } from './ui.js';
import { QuizEngine } from './quiz.js';
import { ExcelLoader } from './excel.js';
import { SettingsManager } from './settings.js';
import { StorageManager } from './storage.js';
import { ServiceWorkerManager } from './service-worker.js';

class App {
    constructor() {
        this.state = new AppState();
        this.storage = new StorageManager();
        this.settings = new SettingsManager(this.storage);
        this.ui = new UI(this.state);
        this.excelLoader = new ExcelLoader();
        this.quiz = null;
        this.isInitialized = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.onQuestionComplete = this.onQuestionComplete.bind(this);
        this.onQuizComplete = this.onQuizComplete.bind(this);
        this.onError = this.onError.bind(this);
        
        // Register service worker
        this.registerServiceWorker();
    }

    async init() {
        try {
            // Show loading state
            this.ui.showLoading();
            
            // Load settings
            await this.settings.load();
            
            // Load Excel files
            const [kumiteData, kataData, affirmations] = await Promise.all([
                this.excelLoader.loadKumite(),
                this.excelLoader.loadKata(),
                this.excelLoader.loadAffirmations()
            ]);
            
            // Validate datasets
            const kumiteValid = this.excelLoader.validateDataset(kumiteData);
            const kataValid = this.excelLoader.validateDataset(kataData);
            
            // Store validated data
            this.state.setDataset('kumite', kumiteValid ? kumiteData : null);
            this.state.setDataset('kata', kataValid ? kataData : null);
            this.state.setAffirmations(affirmations);
            
            // Initialize UI with data
            this.ui.setDatasets(kumiteValid, kataValid);
            this.ui.setAffirmations(affirmations);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show home screen
            this.ui.showHome();
            
            this.isInitialized = true;
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.ui.showError('Σφάλμα κατά την εκκίνηση της εφαρμογής. Παρακαλώ ελέγξτε τα αρχεία δεδομένων.');
        }
    }

    setupEventListeners() {
        // Home screen controls
        document.getElementById('welcome-btn').addEventListener('click', () => {
            this.ui.showHomeControls(true);
        });

        document.getElementById('kumite-btn').addEventListener('click', () => {
            this.startQuiz('kumite');
        });

        document.getElementById('kata-btn').addEventListener('click', () => {
            this.startQuiz('kata');
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.ui.showSettings();
            this.settings.applyToUI();
        });

        document.getElementById('exit-btn').addEventListener('click', () => {
            this.handleExit();
        });

        // Settings screen
        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.saveSettings();
            this.ui.showHome();
        });

        // Settings: mode change
        document.querySelectorAll('input[name="mode"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateQuestionCountVisibility(e.target.value);
            });
        });

        // Settings: color buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Quiz controls
        document.getElementById('true-btn').addEventListener('click', () => {
            if (this.quiz) this.quiz.answerQuestion(true);
        });

        document.getElementById('false-btn').addEventListener('click', () => {
            if (this.quiz) this.quiz.answerQuestion(false);
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            if (this.quiz) this.quiz.togglePause();
        });

        document.getElementById('resume-btn').addEventListener('click', () => {
            if (this.quiz) this.quiz.togglePause();
        });

        // Question panel click (NEXT)
        document.getElementById('question-panel').addEventListener('click', () => {
            if (this.quiz) this.quiz.nextQuestion();
        });

        // Results screen
        document.getElementById('review-btn').addEventListener('click', () => {
            this.ui.toggleReview();
        });

        document.getElementById('review-next-btn').addEventListener('click', () => {
            this.ui.nextReviewQuestion();
        });

        document.getElementById('review-close-btn').addEventListener('click', () => {
            this.ui.closeReview();
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportResults();
        });

        document.getElementById('home-btn').addEventListener('click', () => {
            this.goHome();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Orientation change
        window.addEventListener('orientationchange', () => {
            this.ui.handleOrientationChange();
        });

        // Online/Offline
        window.addEventListener('online', () => {
            this.ui.showToast('Είστε online');
        });

        window.addEventListener('offline', () => {
            this.ui.showToast('Είστε offline. Ορισμένες λειτουργίες μπορεί να μην είναι διαθέσιμες.');
        });

        // Swipe support
        this.setupSwipeSupport();
    }

    startQuiz(mode) {
        const dataset = this.state.getDataset(mode);
        if (!dataset) {
            this.ui.showToast(`Τα δεδομένα ${mode.toUpperCase()} δεν είναι διαθέσιμα`);
            return;
        }

        const settings = this.settings.getCurrentSettings();
        const questions = this.prepareQuestions(dataset, settings);

        if (questions.length === 0) {
            this.ui.showToast('Δεν υπάρχουν διαθέσιμες ερωτήσεις');
            return;
        }

        if (settings.mode === 'specific_random' && settings.count > questions.length) {
            this.ui.showToast(`Ζητήθηκαν ${settings.count} ερωτήσεις αλλά υπάρχουν μόνο ${questions.length}`);
            return;
        }

        // Create quiz session
        this.quiz = new QuizEngine(
            questions,
            settings,
            mode,
            this.onQuestionComplete,
            this.onQuizComplete,
            this.onError
        );

        // Setup UI for quiz
        this.ui.setupQuiz(mode, questions.length, settings.panelColor);
        this.ui.updateQuizProgress(1, questions.length);

        // Start the quiz
        this.quiz.start();
        this.ui.startQuiz();
    }

    prepareQuestions(dataset, settings) {
        let questions = [...dataset.questions];

        switch (settings.mode) {
            case 'specific_random':
                // Shuffle and take N
                questions = this.shuffleArray(questions);
                questions = questions.slice(0, settings.count);
                break;
            case 'all_random':
                questions = this.shuffleArray(questions);
                break;
            case 'all_ordered':
                // Already in order
                break;
            default:
                break;
        }

        return questions;
    }

    shuffleArray(array) {
        // Fisher-Yates shuffle
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    onQuestionComplete(result) {
        // Update UI with question result
        this.ui.updateQuestionResult(result);
        this.ui.updateQuizProgress(this.quiz.currentIndex + 1, this.quiz.totalQuestions);
        
        // Update timer bar
        this.ui.updateTimerBar(1);
    }

    onQuizComplete(results) {
        // Show results
        this.ui.showResults(results);
    }

    onError(message) {
        this.ui.showError(message);
    }

    saveSettings() {
        const settings = this.settings.collectFromUI();
        this.settings.save(settings);
    }

    goHome() {
        if (this.quiz && this.quiz.isActive()) {
            if (confirm('Are you sure you want to leave this examination? Current results will be lost.')) {
                this.quiz.destroy();
                this.quiz = null;
                this.ui.showHome();
            }
        } else {
            this.ui.showHome();
        }
    }

    handleExit() {
        // Show exit message overlay
        this.ui.showExitMessage();
        
        // Try to close window
        try {
            window.close();
        } catch (e) {
            // Window didn't close, that's fine - we show the message
            console.log('Window close not allowed, showing exit message instead');
        }
    }

    handleKeyboard(event) {
        // Don't handle keyboard events when in settings or if quiz is not active
        if (this.ui.isSettingsVisible() || !this.quiz || !this.quiz.isActive()) {
            return;
        }

        const key = event.key.toLowerCase();

        switch (key) {
            case 't':
                event.preventDefault();
                if (this.quiz) this.quiz.answerQuestion(true);
                break;
            case 'f':
                event.preventDefault();
                if (this.quiz) this.quiz.answerQuestion(false);
                break;
            case 'p':
                event.preventDefault();
                if (this.quiz) this.quiz.togglePause();
                break;
            case ' ':
            case 'enter':
                event.preventDefault();
                if (this.quiz) this.quiz.nextQuestion();
                break;
            case 'escape':
                event.preventDefault();
                if (this.quiz && this.quiz.isActive()) {
                    if (confirm('Are you sure you want to leave this examination? Current results will be lost.')) {
                        this.quiz.destroy();
                        this.quiz = null;
                        this.ui.showHome();
                    }
                }
                break;
        }
    }

    setupSwipeSupport() {
        let touchStartX = 0;
        let touchStartY = 0;
        const panel = document.getElementById('question-panel');

        panel.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: true });

        panel.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        panel.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;

            // Only horizontal swipe with min 50px
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (this.quiz) this.quiz.nextQuestion();
            }
        }, { passive: true });
    }

    updateQuestionCountVisibility(mode) {
        const group = document.getElementById('question-count-group');
        if (mode === 'specific_random') {
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered successfully');
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        }
    }

    exportResults() {
        if (!this.quiz) return;
        
        const results = this.quiz.getResults();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
        const baseFilename = `exam_results_${timestamp}`;

        // Generate CSV
        let csv = 'Question,User Answer,Correct Answer,Status\n';
        results.details.forEach(q => {
            const userAns = q.userAnswer !== null ? (q.userAnswer ? 'TRUE' : 'FALSE') : 'UNANSWERED';
            const correctAns = q.correctAnswer ? 'TRUE' : 'FALSE';
            const status = q.status.toUpperCase();
            csv += `"${q.text}","${userAns}","${correctAns}","${status}"\n`;
        });

        // Generate TXT summary
        let txt = `Exam Results Summary\n`;
        txt += `${'='.repeat(40)}\n\n`;
        txt += `Date: ${new Date().toLocaleString()}\n`;
        txt += `Mode: ${results.mode.toUpperCase()}\n`;
        txt += `Total Questions: ${results.total}\n`;
        txt += `Correct: ${results.correct}\n`;
        txt += `Wrong: ${results.wrong}\n`;
        txt += `Unanswered: ${results.unanswered}\n`;
        txt += `Success Rate: ${results.percentage}%\n`;

        // Download files
        this.downloadFile(csv, `${baseFilename}.csv`, 'text/csv');
        this.downloadFile(txt, `${baseFilename}.txt`, 'text/plain');

        this.ui.showToast('Αποτελέσματα εξήχθησαν!');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Initialize the application
const app = new App();
app.init();

export default app;