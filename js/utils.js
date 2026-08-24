/**
 * Utility Functions
 * Helper functions used across the application
 */

// Fisher-Yates shuffle
export function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Get random item from array
export function randomItem(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

// Debounce function
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

// Format time
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get query parameter
export function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Check if running on mobile
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if running in landscape mode
export function isLandscape() {
    return window.innerWidth > window.innerHeight;
}

// Get device orientation
export function getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

// Copy to clipboard
export function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return Promise.resolve();
    } catch (error) {
        document.body.removeChild(textArea);
        return Promise.reject(error);
    }
}

// Download file
export function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Parse CSV
export function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        result.push(row);
    }
    
    return result;
}

// Convert to CSV
export function toCSV(data, headers) {
    const headerRow = headers.join(',');
    const rows = data.map(item => {
        return headers.map(header => {
            const value = item[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
    });
    
    return [headerRow, ...rows].join('\n');
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Sleep/delay
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if value is valid number
export function isValidNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) && !Number.isNaN(num);
}

// Clamp value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}