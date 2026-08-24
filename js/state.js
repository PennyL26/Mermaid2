/**
 * Application State Management
 * Central state model for the application
 */

export const AppStateKeys = {
    LOADING: 'LOADING',
    HOME: 'HOME',
    SETTINGS: 'SETTINGS',
    QUIZ_READY: 'QUIZ_READY',
    QUESTION_ACTIVE: 'QUESTION_ACTIVE',
    QUESTION_PAUSED: 'QUESTION_PAUSED',
    QUESTION_TRANSITION: 'QUESTION_TRANSITION',
    RESULTS: 'RESULTS',
    REVIEW: 'REVIEW',
    ERROR: 'ERROR',
    EXIT: 'EXIT'
};

export class AppState {
    constructor() {
        this.state = AppStateKeys.LOADING;
        this.datasets = {
            kumite: null,
            kata: null
        };
        this.affirmations = [];
        this.quizState = null;
        this.listeners = [];
        this.error = null;
    }

    setState(newState) {
        if (!Object.values(AppStateKeys).includes(newState)) {
            console.warn(`Invalid state: ${newState}`);
            return;
        }
        const oldState = this.state;
        this.state = newState;
        this.notifyListeners(oldState, newState);
    }

    getState() {
        return this.state;
    }

    isState(state) {
        return this.state === state;
    }

    setDataset(name, data) {
        if (name === 'kumite' || name === 'kata') {
            this.datasets[name] = data;
        }
    }

    getDataset(name) {
        return this.datasets[name] || null;
    }

    isDatasetAvailable(name) {
        const data = this.getDataset(name);
        return data !== null && data.valid === true;
    }

    setAffirmations(data) {
        this.affirmations = data || [];
    }

    getAffirmations() {
        return this.affirmations;
    }

    setQuizState(quizState) {
        this.quizState = quizState;
    }

    getQuizState() {
        return this.quizState;
    }

    clearQuizState() {
        this.quizState = null;
    }

    setError(error) {
        this.error = error;
        this.setState(AppStateKeys.ERROR);
    }

    clearError() {
        this.error = null;
        if (this.state === AppStateKeys.ERROR) {
            this.setState(AppStateKeys.HOME);
        }
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    notifyListeners(oldState, newState) {
        this.listeners.forEach(listener => {
            try {
                listener(oldState, newState);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    reset() {
        this.setState(AppStateKeys.HOME);
        this.quizState = null;
        this.error = null;
    }
}