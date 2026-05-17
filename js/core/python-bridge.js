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
        ready: false,
        initializing: false,
        lastSyncTime: 0,
        syncInterval: null,
        _eventHandlers: {},

        // ─── Initialization ──────────────────────

        async init() {
            if (this.ready || this.initializing) return this;
            this.initializing = true;
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
            this.ready = true;
            this.initializing = false;
            this._emit('ready', { serverAvailable: this.serverAvailable });
            return this;
        },

        async whenReady(timeoutMs = 2500) {
            if (this.ready) return this;
            const start = Date.now();
            while (!this.ready && Date.now() - start < timeoutMs) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            return this;
        },

        isServerMode() {
            return !!(this.ready && this.serverAvailable);
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
                const payload = await resp.json().catch(() => null);
                if (!resp.ok) {
                    return payload || {
                        success: false,
                        status: 'error',
                        message: `HTTP ${resp.status}`,
                    };
                }
                return payload;
            } catch (e) {
                console.warn(`Bridge API error [${endpoint}]:`, e.message);
                return null;
            }
        },

        // ─── Agent APIs ──────────────────────────

        async _post(endpoint, body = null) {
            return await this._fetch(endpoint, 'POST', body || {});
        },

        async getState() {
            return await this._fetch('/state');
        },

        async getSummary() {
            return await this._fetch('/state/summary');
        },

        normalizeState(state) {
            if (!state) return null;
            const tasksById = state.tasks || {};
            const contracts = Object.values(state.contracts || {});
            const taskDone = (taskId) => {
                const task = tasksById[taskId];
                return task && task.status === 'completed';
            };
            const normalizeContract = (c) => {
                const taskIds = c.tasks || [];
                const acceptedDay = c.accepted_day || c.acceptedDay || 0;
                const deadline = c.deadline_days || c.deadline || 0;
                return {
                    id: c.id,
                    title: c.title || 'Contract',
                    description: c.description || c.client || '',
                    reward: c.reward || 0,
                    deadline,
                    daysRemaining: c.days_remaining ?? (acceptedDay ? Math.max(0, deadline - ((state.day || 1) - acceptedDay)) : deadline),
                    difficulty: c.difficulty || 'easy',
                    requiredRoles: c.required_roles || c.requiredRoles || [],
                    tasksNeeded: taskIds.length || c.tasksNeeded || 0,
                    tasksCompleted: taskIds.filter(taskDone).length || c.tasksCompleted || 0,
                    generatedTasks: taskIds,
                    status: c.status || 'available',
                    acceptedDay,
                };
            };
            const normalizeTask = (t) => ({
                id: t.id,
                title: t.title || 'Task',
                description: t.description || '',
                type: t.type || t.required_role || 'feature',
                priority: t.priority || 'medium',
                status: t.status === 'in_progress' ? 'in-progress' : (t.status || 'pending'),
                assigneeId: t.assigned_agent_id || t.assigneeId || null,
                assignee: t.assigned_agent_id || t.assignee || null,
                progress: t.progress || 0,
                dependsOn: t.depends_on || t.dependsOn || [],
                needsReview: !!(t.needs_review || t.needsReview),
                reviewedBy: t.reviewed_by || t.reviewedBy || null,
                reviewStatus: t.review_status || t.reviewStatus || null,
                createdAt: t.created_at || Date.now(),
                completedAt: t.completed_at || null,
            });
            const normalizedTasks = Object.values(tasksById).map(normalizeTask);
            const normalizedAgents = Object.values(state.agents || {}).map((a) => {
                const currentTaskId = a.current_task_id || a.currentTask?.id || null;
                const currentTask = currentTaskId ? normalizedTasks.find(t => t.id === currentTaskId) || null : null;
                return {
                    id: a.id,
                    name: a.name,
                    role: a.role || 'coder',
                    model: a.model || 'claude-opus',
                    color: a.color || '#4ecdc4',
                    status: a.state || a.status || 'idle',
                    currentTask,
                    progress: currentTask?.progress || 0,
                    tasksCompleted: a.tasks_completed ?? a.tasksCompleted ?? 0,
                    linesWritten: a.lines_written ?? a.linesWritten ?? 0,
                    filesModified: a.files_modified ?? a.filesModified ?? 0,
                    commits: a.commits || 0,
                    mood: a.mood ?? 80,
                    energy: a.energy ?? 100,
                    skillLevel: a.skill_level ?? a.skillLevel ?? 1,
                    level: a.level ?? a.skill_level ?? 1,
                    xp: a.experience ?? a.xp ?? 0,
                    charIndex: a.char_index ?? a.charIndex ?? 0,
                    createdAt: a.hired_at || Date.now(),
                    lastActive: a.last_task_time || Date.now(),
                };
            });
            return {
                ...state,
                companyLevel: state.level || 1,
                companyXP: state.xp || 0,
                gameSpeed: state.speed || 1,
                isPaused: !!state.paused,
                dayTimer: (state.day_progress || 0) * 120,
                availableContracts: contracts.filter(c => c.status === 'available').map(normalizeContract),
                activeContracts: contracts.filter(c => c.status === 'active').map(normalizeContract),
                completedContracts: state.contracts_completed || 0,
                failedContracts: state.contracts_failed || 0,
                tasks: normalizedTasks,
                agents: normalizedAgents,
            };
        },

        applyStateToClient(targets, state) {
            const normalized = this.normalizeState(state);
            if (!normalized || !targets) return null;
            const { game, manager, farmManager, shopManager, techTree, engine } = targets;

            if (game) {
                game.coins = normalized.coins ?? game.coins;
                game.totalEarned = normalized.total_earned ?? game.totalEarned;
                game.totalSpent = normalized.total_spent ?? game.totalSpent;
                game.day = normalized.day ?? game.day;
                game.dayTimer = normalized.dayTimer ?? game.dayTimer;
                game.reputation = normalized.reputation ?? game.reputation;
                game.companyLevel = normalized.companyLevel;
                game.companyXP = normalized.companyXP;
                game.gameSpeed = normalized.gameSpeed;
                game.isPaused = normalized.isPaused;
                game.availableContracts = normalized.availableContracts;
                game.activeContracts = normalized.activeContracts;
                game.completedContracts = normalized.completedContracts;
                game.failedContracts = normalized.failedContracts;
                game.unlockedRooms = normalized.unlocked_rooms || game.unlockedRooms;
            }

            if (manager) {
                manager.tasks = normalized.tasks;
                manager.agents = new Map(normalized.agents.map(agent => [agent.id, agent]));
                manager.stats = { ...(manager.stats || {}), ...(normalized.agent_stats || {}) };
                manager.logs = normalized.agent_logs || manager.logs || [];
                manager.performanceHistory = normalized.agent_performance_history || manager.performanceHistory || [];
                if (engine) {
                    const agentIds = new Set(normalized.agents.map(agent => agent.id));
                    if (engine.agentSprites && typeof engine.removeAgentSprite === 'function') {
                        Array.from(engine.agentSprites.keys()).forEach(id => {
                            if (!agentIds.has(id)) engine.removeAgentSprite(id);
                        });
                    }
                    normalized.agents.forEach(agent => {
                        const existing = engine.agentSprites?.get?.(agent.id);
                        if (!existing && typeof engine.addAgentSprite === 'function') engine.addAgentSprite(agent);
                        else if (typeof engine.updateAgentStatus === 'function') engine.updateAgentStatus(agent.id, agent.status);
                    });
                }
            }

            if (farmManager) {
                if (Array.isArray(normalized.farm_plots) && normalized.farm_plots.length) {
                    farmManager.plots = normalized.farm_plots.map(p => ({
                        id: p.id,
                        state: p.stage === 'empty' ? 'empty' : (p.stage === 'ready' ? 'ready' : 'growing'),
                        seedId: p.crop,
                        plantedDay: p.planted_at || 0,
                        growthStage: p.stage === 'ready' ? 3 : Math.max(0, Math.min(3, Math.floor((p.growth || 0) / 34))),
                        watered: !!p.watered,
                        wateredByAgent: null,
                        daysGrown: p.growth || 0,
                    }));
                }
                const produce = {};
                (normalized.inventory || []).forEach(item => {
                    if (item.category === 'produce') produce[item.id] = item.quantity || 0;
                });
                farmManager.inventory = Object.keys(produce).length ? produce : (normalized.farm_inventory || farmManager.inventory || {});
                farmManager.weather = normalized.weather || farmManager.weather;
            }

            if (shopManager) {
                shopManager.inventory = normalized.shop_inventory || shopManager.inventory || {};
                shopManager.equippedItems = normalized.shop_equipped_items || shopManager.equippedItems || {};
                shopManager.activeBuffs = normalized.shop_active_buffs || shopManager.activeBuffs || [];
                shopManager.globalBonuses = normalized.shop_global_bonuses || shopManager.globalBonuses || {};
                const dailySpecials = normalized.shop_daily_specials || shopManager.dailySpecials || [];
                shopManager.dailySpecials = Array.isArray(dailySpecials)
                    ? dailySpecials.map(item => typeof item === 'string' ? shopManager.catalog?.getById?.(item) : item).filter(Boolean)
                    : [];
                shopManager.stats = normalized.shop_stats || shopManager.stats || {};
            }

            if (techTree) {
                techTree.unlocked = new Set(normalized.tech_unlocked || []);
                techTree.currentResearch = normalized.tech_current_research || null;
                techTree.researchProgress = normalized.tech_research_progress || 0;
            }

            return normalized;
        },

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

        async playPokerTournament(players) {
            return await this._fetch('/minigames/poker/tournament', 'POST', { players });
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

        // Converted core systems that keep JS as renderer/UI only.

        async getAgentLogs(limit = 100) {
            return await this._fetch(`/agents/logs?limit=${encodeURIComponent(limit)}`);
        },

        async getAgent(agentId) {
            return await this._fetch(`/agents/${agentId}`);
        },

        async assignTask(agentId, taskId) {
            return await this._post(`/agents/${agentId}/assign`, { task_id: taskId });
        },

        async goldTick() {
            return await this._post('/minigames/gold/tick');
        },

        async playBilliards(players, turns = 24) {
            return await this._post('/minigames/billiards', { players, turns });
        },

        async playCafe(bet, recipe = 'espresso', stops = null) {
            return await this._post('/minigames/cafe', { bet, recipe, stops });
        },

        async playFishing(bet, skill = 0.65) {
            return await this._post('/minigames/fishing', { bet, skill });
        },

        async submitFishingScore(bet, fishName, won, weight) {
            return await this._post('/minigames/fishing/score', { bet, fish_name: fishName, won, weight });
        },

        async playFighter(bet, fighter = 'pixel_ryu') {
            return await this._post('/minigames/fighter', { bet, fighter });
        },

        async submitFighterScore(bet, fighter, won, perfect) {
            return await this._post('/minigames/fighter/score', { bet, fighter, won, perfect });
        },

        async playFlappy(bet, skill = 0.55) {
            return await this._post('/minigames/flappy', { bet, skill });
        },

        async submitFlappyScore(bet, score) {
            return await this._post('/minigames/flappy/score', { bet, score });
        },

        async playRoadRacer(bet, skill = 0.55) {
            return await this._post('/minigames/road-racer', { bet, skill });
        },

        async submitRoadRacerScore(bet, score, coins) {
            return await this._post('/minigames/road-racer/score', { bet, score, coins });
        },

        async getAchievements() {
            return await this._fetch('/achievements');
        },

        async checkAchievements() {
            return await this._post('/achievements/check');
        },

        async getTechStatus() {
            return await this._fetch('/tech');
        },

        async startResearch(techId) {
            return await this._post('/tech/research', { tech_id: techId });
        },

        async cancelResearch() {
            return await this._post('/tech/cancel');
        },

        async tickResearch() {
            return await this._post('/tech/tick');
        },

        async getShopStatus() {
            return await this._fetch('/shop');
        },

        async buyItem(itemId, qty = 1) {
            return await this._post('/shop/buy', { item_id: itemId, qty });
        },

        async sellItem(itemId, qty = 1) {
            return await this._post('/shop/sell', { item_id: itemId, qty });
        },

        async useItem(itemId, agentId = null) {
            return await this._post('/shop/use', { item_id: itemId, agent_id: agentId });
        },

        async refreshDailyShop() {
            return await this._post('/shop/daily');
        },

        async getLayoutStatus() {
            return await this._fetch('/layout');
        },

        async placeFurniture(type, tx, ty) {
            return await this._post('/layout/place', { type, tx, ty });
        },

        async eraseFurniture(tx, ty) {
            return await this._post('/layout/erase', { tx, ty });
        },

        async paintFloor(tx, ty, floor = 'wood') {
            return await this._post('/layout/floor', { tx, ty, floor });
        },

        async paintWall(tx, ty) {
            return await this._post('/layout/wall', { tx, ty });
        },

        async undoLayout() {
            return await this._post('/layout/undo');
        },

        async redoLayout() {
            return await this._post('/layout/redo');
        },

        async applyLayout(data) {
            return await this._post('/layout/apply', data || {});
        },

        async openChat(agentId) {
            return await this._post('/chat/open', { agent_id: agentId });
        },

        async sendChat(agentId, text, key = null) {
            return await this._post('/chat/send', { agent_id: agentId, text, key });
        },

        async getChatHistory(agentId = null) {
            const q = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : '';
            return await this._fetch('/chat/history' + q);
        },

        async getStatistics() {
            return await this._fetch('/statistics');
        },

        async recordStatisticsDay() {
            return await this._post('/statistics/record');
        },

        async getErrors() {
            return await this._fetch('/errors');
        },

        async clearErrors() {
            return await this._fetch('/errors', 'DELETE');
        },

        async logError(type, message) {
            return await this._post('/errors/log', { type, message });
        },

        async getAppMetadata() {
            return await this._fetch('/app/metadata');
        },

        async buyRoom(roomId) {
            return await this._post('/rooms/buy', { room_id: roomId });
        },

        async getBridgeStatus() {
            return await this._fetch('/bridge');
        },

        async setDayProgress(progress) {
            return await this._post('/game/day-progress', { progress });
        },

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
                if (gs && !gs.__pythonCoreOwned) {
                    this.syncToServer({
                        coins: gs.coins,
                        day: gs.day,
                        level: gs.companyLevel ?? gs.level,
                        xp: gs.companyXP ?? gs.xp,
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

    window.PythonBridge = PythonBridge;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PythonBridge.init());
    } else {
        PythonBridge.init();
    }

})();
