/**
 * Service Worker Manager
 * Handles registration and caching for offline support
 */

export class ServiceWorkerManager {
    constructor() {
        this.registered = false;
        this.registration = null;
        this.updateReady = false;
    }

    async register(swPath = '/sw.js') {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service workers are not supported');
            return false;
        }

        try {
            this.registration = await navigator.serviceWorker.register(swPath);
            this.registered = true;
            
            // Check for updates
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.updateReady = true;
                        console.log('Service worker update available');
                    }
                });
            });
            
            console.log('Service worker registered successfully');
            return true;
        } catch (error) {
            console.error('Service worker registration failed:', error);
            return false;
        }
    }

    async unregister() {
        if (!this.registered || !this.registration) {
            return false;
        }

        try {
            await this.registration.unregister();
            this.registered = false;
            this.registration = null;
            console.log('Service worker unregistered');
            return true;
        } catch (error) {
            console.error('Service worker unregistration failed:', error);
            return false;
        }
    }

    getRegistration() {
        return this.registration;
    }

    isRegistered() {
        return this.registered;
    }

    isUpdateReady() {
        return this.updateReady;
    }

    async skipWaiting() {
        if (!this.registered || !this.registration) {
            return false;
        }

        try {
            const worker = this.registration.waiting || this.registration.installing;
            if (worker) {
                worker.postMessage({ type: 'SKIP_WAITING' });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Skip waiting failed:', error);
            return false;
        }
    }

    async getActiveWorker() {
        if (!this.registered) {
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            return registration.active;
        } catch (error) {
            console.error('Failed to get active worker:', error);
            return null;
        }
    }

    // Check if service worker is controlling the page
    isControlling() {
        return !!navigator.serviceWorker.controller;
    }

    // Send message to service worker
    async sendMessage(message) {
        if (!this.isControlling()) {
            return false;
        }

        try {
            const worker = await this.getActiveWorker();
            if (worker) {
                worker.postMessage(message);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to send message to service worker:', error);
            return false;
        }
    }

    // Check for updates
    async checkForUpdates() {
        if (!this.registered || !this.registration) {
            return false;
        }

        try {
            await this.registration.update();
            return true;
        } catch (error) {
            console.error('Failed to check for updates:', error);
            return false;
        }
    }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();