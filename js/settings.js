/**
 * Settings Manager
 * Handles loading, saving, and applying settings
 */

export class SettingsManager {
    constructor(storage) {
        this.storage = storage;
        
        this.defaults = {
            time: 15,
            mode: 'specific_random',
            count: 20,
            panelColor: '#ffffff',
            timerColor: '#4CAF50'
        };
        
        this.currentSettings = { ...this.defaults };
    }

    async load() {
        try {
            const stored = this.storage.get('settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults, only keeping valid values
                this.currentSettings = this.validateSettings(parsed);
            } else {
                this.currentSettings = { ...this.defaults };
            }
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
            this.currentSettings = { ...this.defaults };
        }
        
        return this.currentSettings;
    }

    validateSettings(settings) {
        const validated = { ...this.defaults };
        
        // Validate time
        if (settings.time !== undefined) {
            const time = Number(settings.time);
            if (Number.isInteger(time) && time >= 4 && time <= 60) {
                validated.time = time;
            }
        }
        
        // Validate mode
        if (settings.mode && ['specific_random', 'all_ordered', 'all_random'].includes(settings.mode)) {
            validated.mode = settings.mode;
        }
        
        // Validate count
        if (settings.count !== undefined) {
            const count = Number(settings.count);
            if (Number.isInteger(count) && count >= 1) {
                validated.count = count;
            }
        }
        
        // Validate panel color
        if (settings.panelColor && /^#[0-9A-Fa-f]{6}$/.test(settings.panelColor)) {
            validated.panelColor = settings.panelColor;
        }
        
        // Validate timer color
        if (settings.timerColor && /^#[0-9A-Fa-f]{6}$/.test(settings.timerColor)) {
            validated.timerColor = settings.timerColor;
        }
        
        return validated;
    }

    save(settings) {
        const validated = this.validateSettings(settings);
        this.currentSettings = validated;
        this.storage.set('settings', JSON.stringify(validated));
        return validated;
    }

    getCurrentSettings() {
        return { ...this.currentSettings };
    }

    getDefaultSettings() {
        return { ...this.defaults };
    }

    resetToDefaults() {
        this.currentSettings = { ...this.defaults };
        this.storage.set('settings', JSON.stringify(this.defaults));
        return this.currentSettings;
    }

    collectFromUI() {
        const time = parseInt(document.getElementById('question-time').value) || 15;
        const mode = document.querySelector('input[name="mode"]:checked').value;
        const count = parseInt(document.getElementById('question-count').value) || 20;
        const activeColorBtn = document.querySelector('.color-btn.active');
        const panelColor = activeColorBtn ? activeColorBtn.dataset.color : '#ffffff';
        const timerColor = document.getElementById('timer-color').value;
        
        return {
            time: Math.min(60, Math.max(4, time)),
            mode: mode,
            count: Math.max(1, count),
            panelColor: panelColor,
            timerColor: timerColor
        };
    }

    applyToUI() {
        const settings = this.currentSettings;
        
        document.getElementById('question-time').value = settings.time;
        document.getElementById('question-count').value = settings.count;
        document.getElementById('timer-color').value = settings.timerColor;
        
        // Set mode radio
        document.querySelectorAll('input[name="mode"]').forEach(input => {
            input.checked = input.value === settings.mode;
        });
        
        // Set color button
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === settings.panelColor);
        });
        
        // Update question count visibility
        const group = document.getElementById('question-count-group');
        if (settings.mode === 'specific_random') {
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
        }
    }
}