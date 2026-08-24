/**
 * Storage Manager
 * Handles localStorage operations with error handling
 */

export class StorageManager {
    constructor() {
        this.prefix = 'truefalse_';
    }

    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, value);
            return true;
        } catch (error) {
            console.warn('Storage set failed:', error);
            return false;
        }
    }

    get(key) {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value;
        } catch (error) {
            console.warn('Storage get failed:', error);
            return null;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.warn('Storage remove failed:', error);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.warn('Storage clear failed:', error);
            return false;
        }
    }

    has(key) {
        try {
            return localStorage.getItem(this.prefix + key) !== null;
        } catch (error) {
            return false;
        }
    }

    getJSON(key) {
        const value = this.get(key);
        try {
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    setJSON(key, value) {
        try {
            return this.set(key, JSON.stringify(value));
        } catch (error) {
            return false;
        }
    }

    // Check if storage is available
    isAvailable() {
        try {
            const testKey = this.prefix + 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get storage usage
    getUsage() {
        let total = 0;
        try {
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length * 2; // UTF-16
                }
            }
            return total;
        } catch (error) {
            return 0;
        }
    }

    // Get storage limit (approximate)
    getLimit() {
        // Most browsers allow ~5MB
        return 5 * 1024 * 1024;
    }

    // Check if storage is near limit
    isNearLimit() {
        const usage = this.getUsage();
        const limit = this.getLimit();
        return usage > limit * 0.8; // 80% threshold
    }
}