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
    }

    async init() {
        try {
            // Show loading state
            this.ui.showLoading();
            console.log('App initializing...');
            
            // Load settings
            await this.settings.load();
            console.log('Settings loaded');
            
            // Check if we're on GitHub Pages
            const isGitHubPages = window.location.hostname.includes('github.io');
            if (isGitHubPages) {
                console.log('Running on GitHub Pages');
                // Adjust paths if needed
                const repoName = window.location.pathname.split('/')[1];
                if (repoName) {
                    console.log(`Repository: ${repoName}`);
                }
            }
            
            // Load Excel files - with better error handling
            let kumiteData = null;
            let kataData = null;
            let affirmations = [];
            
            try {
                console.log('Loading KUMITE data...');
                kumiteData = await this.excelLoader.loadKumite();
                console.log('KUMITE loaded successfully');
            } catch (error) {
                console.warn('KUMITE load failed:', error.message);
                // Continue without KUMITE
            }
            
            try {
                console.log('Loading KATA data...');
                kataData = await this.excelLoader.loadKata();
                console.log('KATA loaded successfully');
            } catch (error) {
                console.warn('KATA load failed:', error.message);
                // Continue without KATA
            }
            
            try {
                console.log('Loading affirmations...');
                affirmations = await this.excelLoader.loadAffirmations();
                console.log(`Loaded ${affirmations.length} affirmations`);
            } catch (error) {
                console.warn('Affirmations load failed:', error.message);
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
            console.log('App initialized successfully');
            
            // Check orientation
            this.ui.handleOrientationChange();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.ui.showError(`Σφάλμα κατά την εκκίνηση: ${error.message}. Ελέγξτε τα αρχεία δεδομένων.`);
            
            // Still try to show home with limited functionality
            setTimeout(() => {
                this.ui.showHome();
                this.ui.showToast('Η εφαρμογή ξεκίνησε με περιορισμένη λειτουργικότητα');
            }, 1000);
        }
    }

    // ... rest of the code remains the same ...
}

// Initialize the application
const app = new App();
app.init();

export default app;