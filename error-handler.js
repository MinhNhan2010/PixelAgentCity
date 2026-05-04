/**
 * PixelAgent City — Global Error Handler & Namespace
 * Loaded FIRST before all other scripts.
 * Provides: PAC namespace, error boundary, performance utils.
 */

// ============ GLOBAL NAMESPACE ============
window.PAC = window.PAC || {
    version: '1.1.0',
    debug: false,
    _intervals: [],
    _timeouts: [],
    _eventListeners: [],
};

// ============ ERROR HANDLER ============
PAC.ErrorHandler = {
    errors: [],
    maxErrors: 50,

    init() {
        // Global error catch
        window.onerror = (msg, src, line, col, err) => {
            this.log('error', `${msg} at ${src}:${line}:${col}`, err);
            return false; // Don't suppress default error handling
        };

        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (e) => {
            this.log('promise', `Unhandled rejection: ${e.reason}`, e);
        });

        console.log('%c[PAC] Error handler initialized', 'color: #4ecdc4');
    },

    log(type, message, error = null) {
        const entry = {
            type,
            message,
            stack: error?.stack || '',
            timestamp: new Date().toISOString(),
        };
        this.errors.push(entry);
        if (this.errors.length > this.maxErrors) this.errors.shift();

        // Console output
        console.error(`[PAC:${type}] ${message}`);
        if (error?.stack) console.error(error.stack);

        // Show toast if available
        if (typeof window.showToast === 'function') {
            window.showToast(`⚠️ ${message.substring(0, 60)}...`, 'warning');
        }
    },

    getErrors() {
        return [...this.errors];
    },

    clearErrors() {
        this.errors = [];
    },
};

// ============ SAFE WRAPPER ============
PAC.safe = function(fn, context = 'unknown') {
    return function (...args) {
        try {
            return fn.apply(this, args);
        } catch (e) {
            PAC.ErrorHandler.log('caught', `[${context}] ${e.message}`, e);
            return null;
        }
    };
};

// Async-safe wrapper
PAC.safeAsync = function(fn, context = 'unknown') {
    return async function (...args) {
        try {
            return await fn.apply(this, args);
        } catch (e) {
            PAC.ErrorHandler.log('caught-async', `[${context}] ${e.message}`, e);
            return null;
        }
    };
};

// ============ TIMER MANAGER (prevent leaks) ============
PAC.Timer = {
    _intervals: new Map(),
    _timeouts: new Map(),
    _nextId: 1,

    setInterval(fn, ms, name = '') {
        const id = setInterval(fn, ms);
        const trackId = this._nextId++;
        this._intervals.set(trackId, { id, name, ms, created: Date.now() });
        return trackId;
    },

    clearInterval(trackId) {
        const entry = this._intervals.get(trackId);
        if (entry) {
            clearInterval(entry.id);
            this._intervals.delete(trackId);
        }
    },

    setTimeout(fn, ms, name = '') {
        const trackId = this._nextId++;
        const id = setTimeout(() => {
            fn();
            this._timeouts.delete(trackId);
        }, ms);
        this._timeouts.set(trackId, { id, name, ms, created: Date.now() });
        return trackId;
    },

    clearTimeout(trackId) {
        const entry = this._timeouts.get(trackId);
        if (entry) {
            clearTimeout(entry.id);
            this._timeouts.delete(trackId);
        }
    },

    clearAll() {
        this._intervals.forEach(e => clearInterval(e.id));
        this._timeouts.forEach(e => clearTimeout(e.id));
        this._intervals.clear();
        this._timeouts.clear();
        console.log('[PAC:Timer] All timers cleared');
    },

    getStatus() {
        return {
            activeIntervals: this._intervals.size,
            activeTimeouts: this._timeouts.size,
            details: [...this._intervals.values()].map(e => e.name || `interval-${e.id}`),
        };
    },
};

// ============ PERFORMANCE UTILS ============
PAC.Perf = {
    _debounceTimers: new Map(),

    debounce(fn, ms, key = 'default') {
        return (...args) => {
            if (this._debounceTimers.has(key)) {
                clearTimeout(this._debounceTimers.get(key));
            }
            this._debounceTimers.set(key, setTimeout(() => {
                fn(...args);
                this._debounceTimers.delete(key);
            }, ms));
        };
    },

    throttle(fn, ms) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= ms) {
                lastCall = now;
                return fn(...args);
            }
        };
    },
};

// ============ STORAGE UTILS (safe localStorage) ============
PAC.Storage = {
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            PAC.ErrorHandler.log('storage', `Failed to read '${key}': ${e.message}`);
            return fallback;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            PAC.ErrorHandler.log('storage', `Failed to write '${key}': ${e.message} (possibly full)`);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            PAC.ErrorHandler.log('storage', `Failed to remove '${key}'`);
        }
    },

    getUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += (localStorage.getItem(key) || '').length;
        }
        return {
            usedBytes: total * 2, // UTF-16
            usedKB: ((total * 2) / 1024).toFixed(1),
            maxKB: '5120', // 5MB typical limit
            pct: ((total * 2 / (5 * 1024 * 1024)) * 100).toFixed(1),
        };
    },
};

// Init on load
PAC.ErrorHandler.init();
