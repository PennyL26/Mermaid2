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

class App {
    constructor() {
        console.log('🔄 App constructor starting...');
        
        this.state = new AppState();
        this.storage = new StorageManager();
        this.settings = new SettingsManager(this.storage);
        this.ui = new UI(this.state);
        this.excelLoader = new ExcelLoader();
        this.quiz = null;
        this.isInitialized = false;
        
        // Δέσμευση μεθόδων - ΠΡΟΣΟΧΗ: ΠΡΕΠΕΙ να οριστούν μετά τη δημιουργία
        console.log('✅ App constructor complete');
    }

    // Οι μέθοδοι ορίζονται ΕΔΩ
    onQuestionComplete(result) {
        console.log('📝 Question complete:', result);
        if (this.quiz) {
            this.ui.updateQuestionResult(result);
            this.ui.updateQuizProgress(this.quiz.currentIndex + 1, this.quiz.totalQuestions);
            this.ui.updateTimerBar(1);
        }
    }

    onQuizComplete(results) {
        console.log('🏁 Quiz complete:', results);
        this.ui.showResults(results);
    }

    onError(message) {
        console.error('❌ Error:', message);
        this.ui.showError(message);
    }

    async init() {
        try {
            console.log('🚀 App initializing...');
            
            // Δέσμευση μεθόδων ΑΦΟΥ οριστούν
            this.init = this.init.bind(this);
            this.startQuiz = this.startQuiz.bind(this);
            this.prepareQuestions = this.prepareQuestions.bind(this);
            this.shuffleArray = this.shuffleArray.bind(this);
            this.goHome = this.goHome.bind(this);
            this.handleExit = this.handleExit.bind(this);
            this.handleKeyboard = this.handleKeyboard.bind(this);
            this.setupSwipeSupport = this.setupSwipeSupport.bind(this);
            this.updateQuestionCountVisibility = this.updateQuestionCountVisibility.bind(this);
            this.exportResults = this.exportResults.bind(this);
            this.downloadFile = this.downloadFile.bind(this);
            
            // Show loading state
            this.ui.showLoading();
            
            // Load settings
            await this.settings.load();
            console.log('✅ Settings loaded');
            
            // Load Excel files
            let kumiteData = null;
            let kataData = null;
            let affirmations = [];
            
            try {
                console.log('📂 Loading KUMITE...');
                kumiteData = await this.excelLoader.loadKumite();
                console.log('✅ KUMITE loaded');
            } catch (error) {
                console.warn('⚠️ KUMITE load failed:', error.message);
            }
            
            try {
                console.log('📂 Loading KATA...');
                kataData = await this.excelLoader.loadKata();
                console.log('✅ KATA loaded');
            } catch (error) {
                console.warn('⚠️ KATA load failed:', error.message);
            }
            
            try {
                console.log('📂 Loading affirmations...');
                affirmations = await this.excelLoader.loadAffirmations();
                console.log(`✅ ${affirmations.length} affirmations loaded`);
            } catch (error) {
                console.warn('⚠️ Affirmations load failed:', error.message);
                affirmations = [
                    { number: 1, text: 'Κάθε μέρα είσαι καλύτερος/η!' },
                    { number: 2, text: 'Η πρόοδος είναι πιο σημαντική από την τελειότητα.' },
                    { number: 3, text: 'Συνέχισε να προσπαθείς, η επιτυχία έρχεται με την επιμονή.' }
                ];
            }
            
            // Validate datasets
            let kumiteValid = false;
            let kataValid = false;
            
            if (kumiteData && kumiteData.length > 0) {
                const validation = this.excelLoader.validateDataset(kumiteData);
                kumiteValid = validation.valid;
                console.log('KUMITE validation:', validation);
            }
            
            if (kataData && kataData.length > 0) {
                const validation = this.excelLoader.validateDataset(kataData);
                kataValid = validation.valid;
                console.log('KATA validation:', validation);
            }
            
            // Store validated data
            this.state.setDataset('kumite', kumiteValid ? { questions: kumiteData, valid: true } : null);
            this.state.setDataset('kata', kataValid ? { questions: kataData, valid: true } : null);
            this.state.setAffirmations(affirmations);
            
            // Initialize UI with data
            this.ui.setDatasets(kumiteValid, kataValid);
            this.ui.setAffirmations(affirmations);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show home screen
            this.ui.showHome();
            
            this.isInitialized = true;
            console.log('✅ App initialized successfully! 🎉');
            
            // Check orientation
            this.ui.handleOrientationChange();
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.ui.showError(`Σφάλμα κατά την εκκίνηση: ${error.message}`);
            
            // Still try to show home
            setTimeout(() => {
                this.ui.showHome();
                this.ui.showToast('Η εφαρμογή ξεκίνησε με περιορισμένη λειτουργικότητα');
            }, 1000);
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Home screen
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

        // Settings
        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.saveSettings();
            this.ui.showHome();
        });

        document.querySelectorAll('input[name="mode"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateQuestionCountVisibility(e.target.value);
            });
        });

        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Quiz controls
        const trueBtn = document.getElementById('true-btn');
        const falseBtn = document.getElementById('false-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const questionPanel = document.getElementById('question-panel');

        if (trueBtn) trueBtn.addEventListener('click', () => {
            if (this.quiz) this.quiz.answerQuestion(true);
        });

        if (falseBtn) falseBtn.addEventListener('click', () => {
            if (this.quiz) this.quiz.answerQuestion(false);
        });

        if (pauseBtn) pauseBtn.addEventListener('click', () => {
            if (this.quiz) this.quiz.togglePause();
        });

        if (resumeBtn) resumeBtn.addEventListener('click', () => {
            if (this.quiz) this.quiz.togglePause();
        });

        if (questionPanel) questionPanel.addEventListener('click', () => {
            if (this.quiz) this.quiz.nextQuestion();
        });

        // Results
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
        document.addEventListener('keydown', this.handleKeyboard);

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
        
        console.log('✅ Event listeners set up');
    }

    startQuiz(mode) {
        console.log(`🎯 Starting quiz: ${mode}`);
        const dataset = this.state.getDataset(mode);
        if (!dataset) {
            this.ui.showToast(`Τα δεδομένα ${mode.toUpperCase()} δεν είναι διαθέσιμα`);
            return;
        }

        const settings = this.settings.getCurrentSettings();
        const questions = this.prepareQuestions(dataset.questions, settings);

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
            this.onQuestionComplete.bind(this),
            this.onQuizComplete.bind(this),
            this.onError.bind(this)
        );

        // Setup UI for quiz
        this.ui.setupQuiz(mode, questions.length, settings.panelColor);
        this.ui.updateQuizProgress(1, questions.length);

        // Start the quiz
        this.quiz.start();
        this.ui.startQuiz();
    }

    prepareQuestions(dataset, settings) {
        let questions = [...dataset];

        switch (settings.mode) {
            case 'specific_random':
                questions = this.shuffleArray(questions);
                questions = questions.slice(0, settings.count);
                break;
            case 'all_random':
                questions = this.shuffleArray(questions);
                break;
            case 'all_ordered':
                break;
            default:
                break;
        }

        return questions;
    }

    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
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
        this.ui.showExitMessage();
        try {
            window.close();
        } catch (e) {
            console.log('Window close not allowed, showing exit message instead');
        }
    }

    handleKeyboard(event) {
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

        if (!panel) return;

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

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (this.quiz) this.quiz.nextQuestion();
            }
        }, { passive: true });
    }

    updateQuestionCountVisibility(mode) {
        const group = document.getElementById('question-count-group');
        if (group) {
            group.style.display = mode === 'specific_random' ? 'block' : 'none';
        }
    }

    exportResults() {
        if (!this.quiz) return;
        
        const results = this.quiz.getResults();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
        const baseFilename = `exam_results_${timestamp}`;

        let csv = 'Question,User Answer,Correct Answer,Status\n';
        results.details.forEach(q => {
            const userAns = q.userAnswer !== null ? (q.userAnswer ? 'TRUE' : 'FALSE') : 'UNANSWERED';
            const correctAns = q.correctAnswer ? 'TRUE' : 'FALSE';
            const status = q.status.toUpperCase();
            csv += `"${q.text}","${userAns}","${correctAns}","${status}"\n`;
        });

        let txt = `Exam Results Summary\n`;
        txt += `${'='.repeat(40)}\n\n`;
        txt += `Date: ${new Date().toLocaleString()}\n`;
        txt += `Mode: ${results.mode.toUpperCase()}\n`;
        txt += `Total Questions: ${results.total}\n`;
        txt += `Correct: ${results.correct}\n`;
        txt += `Wrong: ${results.wrong}\n`;
        txt += `Unanswered: ${results.unanswered}\n`;
        txt += `Success Rate: ${results.percentage}%\n`;

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

// Δημιουργία και εκκίνηση της εφαρμογής
console.log('📱 Creating app instance...');
const app = new App();
console.log('🚀 Starting app...');
app.init();

export default app;