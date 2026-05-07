/**
 * 🔗 Python Bridge — Connects Frontend JS to Python Flask Backend
 * ================================================================
 * This module provides a seamless bridge between the existing JS game
 * and the Python backend. It adds optional server-side functionality
 * while keeping the game fully playable client-side.
 *
 * The bridge works in "hybrid mode":
 * - If Python server is running → uses server APIs for persistence & analytics
 * - If no server → falls back gracefully to pure client-side behavior
 */

(function () {
    'use strict';

    const API_BASE = window.location.origin + '/api';
    const WS_URL = window.location.origin;

    // ═══════════════════════════════════════════════════
    // BRIDGE STATE
    // ═══════════════════════════════════════════════════

    const PythonBridge = {
        connected: false,
        socket: null,
        serverAvailable: false,
        lastSyncTime: 0,
        syncInterval: null,
        _eventHandlers: {},

        // ─── Initialization ──────────────────────

        async init() {
            console.log('%c🐍 PythonBridge initializing...', 'color:#4ecdc4;font-weight:bold');

            // Check if Python server is running
            try {
                const resp = await fetch(API_BASE + '/state/summary', {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000),
                });
                if (resp.ok) {
                    this.serverAvailable = true;
                    console.log('%c✅ Python server detected!', 'color:#00d4aa;font-weight:bold');
                    this._initWebSocket();
                    this._startAutoSync();
                    this._showServerBadge(true);
                }
            } catch (e) {
                this.serverAvailable = false;
                console.log('%c⚠️ Python server not running — using client-only mode', 'color:#ffd93d');
                this._showServerBadge(false);
            }

            // Expose globally
            window.PythonBridge = this;
            return this;
        },

        // ─── WebSocket ───────────────────────────

        _initWebSocket() {
            if (typeof io === 'undefined') {
                // Load Socket.IO client dynamically
                const script = document.createElement('script');
                script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
                script.onload = () => this._connectSocket();
                document.head.appendChild(script);
            } else {
                this._connectSocket();
            }
        },

        _connectSocket() {
            try {
                this.socket = io(WS_URL, {
                    reconnection: true,
                    reconnectionDelay: 3000,
                    reconnectionAttempts: 5,
                });

                this.socket.on('connect', () => {
                    this.connected = true;
                    console.log('%c🔌 WebSocket connected', 'color:#4ecdc4');
                });

                this.socket.on('disconnect', () => {
                    this.connected = false;
                    console.log('%c🔌 WebSocket disconnected', 'color:#ff6b6b');
                });

                // Server events
                this.socket.on('new_day', (data) => this._emit('new_day', data));
                this.socket.on('agent_hired', (data) => this._emit('agent_hired', data));
                this.socket.on('agent_fired', (data) => this._emit('agent_fired', data));
                this.socket.on('contract_accepted', (data) => this._emit('contract_accepted', data));
                this.socket.on('game_loaded', (data) => this._emit('game_loaded', data));
                this.socket.on('pong_server', (data) => this._emit('pong', data));

            } catch (e) {
                console.warn('WebSocket init failed:', e.message);
            }
        },

        // ─── Event System ────────────────────────

        on(event, handler) {
            if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
            this._eventHandlers[event].push(handler);
        },

        _emit(event, data) {
            const handlers = this._eventHandlers[event] || [];
            handlers.forEach(h => {
                try { h(data); } catch (e) { console.error(`Bridge event error [${event}]:`, e); }
            });
        },

        // ─── API Calls ───────────────────────────

        async _fetch(endpoint, method = 'GET', body = null) {
            if (!this.serverAvailable) return null;

            try {
                const opts = {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(5000),
                };
                if (body) opts.body = JSON.stringify(body);

                const resp = await fetch(API_BASE + endpoint, opts);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                return await resp.json();
            } catch (e) {
                console.warn(`Bridge API error [${endpoint}]:`, e.message);
                return null;
            }
        },

        // ─── Agent APIs ──────────────────────────

        async getAgents() {
            return await this._fetch('/agents');
        },

        async hireAgent(name, role, model, color) {
            return await this._fetch('/agents/hire', 'POST', { name, role, model, color });
        },

        async fireAgent(agentId) {
            return await this._fetch(`/agents/${agentId}/fire`, 'POST');
        },

        async getRoles() {
            return await this._fetch('/agents/roles');
        },

        // ─── Contract APIs ───────────────────────

        async getContracts() {
            return await this._fetch('/contracts');
        },

        async generateContracts(count = 3) {
            return await this._fetch('/contracts/generate', 'POST', { count });
        },

        async acceptContract(contractId) {
            return await this._fetch(`/contracts/${contractId}/accept`, 'POST');
        },

        // ─── Economy APIs ────────────────────────

        async getEconomy() {
            return await this._fetch('/economy');
        },

        async addCoins(amount, reason) {
            return await this._fetch('/economy/add', 'POST', { amount, reason });
        },

        // ─── Farm APIs ───────────────────────────

        async getFarmStatus() {
            return await this._fetch('/farm');
        },

        async plantCrop(plotId, crop) {
            return await this._fetch('/farm/plant', 'POST', { plot_id: plotId, crop });
        },

        async waterPlot(plotId) {
            return await this._fetch('/farm/water', 'POST', plotId !== undefined ? { plot_id: plotId } : {});
        },

        async harvestCrop(plotId) {
            return await this._fetch('/farm/harvest', 'POST', plotId !== undefined ? { plot_id: plotId } : {});
        },

        async cookRecipe(recipeId) {
            return await this._fetch('/farm/cook', 'POST', { recipe: recipeId });
        },

        async sellProduce() {
            return await this._fetch('/farm/sell', 'POST');
        },

        // ─── Mini-Game APIs ──────────────────────

        async playPoker(bet) {
            return await this._fetch('/minigames/poker', 'POST', { bet });
        },

        async playSlots(bet) {
            return await this._fetch('/minigames/slots', 'POST', { bet });
        },

        async buyGold(coins) {
            return await this._fetch('/minigames/gold/buy', 'POST', { coins });
        },

        async sellGold(amount) {
            return await this._fetch('/minigames/gold/sell', 'POST', { amount });
        },

        async getMiniGameScores() {
            return await this._fetch('/minigames/scores');
        },

        async recordScore(game, score) {
            return await this._fetch('/minigames/score', 'POST', { game, score });
        },

        // ─── Save/Load APIs ─────────────────────

        async saveGame(slot = 'auto') {
            return await this._fetch('/save', 'POST', { slot });
        },

        async loadGame(slot = 'auto') {
            return await this._fetch('/load', 'POST', { slot });
        },

        async listSaves() {
            return await this._fetch('/saves');
        },

        // ─── Game Control APIs ───────────────────

        async newGame() {
            return await this._fetch('/game/new', 'POST');
        },

        async gameTick(delta) {
            return await this._fetch('/game/tick', 'POST', { delta });
        },

        async nextDay() {
            return await this._fetch('/game/next_day', 'POST');
        },

        async setSpeed(speed) {
            return await this._fetch('/game/speed', 'POST', { speed });
        },

        async togglePause() {
            return await this._fetch('/game/pause', 'POST');
        },

        // ─── Analytics APIs ──────────────────────

        async getAnalytics() {
            return await this._fetch('/analytics');
        },

        async getAgentPerformance() {
            return await this._fetch('/analytics/agents');
        },

        // ─── State Sync ─────────────────────────

        syncToServer(stateData) {
            if (this.connected && this.socket) {
                this.socket.emit('sync_state', stateData);
            }
        },

        _startAutoSync() {
            // Sync state to Python every 30s
            this.syncInterval = setInterval(() => {
                if (!this.connected) return;

                // Get current state from JS game
                const gs = window.gameState;
                if (gs) {
                    this.syncToServer({
                        coins: gs.coins,
                        day: gs.day,
                        level: gs.level,
                        xp: gs.xp,
                        reputation: gs.reputation,
                    });
                }
            }, 30000);
        },

        // ─── UI Badge ───────────────────────────

        _showServerBadge(connected) {
            // Add a small indicator showing server status
            let badge = document.getElementById('python-server-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'python-server-badge';
                badge.style.cssText = `
                    position: fixed;
                    bottom: 8px;
                    right: 8px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-family: 'Press Start 2P', monospace;
                    z-index: 99999;
                    pointer-events: none;
                    transition: all 0.3s ease;
                    border: 1px solid;
                `;
                document.body.appendChild(badge);
            }

            if (connected) {
                badge.textContent = '🐍 Python Server';
                badge.style.background = 'rgba(0, 212, 170, 0.15)';
                badge.style.color = '#00d4aa';
                badge.style.borderColor = 'rgba(0, 212, 170, 0.3)';
            } else {
                badge.textContent = '💻 Client Only';
                badge.style.background = 'rgba(255, 217, 61, 0.1)';
                badge.style.color = '#ffd93d';
                badge.style.borderColor = 'rgba(255, 217, 61, 0.2)';
            }

            // Fade out after 5s
            setTimeout(() => { badge.style.opacity = '0.4'; }, 5000);
        },

        // ─── Cleanup ─────────────────────────────

        destroy() {
            if (this.syncInterval) clearInterval(this.syncInterval);
            if (this.socket) this.socket.disconnect();
            this.connected = false;
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PythonBridge.init());
    } else {
        PythonBridge.init();
    }

})();
