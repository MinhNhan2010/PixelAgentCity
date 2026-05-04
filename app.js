/**
 * PixelAgent City — Main App Controller (Game Mode)
 * Fixed: correct PixelEngine API, proper Start Screen flow, addAgentSprite
 */
(function () {
    'use strict';

    let _gameStartTime = null;

    let engine, manager, editor, chatbox, game, techTree, farmManager, statsDashboard;

    // Shared constants
    const ROLE_EMOJIS = {
        coder: '💻', tester: '🧪', reviewer: '📝', designer: '🎨',
        devops: '🔧', researcher: '🔬', analyst: '📊', security: '🔒',
        backend: '⚙️', mobile: '📱', writer: '✍️', farmer: '🌾'
    };

    // ============ START SCREEN ============
    function initStartScreen() {
        // Animated particles
        const pc = document.getElementById('startParticles');
        if (pc) {
            for (let i = 0; i < 40; i++) {
                const s = document.createElement('div');
                s.className = 'sp';
                s.style.left = Math.random() * 100 + '%';
                s.style.animationDuration = (6 + Math.random() * 8) + 's';
                s.style.animationDelay = Math.random() * 5 + 's';
                s.style.width = (1 + Math.random() * 2) + 'px';
                s.style.height = s.style.width;
                const colors = ['#4ecdc4', '#6c5ce7', '#ffd93d', '#ff6b6b', '#78e08f'];
                s.style.background = colors[Math.floor(Math.random() * colors.length)];
                pc.appendChild(s);
            }
        }

        drawStartLogo();

        // Check for saved game (show Continue button)
        const tempGame = new GameState();
        const hasSave = tempGame.loadGame();
        const btnContinue = document.getElementById('btnContinue');
        if (hasSave && btnContinue) {
            btnContinue.style.display = 'flex';
        }

        // Button events
        document.getElementById('btnNewGame').onclick = startNewGame;
        if (btnContinue) btnContinue.onclick = continueGame;
        document.getElementById('btnHowToPlay').onclick = () =>
            document.getElementById('modalHowToPlay').classList.add('active');
        document.getElementById('closeHowToPlay').onclick = () =>
            document.getElementById('modalHowToPlay').classList.remove('active');

        const closeHtp2 = document.getElementById('closeHowToPlay2');
        if (closeHtp2) closeHtp2.onclick = () =>
            document.getElementById('modalHowToPlay').classList.remove('active');
    }

    function drawStartLogo() {
        const c = document.getElementById('startLogoCanvas');
        if (!c) return;
        const ctx = c.getContext('2d');
        const p = [
            '..####..',
            '.#....#.',
            '#.####.#',
            '#.#..#.#',
            '#.#..#.#',
            '#.####.#',
            '#......#',
            '########',
        ];
        const s = 8;
        ctx.clearRect(0, 0, 64, 64);
        p.forEach((row, y) => {
            [...row].forEach((ch, x) => {
                if (ch === '#') {
                    ctx.fillStyle = '#4ecdc4';
                    ctx.fillRect(x * s, y * s, s, s);
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.fillRect(x * s, y * s, s, 1);
                }
            });
        });
    }

    function drawLogoSmall() {
        const c = document.getElementById('logoCanvas');
        if (!c) return;
        const ctx = c.getContext('2d');
        const p = ['..##..', '.#..#.', '#.##.#', '#.##.#', '#....#', '######'];
        const s = 5;
        ctx.clearRect(0, 0, 32, 32);
        p.forEach((row, y) => {
            [...row].forEach((ch, x) => {
                if (ch === '#') {
                    ctx.fillStyle = '#4ecdc4';
                    ctx.fillRect(x * s + 1, y * s + 1, s, s);
                }
            });
        });
    }

    // ============ GAME FLOW ============
    function startNewGame() {
        // Cleanup previous game world if any
        cleanupGameWorld();

        // Clear all old data
        localStorage.removeItem('pixelAgentData');
        localStorage.removeItem('pixelAgentLayout');
        localStorage.removeItem('pixelAgentGameState');
        localStorage.removeItem('pixelAgentTechTree');
        localStorage.removeItem('pixelAgentFarm');

        game = new GameState();
        game.startNewGame();
        hideStartScreen();
        _gameStartTime = Date.now();
        initGameWorld(true);
    }

    function continueGame() {
        game = new GameState();
        game.loadGame();
        game.continueGame();
        hideStartScreen();
        _gameStartTime = Date.now();
        initGameWorld(false);
    }

    function hideStartScreen() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameHeader').style.display = '';
        document.getElementById('gameHud').style.display = '';
        document.getElementById('mainContent').style.display = '';
        document.getElementById('footerBar').style.display = '';
    }

    function showStartScreen() {
        // Cleanup previous game world
        cleanupGameWorld();

        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameHeader').style.display = 'none';
        document.getElementById('gameHud').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('footerBar').style.display = 'none';
        document.getElementById('gameOverOverlay').classList.remove('show');
        const win = document.getElementById('winOverlay');
        win.style.display = 'none';
        win.classList.remove('show');
        // Refresh continue button
        const tempGame = new GameState();
        const btn = document.getElementById('btnContinue');
        if (btn) btn.style.display = tempGame.loadGame() ? 'flex' : 'none';
    }

    // ============ CLEANUP (prevent leaks on restart) ============
    function cleanupGameWorld() {
        // Clear all managed timers
        PAC.Timer.clearAll();

        // Destroy engine (stops animation loop, removes canvas listeners)
        if (engine && typeof engine.destroy === 'function') {
            engine.destroy();
        }

        // Destroy chatbox (removes drag listeners on document)
        if (chatbox && typeof chatbox.destroy === 'function') {
            chatbox.destroy();
        }

        // Nullify references so old closures can be GC'd
        engine = null;
        manager = null;
        editor = null;
        chatbox = null;
        techTree = null;
        farmManager = null;
        statsDashboard = null;
        window._agentManager = null;
        window._farmManager = null;
    }

    // ============ WORLD INIT ============
    function initGameWorld(isNewGame) {
        drawLogoSmall();

        // PixelEngine takes string IDs (canvas ID, minimap ID, unlockedRooms)
        engine = new PixelEngine('officeCanvas', 'minimapCanvas', game.unlockedRooms);

        // AgentManager takes engine reference
        manager = new AgentManager(engine);

        // Tech Tree
        techTree = new TechTree(game);
        window._agentManager = manager; // for TechTree researcher counting

        // Farm Manager
        farmManager = new FarmManager(game);
        window._farmManager = farmManager; // for pixel-engine plot rendering

        // LayoutEditor takes engine reference
        editor = new LayoutEditor(engine);
        editor.loadSavedLayout(true);

        // Chatbox
        chatbox = new AgentChatbox(manager, engine);

        // Connect game callbacks
        connectGameCallbacks();

        // Room shop button
        wireRoomShopBtn();

        // Load saved agent data OR create starter agents
        if (isNewGame) {
            createStarterAgents();
        } else {
            const loaded = manager.loadFromStorage();
            if (!loaded || manager.agents.size === 0) {
                createStarterAgents();
            }
            // Load tech tree data
            try {
                const ttRaw = localStorage.getItem('pixelAgentTechTree');
                if (ttRaw) techTree.loadData(JSON.parse(ttRaw));
            } catch(e) { console.warn('TechTree load failed:', e); }
            // Load farm data
            try {
                const farmRaw = localStorage.getItem('pixelAgentFarm');
                if (farmRaw) farmManager.loadData(JSON.parse(farmRaw));
            } catch(e) { console.warn('Farm load failed:', e); }
        }

        bindUIEvents();

        // Game loop (day/night tick every frame)
        let lastTick = performance.now();
        function loop(ts) {
            const dt = (ts - lastTick) / 1000;
            lastTick = ts;
            if (game && game.started && !game.isGameOver) {
                game.tickDay(dt);
                // Night overlay
                const nightEl = document.getElementById('nightOverlay');
                if (nightEl) nightEl.style.background = `rgba(5,5,30,${game.getNightOverlayAlpha() * 0.35})`;
                // Day fill bar
                const dayFill = document.getElementById('hudDayFill');
                if (dayFill) dayFill.style.width = game.getDayProgress() + '%';
                // Time icon
                const timeIcon = document.getElementById('hudTimeIcon');
                if (timeIcon) timeIcon.textContent = game.getTimeIcon();
                // Day transition
                if (game.showingDayTransition) {
                    showDayTransition();
                    game.showingDayTransition = false;
                }
            }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        // === Statistics Dashboard ===
        statsDashboard = new StatsDashboard();
        try {
            const statsRaw = localStorage.getItem('pixelAgentStats');
            if (statsRaw) statsDashboard.loadData(JSON.parse(statsRaw));
        } catch(e) { console.warn('Stats load failed:', e); }

        // Simulation tick (agent AI) — tracked via PAC.Timer
        PAC.Timer.setInterval(() => {
            try {
                if (!game.isPaused && !game.isGameOver && game.started) {
                    for (let i = 0; i < game.gameSpeed; i++) {
                        manager.simulateTick();
                    }
                    // Sync engine sprites with agent statuses
                    manager.agents.forEach(a => {
                        engine.updateAgentStatus(a.id, a.status);
                    });
                }
            } catch (e) {
                PAC.ErrorHandler.log('tick', `simulateTick error: ${e.message}`, e);
            }
        }, 500, 'simulation-tick');

        // HUD refresh every second
        PAC.Timer.setInterval(() => {
            try {
                if (game.started && !game.isGameOver) {
                    refreshHUD();
                    refreshAgentList();
                    refreshTaskList();
                }
            } catch (e) {
                PAC.ErrorHandler.log('hud', `refreshHUD error: ${e.message}`, e);
            }
        }, 1000, 'hud-refresh');

        // Auto-save every 30s
        PAC.Timer.setInterval(() => {
            try {
                if (game.started && !game.isGameOver) {
                    editor?.flushAutoSave?.();
                    game.updateSalaryCache(Array.from(manager.agents.values()));
                    game.saveGame(manager);
                    manager.saveToStorage();
                    // Save tech tree
                    try { localStorage.setItem('pixelAgentTechTree', JSON.stringify(techTree.saveData())); } catch(e) { console.warn('TechTree auto-save failed:', e); }
                    // Save farm
                    try { localStorage.setItem('pixelAgentFarm', JSON.stringify(farmManager.saveData())); } catch(e) { console.warn('Farm auto-save failed:', e); }
                    // Save stats
                    try { localStorage.setItem('pixelAgentStats', JSON.stringify(statsDashboard.saveData())); } catch(e) {}
                }
            } catch (e) {
                PAC.ErrorHandler.log('save', `Auto-save error: ${e.message}`, e);
            }
        }, 30000, 'auto-save');

        window.addEventListener('beforeunload', () => {
            editor?.flushAutoSave?.();
        });

        // Initial data
        setTimeout(() => {
            game.generateContracts(3);
            refreshHUD();
            refreshAgentList();
            refreshTaskList();
            refreshRoleSelect();
            updateClock();
        }, 200);

        PAC.Timer.setInterval(updateClock, 1000, 'clock-refresh');
        createParticles();

        // === NEW: Achievement System ===
        initAchievements();

        // === NEW: Tech Tree System ===
        initTechTreeUI();

        // === NEW: Notification Center ===
        initNotificationCenter();

        // === NEW: Settings Panel ===
        initSettingsPanel();

        // === NEW: Keyboard Shortcuts ===
        initKeyboardShortcuts();

        // === NEW: Farm System ===
        initFarmUI();
        // Agent farm callback
        manager.onFarmRequest = (agent, actionType) => {
            if (!farmManager) return;
            if (actionType === 'water') {
                const plot = farmManager.plots.find(p => p.state === 'growing' && !p.watered);
                if (plot) {
                    farmManager.waterPlot(plot.id);
                    manager.addLog(agent.name, `💧 Đã tưới luống ${plot.id + 1}`, 'info');
                    agent.mood = Math.min(100, (agent.mood || 70) + 3);
                }
            } else if (actionType === 'harvest') {
                const plot = farmManager.plots.find(p => p.state === 'ready');
                if (plot) {
                    const result = farmManager.harvestPlot(plot.id);
                    if (result) {
                        manager.addLog(agent.name, `🌾 Thu hoạch ${result.name} x${result.qty}!`, 'success');
                        showToast(`🌾 ${agent.name} thu hoạch ${result.name}!`, 'success');
                        agent.mood = Math.min(100, (agent.mood || 70) + 5);
                        manager.gainXP(agent.id, 2);
                    }
                }
            }
        };

        // === NEW: Auto-Chat hook (in simulation tick) ===
        PAC.Timer.setInterval(() => {
            try {
                if (!game.isPaused && !game.isGameOver && game.started && _autoChatEnabled) {
                    manager.autoChat();
                }
            } catch (e) {
                PAC.ErrorHandler.log('chat', `autoChat error: ${e.message}`, e);
            }
        }, 500, 'auto-chat');

        // === NEW: Achievement check every 5s ===
        PAC.Timer.setInterval(() => {
            try {
                if (game.started && !game.isGameOver && _achievements) {
                    _achievements.check(game, manager);
                }
            } catch (e) {
                PAC.ErrorHandler.log('achieve', `achievement check error: ${e.message}`, e);
            }
        }, 5000, 'achievement-check');
    }

    function createStarterAgents() {
        manager.createAgent({ name: 'PixelCoder-01', role: 'coder', model: 'claude-sonnet', color: '#4ecdc4' });
        manager.createAgent({ name: 'TestBot-01', role: 'tester', model: 'gemini-pro', color: '#ffd93d' });
        manager.addLog('system', '👋 Studio khởi động! Chào mừng đến PixelAgent City!', 'success');
    }

    // ============ GAME CALLBACKS ============
    function connectGameCallbacks() {
        game.onCoinsChange = (amount) => {
            showCoinPopup(amount);
            const el = document.querySelector('.hud-coins .hud-value');
            if (el) {
                el.classList.add('bump');
                setTimeout(() => el.classList.remove('bump'), 200);
            }
        };

        game.onDayEnd = (day, salary) => {
            manager.addLog('system', `📅 Ngày ${day} bắt đầu! Lương đã trả: -${salary}Ⓒ`, 'warning');
            // Tick tech tree research
            if (techTree) techTree.tickResearch();
            // Tick farm growth + weather
            if (farmManager) {
                const farmReport = farmManager.tickDay();
                if (farmReport && farmReport.readyCount > 0) {
                    showToast(`🌾 ${farmReport.readyCount} luống đã sẵn sàng thu hoạch!`, 'success');
                    manager.addLog('system', `🌾 ${farmReport.readyCount} cây đã chín! Thời tiết: ${farmReport.weather}`, 'info');
                }
                updateFarmWeatherDisplay();
            }
            // Record daily statistics
            if (statsDashboard) {
                try { statsDashboard.recordDay(game, manager); } catch(e) {}
            }
            refreshHUD();
        };

        game.onContractComplete = (contract, bonus) => {
            showToast(`✅ "${contract.title}" hoàn thành! +${contract.reward + bonus}Ⓒ`, 'success');
            manager.addLog('system', `🎉 Contract "${contract.title}" xong! +${contract.reward + bonus}Ⓒ`, 'success');
        };

        game.onContractFail = (contract) => {
            showToast(`❌ "${contract.title}" thất bại! Rep -0.4`, 'error');
            manager.addLog('system', `💔 Contract "${contract.title}" hết hạn!`, 'error');
        };

        game.onLevelUp = (level, milestone) => {
            showLevelUp(level, milestone);
            manager.addLog('system', `🎊 Level Up → ${level}: ${milestone.title}`, 'success');
            refreshRoleSelect();
            if (level >= 10) showWinScreen();
        };

        game.onGameOver = () => showGameOver();

        game.onNewContracts = () => {
            const badge = document.getElementById('hudContractBadge');
            if (badge) badge.textContent = game.availableContracts.length;
        };

        // Hook completeTask to report to game
        const origComplete = manager.completeTask.bind(manager);
        manager.completeTask = function(taskId) {
            const taskBefore = this.tasks.find(t => t.id === taskId);
            const previousStatus = taskBefore?.status;
            origComplete(taskId);
            const taskAfter = this.tasks.find(t => t.id === taskId);
            if (game) {
                const justCompleted = previousStatus !== 'completed' && taskAfter?.status === 'completed';
                if (justCompleted) {
                    game.onTaskCompleted(taskId);
                    game.sfx.taskComplete();
                }
            }
        };

        // === POKER SYSTEM ===
        let _pokerUI = null;
        let _pokerGame = null;
        let _pokerPlayers = null;

        manager.onPokerRequest = (players) => {
            if (_pokerGame) return; // Already playing
            _pokerPlayers = players;
            game._pokerPlayed = true; // Achievement tracking

            // === COIN STAKE SYSTEM ===
            const STAKE_PER_PLAYER = 20;
            // Filter to agents that can afford the stake
            const eligiblePlayers = players.filter(p => game.canAfford(STAKE_PER_PLAYER) || true); // all can try
            const stakingPlayers = players.filter(() => game.canAfford(STAKE_PER_PLAYER));
            let totalStake = 0;
            stakingPlayers.forEach(p => {
                if (game.spend(STAKE_PER_PLAYER, `Poker stake: ${p.name}`)) {
                    p._pokerStaked = STAKE_PER_PLAYER;
                    totalStake += STAKE_PER_PLAYER;
                } else {
                    p._pokerStaked = 0;
                }
            });
            // Players without stake still play for fun (chips only)
            players.forEach(p => { if (p._pokerStaked === undefined) p._pokerStaked = 0; });

            if (totalStake > 0) {
                manager.addLog('system', `🎰 Poker stake: -${STAKE_PER_PLAYER}Ⓒ/người. Tổng pool: ${totalStake}Ⓒ`, 'warning');
                showToast(`🎰 Poker stake pool: ${totalStake}Ⓒ`, 'warning');
            }

            const roleEmojis = ROLE_EMOJIS;

            _pokerGame = new PokerGame({ stepDelay: 1200 });

            players.forEach(a => {
                const emoji = roleEmojis[a.role] || '🤖';
                _pokerGame.addPlayer(a.id, a.name, a.role || 'coder', emoji, 200);
            });

            // Create poker UI
            const overlayEl = document.getElementById('pokerOverlay');
            _pokerUI = new PokerUI(overlayEl, _pokerGame);

            // Connect callbacks
            _pokerGame.onUpdate = () => _pokerUI?.render(_pokerGame.getState());
            _pokerGame.onPhaseChange = (phase) => {
                _pokerUI?.render(_pokerGame.getState());
                if (phase === 'showdown') {
                    manager.addLog('system', '🃏 Poker: Showdown!', 'info');
                }
            };
            _pokerGame.onHandComplete = (gameRef) => {
                _pokerUI?.render(gameRef.getState());
                const lastResult = gameRef.history[gameRef.history.length - 1];
                if (lastResult) {
                    const winner = _pokerPlayers.find(p => p.id === lastResult.winnerId);
                    if (winner) {
                        manager.addLog(winner.name, `🏆 Thắng ván poker! +${lastResult.amount} chips (${lastResult.handName})`, 'success');
                        showToast(`🃏 ${winner.name} thắng ván poker!`, 'success');
                        if (winner.mood   !== undefined) winner.mood   = Math.min(100, winner.mood   + 8);
                        if (winner.energy !== undefined) winner.energy = Math.min(100, winner.energy + 3);
                        engine.showSpeechBubble(winner.id, '🏆 Tôi thắng!', 3000);
                    }
                }
                if (gameRef.phase === 'finished') {
                    manager.addLog('system', '🃏 Kết thúc phiên poker!', 'info');
                }
            };
            _pokerGame.onGameLog = () => {};  // suppress console spam

            // On close — settle coin stakes with tournament winner
            _pokerUI.onClose = () => {
                // Determine tournament winner (most chips)
                if (_pokerGame && totalStake > 0) {
                    const sortedByChips = [..._pokerGame.players].sort((a, b) => b.chips - a.chips);
                    const tournamentWinner = _pokerPlayers.find(p => p.id === sortedByChips[0]?.id);
                    if (tournamentWinner) {
                        game.earn(totalStake, `Poker winnings: ${tournamentWinner.name}`);
                        manager.addLog(tournamentWinner.name,
                            `🏆 Thắng giải poker! +${totalStake}Ⓒ vào quỹ công ty!`, 'success');
                        showToast(`🏆 ${tournamentWinner.name} thắng ${totalStake}Ⓒ poker prize!`, 'success');
                        engine.showSpeechBubble(tournamentWinner.id, `💰 +${totalStake}Ⓒ!`, 4000);
                        engine.spawnInteractionFx(25, 15, '💰');
                        if (tournamentWinner.mood !== undefined)
                            tournamentWinner.mood = Math.min(100, tournamentWinner.mood + 15);
                    }
                }

                _pokerGame = null;
                _pokerUI = null;
                if (_pokerPlayers) {
                    _pokerPlayers.forEach(p => {
                        p._isPlayingPoker = false;
                        p._pokerStaked = 0;
                        // Participation mood boost for all
                        if (p.mood !== undefined) p.mood = Math.min(100, p.mood + 3);
                    });
                    _pokerPlayers = null;
                }
                totalStake = 0;
            };

            // Show and start
            _pokerUI.show();
            manager.addLog('system', `🃏 Phiên poker bắt đầu với ${players.length} người chơi!`, 'info');
            showToast(`🃏 Phiên poker bắt đầu!`, 'info');
        };

        // Also allow clicking the poker table in the engine to open poker
        engine.onInteractionClick = (point) => {
            if (point.type === 'poker' && !_pokerGame) {
                // Manually trigger poker with all idle agents
                const idleAgents = Array.from(manager.agents.values()).filter(a =>
                    a.status === 'idle' && !a._isRoaming && !a._isPlayingPoker
                ).slice(0, 4);
                if (idleAgents.length >= 2) {
                    manager.onPokerRequest(idleAgents);
                } else {
                    showToast('🃏 Cần ít nhất 2 agent rảnh để chơi poker!', 'warning');
                }
            }
            if (point.type === 'billiard' && !_billiardGame) {
                // Manually trigger billiard with 2 idle agents
                const idleAgents = Array.from(manager.agents.values()).filter(a =>
                    a.status === 'idle' && !a._isRoaming && !a._isPlayingPoker && !a._isPlayingBilliard
                ).slice(0, 2);
                if (idleAgents.length >= 2) {
                    manager.onBilliardRequest(idleAgents);
                } else {
                    showToast('🎱 Cần ít nhất 2 agent rảnh để chơi billiard!', 'warning');
                }
            }
            if (point.type === 'slot') {
                // Open Slot Machine — player or agent
                if (!_slotUI || !_slotUI.overlay.classList.contains('show')) {
                    openSlotMachine();
                }
            }
            if (point.type === 'gold_trade') {
                // Open Gold Trading Terminal
                if (!_goldUI || !_goldUI.overlay.classList.contains('show')) {
                    openGoldTrading();
                }
            }
        };

        // === BILLIARD SYSTEM ===
        let _billiardUI = null;
        let _billiardGame = null;
        let _billiardPlayers = null;

        manager.onBilliardRequest = (players) => {
            if (_billiardGame) return; // Already playing
            _billiardPlayers = players;
            game._billiardPlayed = true; // Achievement tracking

            // === COIN STAKE SYSTEM ===
            const STAKE_PER_PLAYER = 15;
            let totalStake = 0;
            players.forEach(p => {
                if (game.spend(STAKE_PER_PLAYER, `Billiard stake: ${p.name}`)) {
                    p._billiardStaked = STAKE_PER_PLAYER;
                    totalStake += STAKE_PER_PLAYER;
                } else {
                    p._billiardStaked = 0;
                }
            });

            if (totalStake > 0) {
                manager.addLog('system', `🎱 Billiard stake: -${STAKE_PER_PLAYER}Ⓒ/người. Tổng pool: ${totalStake}Ⓒ`, 'warning');
                showToast(`🎱 Billiard stake pool: ${totalStake}Ⓒ`, 'warning');
            }

            const roleEmojis = ROLE_EMOJIS;

            _billiardGame = new BilliardGame({ stepDelay: 2200 });

            players.forEach(a => {
                const emoji = roleEmojis[a.role] || '🤖';
                _billiardGame.addPlayer(a.id, a.name, a.role || 'coder', emoji);
            });

            // Create billiard UI
            const overlayEl = document.getElementById('billiardOverlay');
            _billiardUI = new BilliardUI(overlayEl, _billiardGame);

            // Connect callbacks
            _billiardUI.attach(_billiardGame);

            _billiardGame.onGameComplete = (gameRef) => {
                _billiardUI._updateScoreboard();
                _billiardUI._updateControls();
                const winner = gameRef.winner;
                if (winner) {
                    const agent = _billiardPlayers.find(p => p.id === winner.id);
                    if (agent) {
                        manager.addLog(agent.name, `🏆 Thắng trận billiard!`, 'success');
                        showToast(`🎱 ${agent.name} thắng trận billiard!`, 'success');
                        if (agent.mood !== undefined) agent.mood = Math.min(100, agent.mood + 8);
                        if (agent.energy !== undefined) agent.energy = Math.min(100, agent.energy + 3);
                        engine.showSpeechBubble(agent.id, '🏆 Thắng billiard!', 3000);
                    }
                }
            };

            // On close — settle coin stakes
            _billiardUI.onClose = () => {
                if (_billiardGame && totalStake > 0) {
                    const winner = _billiardGame.winner;
                    const winnerAgent = winner ? _billiardPlayers.find(p => p.id === winner.id) : null;
                    if (winnerAgent) {
                        game.earn(totalStake, `Billiard winnings: ${winnerAgent.name}`);
                        manager.addLog(winnerAgent.name,
                            `🏆 Thắng trận billiard! +${totalStake}Ⓒ vào quỹ công ty!`, 'success');
                        showToast(`🏆 ${winnerAgent.name} thắng ${totalStake}Ⓒ billiard prize!`, 'success');
                        engine.showSpeechBubble(winnerAgent.id, `💰 +${totalStake}Ⓒ!`, 4000);
                        engine.spawnInteractionFx(22, 17, '💰');
                        if (winnerAgent.mood !== undefined)
                            winnerAgent.mood = Math.min(100, winnerAgent.mood + 15);
                    }
                }

                _billiardGame = null;
                _billiardUI = null;
                if (_billiardPlayers) {
                    _billiardPlayers.forEach(p => {
                        p._isPlayingBilliard = false;
                        p._billiardStaked = 0;
                        if (p.mood !== undefined) p.mood = Math.min(100, p.mood + 3);
                    });
                    _billiardPlayers = null;
                }
                totalStake = 0;
            };

            // Show and start
            _billiardUI.show();
            manager.addLog('system', `🎱 Trận billiard bắt đầu: ${players[0].name} vs ${players[1].name}!`, 'info');
            showToast(`🎱 Trận billiard bắt đầu!`, 'info');
        };

        // === SLOT MACHINE SYSTEM ===
        let _slotUI = null;
        let _slotGame = null;
        let _slotPlayers = [];

        function openSlotMachine(players) {
            if (_slotUI && _slotUI.overlay.classList.contains('show')) return;

            _slotGame = new SlotMachine({ stepDelay: 500 });
            _slotPlayers = players || [];

            const overlayEl = document.getElementById('slotOverlay');
            _slotUI = new SlotMachineUI(overlayEl, _slotGame);
            _slotUI.players = _slotPlayers;

            // Validate and deduct coins on spin
            _slotUI.onSpinRequest = (betAmount) => {
                if (!game.canAfford(betAmount)) {
                    showToast(`💸 Không đủ tiền! Cần ${betAmount}Ⓒ`, 'error');
                    return false;
                }
                game.spend(betAmount, 'Slot Machine bet');
                _slotUI.setBalance(game.coins);
                return true;
            };

            // Handle results
            _slotUI.onResultCallback = (result) => {
                if (result.win) {
                    game._slotWon = true; // Achievement tracking
                    game.earn(result.payout, 'Slot Machine win');
                    manager.addLog('system', `🎰 Slot: ${result.name} +${result.payout}Ⓒ`, 'success');
                    if (result.isJackpot) {
                        showToast(`🎰🎰🎰 MEGA JACKPOT! +${result.payout}Ⓒ`, 'success');
                        engine.spawnInteractionFx(27, 22, '💰');
                        engine.spawnInteractionFx(28, 23, '🎰');
                    }
                    // Mood boost for playing agents
                    _slotPlayers.forEach(p => {
                        if (p.mood !== undefined) p.mood = Math.min(100, p.mood + 5);
                    });
                } else {
                    manager.addLog('system', `🎰 Slot: Thua -${result.bet}Ⓒ`, 'info');
                    _slotPlayers.forEach(p => {
                        if (p.mood !== undefined) p.mood = Math.max(30, p.mood - 2);
                    });
                }
                _slotUI.setBalance(game.coins);
                refreshHUD();
            };

            // On close
            _slotUI.onClose = () => {
                if (_slotPlayers.length > 0) {
                    _slotPlayers.forEach(p => {
                        p._isPlayingSlot = false;
                        if (p.mood !== undefined) p.mood = Math.min(100, p.mood + 2);
                    });
                }
                const stats = _slotGame.getStats();
                if (stats.totalSpins > 0) {
                    manager.addLog('system', `🎰 Session: ${stats.totalSpins} spins, Won: ${stats.totalWon}Ⓒ, Lost: ${stats.totalLost}Ⓒ`, 'info');
                }
                _slotGame = null;
                _slotUI = null;
                _slotPlayers = [];
            };

            _slotUI.setBalance(game.coins);
            _slotUI.show();
            manager.addLog('system', `🎰 Slot Machine mở!`, 'info');
            showToast('🎰 Chào mừng đến Lucky Pixel Slots!', 'info');
        }

        // Agent auto-slot request
        manager.onSlotRequest = (players) => {
            if (_slotUI && _slotUI.overlay.classList.contains('show')) return;
            openSlotMachine(players);
            // Auto-spin a few times for agent
            let autoCount = 0;
            const maxAuto = 3 + Math.floor(Math.random() * 3);
            const autoInterval = setInterval(() => {
                if (!_slotGame || autoCount >= maxAuto) {
                    clearInterval(autoInterval);
                    setTimeout(() => { if (_slotUI) _slotUI.hide(); }, 2000);
                    return;
                }
                if (!_slotGame.isSpinning && game.canAfford(_slotGame.currentBet)) {
                    _slotUI._doSpin();
                    autoCount++;
                }
            }, 2500);
        };

        // === GOLD TRADING SYSTEM ===
        let _goldUI = null;
        let _goldSystem = new GoldTrading();
        let _goldPlayers = [];

        // Tick gold price in game loop
        const origTickDay = game.tickDay.bind(game);
        let _goldTickAccum = 0;
        game.tickDay = function(realDeltaSec) {
            origTickDay(realDeltaSec);
            if (_goldSystem && !game.isPaused && game.started) {
                _goldTickAccum += realDeltaSec * game.gameSpeed;
                if (_goldTickAccum >= 2) {
                    _goldSystem.tick(1);
                    _goldTickAccum -= 2;
                }
            }
        };

        function openGoldTrading(players) {
            if (_goldUI && _goldUI.overlay.classList.contains('show')) return;

            _goldPlayers = players || [];

            const overlayEl = document.getElementById('goldTradeOverlay');
            _goldUI = new GoldTradingUI(overlayEl, _goldSystem);
            _goldUI.players = _goldPlayers;

            _goldUI.onBuyRequest = (ounces) => {
                const cost = _goldSystem.getCostForOunces(ounces);
                if (!game.canAfford(cost)) {
                    showToast(`💸 Không đủ tiền! Cần ${cost}Ⓒ`, 'error');
                    return;
                }
                const trade = _goldSystem.buy(ounces, game.coins);
                if (trade) {
                    game._goldTraded = true; // Achievement tracking
                    game.spend(trade.costCoins, `Buy Gold: ${ounces} oz`);
                    manager.addLog('system', `📈 Mua ${ounces} oz vàng @ $${trade.price.toFixed(2)} (-${trade.costCoins}Ⓒ)`, 'info');
                    showToast(`📈 Mua ${ounces} oz vàng!`, 'success');
                    _goldUI.setBalance(game.coins);
                    refreshHUD();
                }
            };

            _goldUI.onSellRequest = (ounces) => {
                if (_goldSystem.goldHeld <= 0) {
                    showToast('📉 Chưa có vàng để bán!', 'warning');
                    return;
                }
                const trade = _goldSystem.sell(ounces);
                if (trade) {
                    game.earn(trade.revenueCoins, `Sell Gold: ${trade.ounces.toFixed(4)} oz`);
                    const profitText = trade.profit >= 0 ? `+${trade.profit}Ⓒ` : `${trade.profit}Ⓒ`;
                    manager.addLog('system', `📉 Bán ${trade.ounces.toFixed(4)} oz vàng @ $${trade.price.toFixed(2)} (${profitText})`, trade.profit >= 0 ? 'success' : 'warning');
                    showToast(`📉 Bán vàng! P&L: ${profitText}`, trade.profit >= 0 ? 'success' : 'warning');
                    _goldUI.setBalance(game.coins);
                    refreshHUD();
                    // Mood effect
                    _goldPlayers.forEach(p => {
                        if (p.mood !== undefined) {
                            p.mood = Math.min(100, Math.max(30, p.mood + (trade.profit >= 0 ? 5 : -3)));
                        }
                    });
                }
            };

            _goldUI.onSellAllRequest = () => {
                if (_goldSystem.goldHeld <= 0) {
                    showToast('📉 Chưa có vàng để bán!', 'warning');
                    return;
                }
                const trade = _goldSystem.sellAll();
                if (trade) {
                    game.earn(trade.revenueCoins, `Sell All Gold`);
                    const profitText = trade.profit >= 0 ? `+${trade.profit}Ⓒ` : `${trade.profit}Ⓒ`;
                    manager.addLog('system', `🏧 Bán toàn bộ ${trade.ounces.toFixed(4)} oz vàng (${profitText})`, trade.profit >= 0 ? 'success' : 'warning');
                    showToast(`🏧 Bán hết vàng! P&L: ${profitText}`, trade.profit >= 0 ? 'success' : 'warning');
                    _goldUI.setBalance(game.coins);
                    refreshHUD();
                }
            };

            _goldUI.onClose = () => {
                if (_goldPlayers.length > 0) {
                    _goldPlayers.forEach(p => {
                        p._isTrading = false;
                        if (p.mood !== undefined) p.mood = Math.min(100, p.mood + 2);
                    });
                }
                _goldUI = null;
                _goldPlayers = [];
            };

            _goldUI.setBalance(game.coins);
            _goldUI.show();
            manager.addLog('system', `📊 Gold Trading Terminal mở!`, 'info');
            showToast('📊 Chào mừng đến Gold Trading Terminal!', 'info');
        }

        // Agent auto-trade request
        manager.onGoldTradeRequest = (players) => {
            if (_goldUI && _goldUI.overlay.classList.contains('show')) return;
            openGoldTrading(players);
            // Auto-trade: agent buys a small amount
            setTimeout(() => {
                if (_goldSystem && game.canAfford(20)) {
                    _goldUI?.onBuyRequest?.(0.01);
                }
            }, 3000);
            // Auto-close after some time
            setTimeout(() => {
                if (_goldUI) {
                    // Maybe sell if profitable
                    if (_goldSystem.getUnrealizedPnL() > 0) {
                        _goldUI.onSellAllRequest?.();
                    }
                    setTimeout(() => { if (_goldUI) _goldUI.hide(); }, 2000);
                }
            }, 15000 + Math.random() * 10000);
        };
    }

    // ============ HUD ============
    function refreshHUD() {
        const agents = Array.from(manager.agents.values());
        const officeBonuses = game.getOfficeBonuses(engine?.furniture || []);
        manager.setOfficeBonuses(officeBonuses);
        game.updateSalaryCache(agents);
        setText('hudCoins', game.formatCoins(game.coins));
        setText('hudDay', game.day);
        setText('hudRep', game.reputation.toFixed(1));
        setText('hudLevel', game.companyLevel);
        setText('hudSalary', `-${game._currentSalary}/day`);
        setText('hudContractBadge', game.availableContracts.length);
        setText('agentsOnline', agents.length);
        setText('activeTasks', manager.tasks.filter(t => t.status !== 'completed').length);
        setText('cpuUsage', Math.min(99, agents.length * 8 + Math.floor(Math.random() * 10)) + '%');
        setText('hudOfficeBonus', officeBonuses.compact);
        const officeEl = document.getElementById('hudOfficeBonusWrap');
        if (officeEl) {
            officeEl.title = officeBonuses.summary.length
                ? officeBonuses.summary.join(' | ')
                : 'No active office bonus';
        }
        const xpFill = document.getElementById('hudXpFill');
        if (xpFill) xpFill.style.width = game.getXPProgress() + '%';

        // Tech Tree HUD
        if (techTree) {
            const researchWrap = document.getElementById('hudResearchWrap');
            const researchFill = document.getElementById('hudResearchFill');
            const researchText = document.getElementById('hudResearchText');
            const researchIcon = document.getElementById('hudResearchIcon');
            if (techTree.currentResearch) {
                const tech = techTree.getTech(techTree.currentResearch);
                if (researchWrap) researchWrap.style.display = 'flex';
                if (researchFill) researchFill.style.width = Math.floor(techTree.researchProgress) + '%';
                if (researchText) researchText.textContent = Math.floor(techTree.researchProgress) + '%';
                if (researchIcon) researchIcon.textContent = tech ? tech.icon : '🔬';
            } else {
                if (researchWrap) researchWrap.style.display = 'none';
            }
        }
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    window.refreshHUD = refreshHUD;

    // ============ COIN POPUP ============
    function showCoinPopup(amount) {
        const container = document.getElementById('coinPopups');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'coin-popup ' + (amount >= 0 ? 'earn' : 'spend');
        el.textContent = (amount >= 0 ? '+' : '') + amount + 'Ⓒ';
        const hudCoins = document.querySelector('.hud-coins');
        if (hudCoins) {
            const r = hudCoins.getBoundingClientRect();
            el.style.left = r.left + 'px';
            el.style.top = (r.bottom + 4) + 'px';
        } else {
            el.style.left = '60px'; el.style.top = '80px';
        }
        container.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    }

    // ============ DAY TRANSITION ============
    function showDayTransition() {
        const el = document.getElementById('dayTransition');
        if (!el) return;
        setText('dayTransNum', game.day);
        const icon = document.getElementById('dayIcon');
        if (icon) icon.textContent = game.getTimeIcon();
        const subs = ['Good morning! ☕', 'A new day begins!', "Let's build! 🚀", 'Time to work! 💪'];
        setText('dayTransSub', subs[Math.floor(Math.random() * subs.length)]);
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    }

    // ============ GAME OVER ============
    function showGameOver() {
        const el = document.getElementById('gameOverOverlay');
        const stats = document.getElementById('gameOverStats');
        if (stats) stats.innerHTML = `
            📅 Tồn tại: <strong>${game.day}</strong> ngày<br>
            💰 Kiếm được: <strong>${game.formatCoins(game.totalEarned)}</strong>Ⓒ<br>
            ✅ Contract Done: <strong>${game.completedContracts}</strong><br>
            🏢 Level: <strong>${game.companyLevel}</strong>
        `;
        if (el) el.classList.add('show');
    }

    function showLevelUp(level, milestone) {
        const el = document.getElementById('levelUpOverlay');
        setText('levelUpLevel', `Level ${level}`);
        setText('levelUpName', milestone.title);
        setText('levelUpUnlock', `🔓 Unlock: ${milestone.unlock}`);
        if (el) el.classList.add('show');
    }

    function showWinScreen() {
        const el = document.getElementById('winOverlay');
        const stats = document.getElementById('winStats');
        if (stats) stats.innerHTML = `
            📅 Ngày: <strong>${game.day}</strong><br>
            💰 Kiếm được: <strong>${game.formatCoins(game.totalEarned)}</strong>Ⓒ<br>
            ✅ Contracts: <strong>${game.completedContracts}</strong>
        `;
        if (el) { el.style.display = ''; el.classList.add('show'); }
    }

    // ============ CONTRACT BOARD ============
    function openContractBoard() {
        refreshContractBoard();
        document.getElementById('modalContracts').classList.add('active');
    }

    function refreshContractBoard() {
        const renderCard = (c, isActive) => {
            const [diffIcon] = game.getDifficultyBadge(c.difficulty);
            const pct = c.tasksNeeded > 0 ? Math.floor((c.tasksCompleted / c.tasksNeeded) * 100) : 0;
            const urgentCls = c.daysRemaining <= 1 ? 'urgent' : '';
            return `
            <div class="contract-card ${isActive ? 'active-contract' : ''}">
                <div class="contract-card-header">
                    <span class="contract-title">${diffIcon} ${c.title}</span>
                    <span class="contract-diff ${c.difficulty}">${c.difficulty}</span>
                </div>
                <div class="contract-desc">${c.description}</div>
                <div class="contract-meta">
                    <div class="contract-meta-item">💰 <span class="reward-val">${c.reward}Ⓒ</span></div>
                    <div class="contract-meta-item">⏰ <span class="deadline-val ${urgentCls}">${c.daysRemaining}d</span></div>
                    <div class="contract-meta-item">📝 ${c.tasksCompleted}/${c.tasksNeeded}</div>
                </div>
                <div class="contract-roles">${c.requiredRoles.map(r => `<span class="contract-role-tag">${r}</span>`).join('')}</div>
                ${isActive ? `
                    <div class="contract-progress-wrap">
                        <div class="contract-progress-bar"><div class="contract-progress-fill" style="width:${pct}%"></div></div>
                    </div>` : `
                    <div class="contract-actions">
                        <button class="btn-pixel btn-small btn-danger btn-reject-contract" data-id="${c.id}">Pass</button>
                        <button class="btn-pixel btn-small btn-accept-contract" data-id="${c.id}">Accept ✅</button>
                    </div>`}
            </div>`;
        };

        const activeEl = document.getElementById('activeContractsList');
        if (activeEl) activeEl.innerHTML = game.activeContracts.length
            ? game.activeContracts.map(c => renderCard(c, true)).join('')
            : '<div style="font-size:11px;color:var(--text-muted);padding:12px;text-align:center">Chưa có contract nào đang chạy</div>';

        const availEl = document.getElementById('availableContractsList');
        if (availEl) availEl.innerHTML = game.availableContracts.length
            ? game.availableContracts.map(c => renderCard(c, false)).join('')
            : '<div style="font-size:11px;color:var(--text-muted);padding:12px;text-align:center">Không có contract mới. Đợi ngày mới!</div>';

        document.querySelectorAll('.btn-accept-contract').forEach(btn => {
            btn.onclick = () => acceptContractAction(btn.dataset.id);
        });
        document.querySelectorAll('.btn-reject-contract').forEach(btn => {
            btn.onclick = () => { game.rejectContract(btn.dataset.id); refreshContractBoard(); refreshHUD(); };
        });
    }

    function acceptContractAction(contractId) {
        const contract = game.acceptContract(contractId);
        if (!contract) return;
        const types = ['feature', 'bugfix', 'review', 'test', 'design', 'research'];
        const prio = { easy: 'low', medium: 'medium', hard: 'high', epic: 'high' };
        for (let i = 0; i < contract.tasksNeeded; i++) {
            const tid = manager.createTask({
                title: `${contract.title} — Task ${i + 1}`,
                description: `Part ${i + 1} of "${contract.title}"`,
                type: types[Math.floor(Math.random() * types.length)],
                priority: prio[contract.difficulty] || 'medium',
            });
            contract.generatedTasks.push(tid);
        }
        showToast(`📋 Nhận "${contract.title}"! ${contract.tasksNeeded} tasks created.`, 'info');
        manager.addLog('system', `📋 Contract "${contract.title}" — ${contract.tasksNeeded} tasks, ${contract.deadline} ngày`, 'info');
        refreshContractBoard();
        refreshHUD();
        refreshTaskList();
        document.getElementById('modalContracts').classList.remove('active');
    }

    // ============ ROLE SELECT ============
    function refreshRoleSelect() {
        const sel = document.getElementById('agentRole');
        if (!sel) return;
        const emoji = ROLE_EMOJIS;
        sel.innerHTML = '';
        Object.keys(game.hiringCosts).forEach(role => {
            const unlocked = game.isRoleUnlocked(role);
            const cost = game.hiringCosts[role];
            const opt = document.createElement('option');
            opt.value = role;
            opt.textContent = `${emoji[role] || '🤖'} ${role.charAt(0).toUpperCase() + role.slice(1)} — ${cost}Ⓒ`;
            if (!unlocked) { opt.disabled = true; opt.textContent += ` 🔒 Lv.${game.roleUnlockLevel[role]}`; }
            sel.appendChild(opt);
        });
        updateHireCost();
    }

    function updateHireCost() {
        const sel = document.getElementById('agentRole');
        const badge = document.getElementById('hireCost');
        if (sel && badge) badge.textContent = `💰 ${game.hiringCosts[sel.value] || 100}Ⓒ`;
    }

    // ============ UI EVENTS ============
    function bindUIEvents() {
        const openHire = () => { refreshRoleSelect(); document.getElementById('modalAddAgent').classList.add('active'); };
        document.getElementById('btnAddAgent').onclick = openHire;
        document.getElementById('btnAddAgentToolbar')?.addEventListener('click', openHire);
        document.getElementById('closeAddAgent').onclick = () => document.getElementById('modalAddAgent').classList.remove('active');
        document.getElementById('cancelAddAgent').onclick = () => document.getElementById('modalAddAgent').classList.remove('active');
        document.getElementById('agentRole').onchange = updateHireCost;

        document.getElementById('confirmAddAgent').onclick = () => {
            const name = document.getElementById('agentName').value.trim() || `Agent-${Date.now().toString(36).slice(-4)}`;
            const role = document.getElementById('agentRole').value;
            const model = document.getElementById('agentModel').value;
            const colorEl = document.querySelector('.color-option.selected');
            const color = colorEl ? colorEl.dataset.color : '#4ecdc4';

            if (!game.isRoleUnlocked(role)) {
                showToast(`🔒 Role "${role}" cần Level ${game.roleUnlockLevel[role]}!`, 'error'); return;
            }
            const cost = game.hiringCosts[role] || 100;
            if (!game.canAfford(cost)) {
                showToast(`💸 Không đủ tiền! Cần ${cost}Ⓒ, có ${game.coins}Ⓒ`, 'error'); return;
            }
            game.spend(cost, `Hire: ${name}`);
            manager.createAgent({ name, role, model, color });
            game.sfx.hire();
            showToast(`🤖 ${name} joined! (-${cost}Ⓒ)`, 'success');
            manager.addLog(name, `Joined as ${role}`, 'success');
            document.getElementById('modalAddAgent').classList.remove('active');
            document.getElementById('agentName').value = '';
            refreshAgentList(); refreshHUD();
        };

        document.querySelectorAll('.color-option').forEach(el => {
            el.onclick = () => { document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); };
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const pane = document.getElementById('tab-' + btn.dataset.tab);
                if (pane) pane.classList.add('active');
                if (btn.dataset.tab === 'stats') refreshStats();
                if (btn.dataset.tab === 'logs') refreshLogs();
            };
        });

        document.getElementById('btnZoomIn')?.addEventListener('click', () => engine.zoomTo(engine.scale + 0.5));
        document.getElementById('btnZoomOut')?.addEventListener('click', () => engine.zoomTo(engine.scale - 0.5));

        // Scene navigation buttons
        document.querySelectorAll('.zone-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const zone = btn.dataset.zone;
                if (engine.switchScene(zone)) {
                    // Update active state
                    document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    game.sfx.click();
                }
            });
        });

        document.getElementById('btnContracts').onclick = openContractBoard;
        document.getElementById('closeContracts').onclick = () => document.getElementById('modalContracts').classList.remove('active');

        // Tech Tree button
        document.getElementById('btnTechTree')?.addEventListener('click', () => openTechTreeModal());
        document.getElementById('closeTechTree')?.addEventListener('click', () => document.getElementById('techTreeOverlay')?.classList.remove('active'));

        // Farm button
        document.getElementById('btnFarm')?.addEventListener('click', () => toggleFarmOverlay());

        // Speed button cycle 1x→2x→3x→1x
        document.getElementById('btnSpeed').onclick = () => {
            const speeds = [1, 2, 3];
            game.gameSpeed = speeds[(speeds.indexOf(game.gameSpeed) + 1) % speeds.length];
            updateSpeedDisplay();
            game.sfx.click();
        };

        document.getElementById('btnPauseGame').onclick = () => {
            game.isPaused = !game.isPaused;
            const btn = document.getElementById('btnPauseGame');
            btn.textContent = game.isPaused ? '▶' : '⏸';
            btn.classList.toggle('paused', game.isPaused);
            game.sfx.click();
        };

        document.getElementById('btnRetry').onclick = () => {
            document.getElementById('gameOverOverlay').classList.remove('show');
            startNewGame();
        };
        document.getElementById('btnBackToMenu').onclick = () => showStartScreen();
        document.getElementById('btnPlayOn')?.addEventListener('click', () => {
            const el = document.getElementById('winOverlay');
            el.classList.remove('show'); el.style.display = 'none';
        });
        document.getElementById('btnWinMenu')?.addEventListener('click', () => showStartScreen());
        document.getElementById('btnCloseLevelUp').onclick = () =>
            document.getElementById('levelUpOverlay').classList.remove('show');

        // Settings button handled by initSettingsPanel()
        const clearLogs = () => { manager.logs = []; refreshLogs(); };
        document.getElementById('btnClearLogs')?.addEventListener('click', clearLogs);
        document.getElementById('btnFullscreen')?.addEventListener('click', () => {
            const vp = document.getElementById('officeViewport');
            if (document.fullscreenElement) document.exitFullscreen();
            else vp.requestFullscreen?.();
        });

        // Layout editor toolbar buttons
        document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                game.sfx.click();

                // Layout button toggles the editor panel
                if (tool === 'layout') {
                    editor.toggle();
                    btn.classList.toggle('active', editor.active);
                    return;
                }

                // If clicking the already-active tool → deactivate it
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    editor.currentTool = null;
                    editor.setStatus('Sẵn sàng');
                    return;
                }

                // Deactivate all toolbar tool buttons, activate this one
                document.querySelectorAll('.toolbar-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Open editor panel if not already open
                if (!editor.active) editor.toggle(true);

                // Activate the tool
                editor.setTool(tool);
            });
        });
    }

    // ============ AGENT LIST ============
    function refreshAgentList() {
        const list = document.getElementById('agentList');
        if (!list) return;
        const agents = Array.from(manager.agents.values());

        // Update header count badge
        const countEl = document.getElementById('mpAgentCount');
        if (countEl) countEl.textContent = agents.length;

        if (agents.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:var(--text-muted)">
                    <div style="font-size:36px;margin-bottom:12px">🤖</div>
                    <div style="font-family:var(--font-pixel);font-size:8px;margin-bottom:8px">Studio trống vắng</div>
                    <div style="font-size:11px">Click <strong>+ HIRE</strong> để tuyển agent!</div>
                </div>`;
            return;
        }

        const roleEmoji = {coder:'💻',reviewer:'🔍',tester:'🧪',designer:'🎨',devops:'⚙️',researcher:'🔬',analyst:'📊',security:'🛡️',backend:'🗄️',mobile:'📱',writer:'✍️'};

        list.innerHTML = agents.map(a => {
            const salary = game.salaries[a.role] || 15;
            const task = manager.tasks.find(t => (t.assigneeId === a.id || t.assignee === a.id) && t.status !== 'completed');
            const pct = task ? (task.progress || 0) : 0;
            return `
            <div class="agent-card ${a.status}" data-agent-id="${a.id}" draggable="true" style="--agent-color:${a.color}">
                <div class="agent-card-header">
                    <canvas class="agent-avatar" width="40" height="40" data-color="${a.color}" data-role="${a.role}"></canvas>
                    <div class="agent-info">
                        <div class="agent-name">${a.name}</div>
                        <div class="agent-role">${roleEmoji[a.role]||'🤖'} ${a.role} · Lv${a.level||1} · ${salary}Ⓒ/day</div>
                    </div>
                    <span class="agent-status-badge ${a.status}">${a.status}</span>
                </div>
                <div class="agent-card-body">
                    <div class="agent-meta-row">
                        <span class="meta-item">❤️ ${Math.floor(a.mood||80)}%</span>
                        <span class="meta-item">⚡ ${Math.floor(a.energy||100)}%</span>
                        <span class="meta-item">⭐ ${a.xp||0}xp</span>
                    </div>
                    ${task ? `<div class="agent-task"><span class="task-emoji">📋</span> ${task.title}</div>
                    <div class="agent-progress">
                        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                        <div class="progress-text">${Math.floor(pct)}%</div>
                    </div>` : ''}
                </div>
                <div class="agent-card-footer">
                    <button class="agent-action-btn" title="Focus" onclick="window._focusAgent('${a.id}')">🔍</button>
                    <button class="agent-action-btn danger" title="Fire" onclick="window._fireAgent('${a.id}')">🗑️</button>
                </div>
            </div>`;
        }).join('');

        list.querySelectorAll('.agent-avatar').forEach(c => drawAgentAvatar(c, c.dataset.color));
        chatbox?.setupDragListeners?.();
    }

    window._fireAgent = (id) => {
        const a = manager.agents.get(id);
        if (!a || !confirm(`Giải tán ${a.name}?`)) return;
        engine.removeAgentSprite(id);
        manager.removeAgent(id);
        refreshAgentList(); refreshHUD();
        showToast(`👋 ${a.name} đã rời đi`, 'warning');
    };

    window._focusAgent = (id) => {
        const sp = engine.agentSprites.get(id);
        if (sp) { engine.camera.x = -sp.x * engine.scale + engine.canvas.width / 2; engine.camera.y = -sp.y * engine.scale + engine.canvas.height / 2; }
    };

    function drawAgentAvatar(canvas, color) {
        const ctx = canvas.getContext('2d');
        const s = 5;
        ctx.clearRect(0, 0, 40, 40);
        ctx.fillStyle = color || '#4ecdc4';
        ctx.fillRect(2*s, 0, 4*s, 3*s);
        ctx.fillRect(1*s, 3*s, 6*s, 3*s);
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(3*s, s, s, s);
        ctx.fillRect(5*s, s, s, s);
        ctx.fillStyle = color || '#4ecdc4';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(2*s, 6*s, 2*s, 2*s);
        ctx.fillRect(5*s, 6*s, 2*s, 2*s);
        ctx.globalAlpha = 1;
    }

    // ============ TASK LIST ============
    function refreshTaskList() {
        const list = document.getElementById('taskList');
        if (!list) return;
        const tasks = manager.tasks;
        if (tasks.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:11px">📋 Nhận Contract để tạo tasks!</div>';
            return;
        }
        const pEmoji = { low:'🟢', medium:'🟡', high:'🔴' };
        list.innerHTML = tasks.slice(-20).reverse().map(t => {
            const agent = t.assigneeId ? manager.agents.get(t.assigneeId) : null;
            return `<div class="task-item">
                <div class="task-item-header">
                    <span class="task-title">${t.title}</span>
                    <span class="task-priority">${pEmoji[t.priority]||'🟡'}</span>
                </div>
                <div class="task-description">${t.description||''}</div>
                <div class="task-meta">
                    ${agent ? `<span class="task-assignee">🤖 ${agent.name}</span>` : '<span style="color:var(--text-muted);font-size:10px">Chưa assign</span>'}
                    <span class="task-status-tag ${t.status}">${t.status}</span>
                </div>
                ${t.progress > 0 ? `<div class="agent-progress" style="margin-top:6px"><div class="progress-bar"><div class="progress-fill" style="width:${t.progress}%"></div></div></div>` : ''}
            </div>`;
        }).join('');
    }

    // ============ STATS ============
    // refreshStats() moved to Enhanced Stats section below

    function refreshLogs() {
        const el = document.getElementById('logConsole');
        if (!el) return;
        el.innerHTML = (manager.logs || []).slice(0, 50).map(l =>
            `<div class="log-entry ${l.type||''}">
                <span class="log-time">${l.time||''}</span>
                <span class="log-agent">${l.agent||'system'}</span>
                <span class="log-message">${l.message||''}</span>
            </div>`
        ).join('');
    }

    // ============ TOAST ============
    function showToast(msg, type = 'info') {
        const c = document.getElementById('toastContainer');
        if (!c) return;
        const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-message">${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all 0.3s';
            setTimeout(() => t.remove(), 300);
        }, 4000);

        // Also push to notification center (silent — no extra SFX from toast)
        if (typeof addNotification === 'function') {
            addNotification(msg, icons[type] || 'ℹ️', type, true);
        }
    }
    window.showToast = showToast;

    // ============ MISC ============
    function createParticles() {
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = 10 + Math.random() * 20 + 's';
            p.style.animationDelay = Math.random() * 10 + 's';
            document.body.appendChild(p);
        }
    }

    function updateClock() {
        const c = document.getElementById('pixelClock');
        if (c) c.textContent = new Date().toLocaleTimeString('vi-VN');

        // Update uptime
        if (_gameStartTime) {
            const elapsed = Math.floor((Date.now() - _gameStartTime) / 1000);
            const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
            const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            const uptimeEl = document.getElementById('uptime');
            if (uptimeEl) uptimeEl.textContent = `${h}:${m}:${s}`;
        }

        // Update memory usage
        const memEl = document.getElementById('memoryUsage');
        if (memEl) {
            if (performance.memory) {
                const mb = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
                memEl.textContent = `Memory: ${mb} MB`;
            } else {
                // Estimate from DOM + data size
                const agents = manager ? manager.agents.size : 0;
                const tasks = manager ? manager.tasks.length : 0;
                const est = (2 + agents * 0.5 + tasks * 0.1).toFixed(1);
                memEl.textContent = `Memory: ~${est} MB`;
            }
        }
    }

    // ============ ROOM SHOP ============
    function openRoomShop() {
        const overlay = document.getElementById('roomShopOverlay');
        if (!overlay || !game) return;
        overlay.classList.add('show');
        renderRoomShop();
    }

    function closeRoomShop() {
        const overlay = document.getElementById('roomShopOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    function renderRoomShop() {
        const grid = document.getElementById('roomShopGrid');
        if (!grid || !game) return;
        grid.innerHTML = '';

        game.roomCatalog.forEach(room => {
            const isUnlocked = game.isRoomUnlocked(room.id);
            const canUnlock = game.canUnlockRoom(room.id);
            const levelOk = true; // Level check removed

            const card = document.createElement('div');
            card.className = 'room-card' + (isUnlocked ? ' unlocked' : '') + (canUnlock ? ' available' : '');

            card.innerHTML = `
                <div class="room-card-icon">${room.icon}</div>
                <div class="room-card-name">${room.name}</div>
                <div class="room-card-desc">${room.desc}</div>
                <div class="room-card-bonus">✨ ${room.bonus}</div>
                <div class="room-card-size">${room.w}×${room.h} tiles</div>
                <div class="room-card-footer">
                    ${isUnlocked ? '<span class="room-status unlocked">✅ Đã mở</span>' :
                      `<span class="room-cost">${room.cost}Ⓒ</span>
                       <button class="room-buy-btn" data-id="${room.id}" ${canUnlock ? '' : 'disabled'}>
                           ${game.coins >= room.cost ? '🔓 Mở khóa' : '💰 Thiếu coin'}
                       </button>`}
                </div>
            `;
            grid.appendChild(card);
        });

        // Bind buy buttons
        grid.querySelectorAll('.room-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                if (game.unlockRoom(id)) {
                    engine.rebuildMap(game.unlockedRooms);
                    // Re-assign agents to new desks
                    if (manager) {
                        manager.agents.forEach(a => {
                            engine.addAgentSprite(a.id, a.name, a.role);
                        });
                    }
                    updateHUD();
                    renderRoomShop(); // refresh
                    game.saveGame(manager);
                }
            });
        });

        // Update coin display in shop
        const coinEl = document.getElementById('roomShopCoins');
        if (coinEl) coinEl.textContent = `💰 ${game.coins}Ⓒ`;
    }

    // Wire room shop button
    function wireRoomShopBtn() {
        const btn = document.getElementById('btnRoomShop');
        if (btn) btn.addEventListener('click', openRoomShop);
        const closeBtn = document.getElementById('closeRoomShop');
        if (closeBtn) closeBtn.addEventListener('click', closeRoomShop);
    }

    // ============ SPEED DISPLAY HELPER ============
    function updateSpeedDisplay() {
        const btn = document.getElementById('btnSpeed');
        if (!btn) return;
        const arrows = { 1: '▶', 2: '▶▶', 3: '▶▶▶' };
        btn.textContent = `${arrows[game.gameSpeed] || '▶'} ${game.gameSpeed}x`;
        btn.classList.toggle('active', game.gameSpeed > 1);
    }

    // ============ ACHIEVEMENT SYSTEM ============
    let _achievements = null;
    let _autoChatEnabled = true;
    let _lastNotifSfxTime = 0; // debounce for notification SFX

    function initAchievements() {
        _achievements = new AchievementManager();

        // On unlock: show special toast + sound
        _achievements.onUnlock((ach) => {
            game.sfx.achievement();
            showAchievementToast(ach);
            addNotification(`🏆 Thành tựu: ${ach.title}`, ach.icon, 'achievement');

            // Update badge
            const badge = document.getElementById('achBadge');
            if (badge) {
                badge.style.display = 'flex';
                badge.textContent = _achievements.getUnlockedCount();
            }
        });

        // Wire buttons
        const btnAch = document.getElementById('btnAchievements');
        if (btnAch) btnAch.addEventListener('click', openAchievements);
        const closeAch = document.getElementById('closeAchievements');
        if (closeAch) closeAch.addEventListener('click', () => {
            document.getElementById('achievementOverlay').classList.remove('active');
        });
    }

    function showAchievementToast(ach) {
        const el = document.createElement('div');
        el.className = 'ach-toast';
        el.innerHTML = `
            <div class="ach-toast-icon">${ach.icon}</div>
            <div class="ach-toast-content">
                <div class="ach-toast-label">🏆 Achievement Unlocked!</div>
                <div class="ach-toast-title">${ach.title}</div>
            </div>
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4200);
    }

    function openAchievements() {
        const overlay = document.getElementById('achievementOverlay');
        if (!overlay || !_achievements) return;
        overlay.classList.add('active');
        renderAchievements();
    }

    function renderAchievements() {
        const grid = document.getElementById('achGrid');
        const progressEl = document.getElementById('achProgress');
        const fillEl = document.getElementById('achProgressFill');
        if (!grid || !_achievements) return;

        const all = _achievements.getAll();
        const pct = _achievements.getProgress();
        if (progressEl) progressEl.textContent = `${_achievements.getUnlockedCount()} / ${_achievements.getTotalCount()} (${pct}%)`;
        if (fillEl) fillEl.style.width = pct + '%';

        grid.innerHTML = all.map(a => `
            <div class="ach-card ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="ach-icon">${a.icon}</div>
                <div class="ach-info">
                    <div class="ach-title">${a.unlocked ? a.title : '???'}</div>
                    <div class="ach-desc">${a.desc}</div>
                </div>
                ${a.unlocked ? '<div class="ach-check">✅</div>' : ''}
            </div>
        `).join('');
    }

    // ============ NOTIFICATION CENTER ============
    let _notifications = [];
    let _notifUnread = 0;

    function initNotificationCenter() {
        const btn = document.getElementById('btnNotifCenter');
        const panel = document.getElementById('notifCenter');
        const clearBtn = document.getElementById('notifClearAll');

        if (btn) btn.addEventListener('click', () => {
            if (!panel) return;
            const isOpen = panel.style.display !== 'none';
            panel.style.display = isOpen ? 'none' : 'flex';
            if (!isOpen) {
                _notifUnread = 0;
                updateNotifBadge();
                renderNotifications();
            }
        });

        if (clearBtn) clearBtn.addEventListener('click', () => {
            _notifications = [];
            _notifUnread = 0;
            updateNotifBadge();
            renderNotifications();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (panel && panel.style.display !== 'none') {
                if (!panel.contains(e.target) && !e.target.closest('#btnNotifCenter')) {
                    panel.style.display = 'none';
                }
            }
        });
    }

    /** Add a notification to the center. Pass silent=true to skip SFX (e.g. from showToast). */
    function addNotification(msg, icon = 'ℹ️', category = 'info', silent = false) {
        const now = new Date();
        const ts = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        _notifications.unshift({ msg, icon, category, time: ts, unread: true });
        if (_notifications.length > 50) _notifications = _notifications.slice(0, 50);
        _notifUnread++;
        updateNotifBadge();
        // Debounced SFX: skip if silent or played < 3s ago
        if (!silent && game?.sfx?.notification) {
            const t = Date.now();
            if (t - _lastNotifSfxTime > 3000) {
                game.sfx.notification();
                _lastNotifSfxTime = t;
            }
        }
    }

    function updateNotifBadge() {
        const badge = document.getElementById('notifBadge');
        if (badge) {
            badge.style.display = _notifUnread > 0 ? 'flex' : 'none';
            badge.textContent = _notifUnread > 9 ? '9+' : _notifUnread;
        }
    }

    function renderNotifications() {
        const list = document.getElementById('notifList');
        if (!list) return;
        if (_notifications.length === 0) {
            list.innerHTML = '<div class="notif-empty">🔔 Chưa có thông báo nào</div>';
            return;
        }
        list.innerHTML = _notifications.map(n => `
            <div class="notif-item ${n.unread ? 'unread' : ''}">
                <div class="notif-icon">${n.icon}</div>
                <div class="notif-content">
                    <div class="notif-msg">${n.msg}</div>
                    <div class="notif-time">${n.time}</div>
                </div>
            </div>
        `).join('');
        // Mark all as read
        _notifications.forEach(n => n.unread = false);
    }

    // ============ SETTINGS PANEL ============
    /** Initialize settings modal with persistence via localStorage. */
    function initSettingsPanel() {
        const settingsOverlay = document.getElementById('settingsOverlay');
        const achOverlay = document.getElementById('achievementOverlay');

        // Settings button → open modal
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) btnSettings.addEventListener('click', () => {
            settingsOverlay?.classList.add('active');
            refreshStatsTab(); // Refresh when opening
        });
        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) closeSettings.addEventListener('click', () => {
            settingsOverlay?.classList.remove('active');
        });

        // Click overlay background to close (settings + achievements)
        [settingsOverlay, achOverlay].forEach(ov => {
            if (!ov) return;
            ov.addEventListener('click', (e) => {
                if (e.target === ov) ov.classList.remove('active');
            });
        });

        // --- Tab Switching ---
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                document.getElementById('settingsTabSettings').style.display = tab === 'settings' ? '' : 'none';
                document.getElementById('settingsTabStats').style.display = tab === 'stats' ? '' : 'none';
                document.getElementById('settingsTabDebug').style.display = tab === 'debug' ? '' : 'none';
                if (tab === 'stats') refreshStatsTab();
                if (tab === 'debug') refreshDebugTab();
            });
        });

        // --- Restore persisted settings ---
        const savedVol = localStorage.getItem('pac_sfxVol');
        const savedChat = localStorage.getItem('pac_autoChat');
        const savedBgm = localStorage.getItem('pac_bgm');
        if (savedVol !== null) {
            const v = parseInt(savedVol);
            game?.sfx?.setVolume?.(v / 100);
        }
        if (savedChat !== null) _autoChatEnabled = savedChat === '1';
        // BGM auto-start deferred until user interacts (browser policy)

        // SFX volume slider
        const volSlider = document.getElementById('settingSfxVol');
        const volVal = document.getElementById('settingSfxVolVal');
        if (volSlider) {
            if (savedVol !== null) {
                volSlider.value = savedVol;
                if (volVal) volVal.textContent = savedVol + '%';
            }
            volSlider.addEventListener('input', () => {
                const v = parseInt(volSlider.value);
                if (volVal) volVal.textContent = v + '%';
                game?.sfx?.setVolume?.(v / 100);
                localStorage.setItem('pac_sfxVol', v);
            });
        }

        // BGM toggle — label shows current state
        const bgmBtn = document.getElementById('settingBgmToggle');
        if (bgmBtn) {
            // Set initial label
            bgmBtn.textContent = '🎵 BẬT BGM';
            bgmBtn.addEventListener('click', () => {
                if (!game?.sfx) return;
                const playing = game.sfx.toggleBGM();
                bgmBtn.textContent = playing ? '🎵 BGM: BẬT' : '🎵 BGM: TẮT';
                bgmBtn.style.borderColor = playing ? 'var(--accent-success)' : '';
                localStorage.setItem('pac_bgm', playing ? '1' : '0');
            });
        }

        // Auto-Chat toggle — label shows current state
        const chatBtn = document.getElementById('settingChatToggle');
        if (chatBtn) {
            chatBtn.textContent = _autoChatEnabled ? '💬 Chat: BẬT' : '💬 Chat: TẮT';
            chatBtn.style.borderColor = _autoChatEnabled ? 'var(--accent-success)' : '';
            chatBtn.addEventListener('click', () => {
                _autoChatEnabled = !_autoChatEnabled;
                chatBtn.textContent = _autoChatEnabled ? '💬 Chat: BẬT' : '💬 Chat: TẮT';
                chatBtn.style.borderColor = _autoChatEnabled ? 'var(--accent-success)' : '';
                localStorage.setItem('pac_autoChat', _autoChatEnabled ? '1' : '0');
            });
        }

        // --- Debug buttons ---
        const debugClear = document.getElementById('debugClearErrors');
        if (debugClear) debugClear.addEventListener('click', () => {
            PAC.ErrorHandler.clearErrors();
            refreshDebugTab();
            showToast('🗑️ Đã xóa error log', 'info');
        });
        const debugTimer = document.getElementById('debugTimerStatus');
        if (debugTimer) debugTimer.addEventListener('click', () => {
            const status = PAC.Timer.getStatus();
            alert(`Active Intervals: ${status.activeIntervals}\nActive Timeouts: ${status.activeTimeouts}\nDetails: ${status.details.join(', ')}`);
        });
    }

    function refreshStatsTab() {
        if (!game || !statsDashboard) return;
        try {
            const s = statsDashboard.getSummary(game, manager);
            const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
            set('statCoins', s.coins.toLocaleString() + 'Ⓒ');
            set('statEarned', '+' + s.totalEarned.toLocaleString());
            set('statSpent', '-' + s.totalSpent.toLocaleString());
            set('statNet', (s.netProfit >= 0 ? '+' : '') + s.netProfit.toLocaleString());
            set('statAgents', s.agentCount);
            set('statTasks', s.totalTasks);
            set('statContracts', `${s.completedContracts}✅ / ${s.failedContracts}❌`);
            set('statSuccessRate', s.successRate + '%');
            set('statMood', s.avgMood + '%');
            set('statEnergy', s.avgEnergy + '%');

            // Net profit color
            const netEl = document.getElementById('statNet');
            if (netEl) netEl.style.color = s.netProfit >= 0 ? '#00d4aa' : '#ff4757';

            // Draw mini chart
            const canvas = document.getElementById('statsChart');
            if (canvas) statsDashboard.drawMiniChart(canvas, 'coins');
        } catch (e) {
            PAC.ErrorHandler.log('stats-ui', `refreshStatsTab error: ${e.message}`, e);
        }
    }

    function refreshDebugTab() {
        try {
            const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
            const timerStatus = PAC.Timer.getStatus();
            set('debugTimers', timerStatus.activeIntervals + ' intervals, ' + timerStatus.activeTimeouts + ' timeouts');
            set('debugErrors', PAC.ErrorHandler.errors.length);
            const storage = PAC.Storage.getUsage();
            set('debugStorage', `${storage.usedKB}KB / ${storage.maxKB}KB (${storage.pct}%)`);

            // Count loaded modules
            const modules = ['GameState', 'PixelEngine', 'AgentManager', 'TechTree', 'SlotMachine',
                'GoldTrading', 'GoldTradingUI', 'BilliardGame', 'PokerDeck', 'FarmManager',
                'StatsDashboard', 'AgentChatbox'].filter(m => typeof window[m] !== 'undefined');
            set('debugModules', modules.length + ' loaded');
        } catch (e) { /* ignore debug errors */ }
    }

    // ============ TECH TREE UI ============
    function initTechTreeUI() {
        if (!techTree) return;

        techTree.onTechUnlocked = (tech) => {
            showToast(`🔬 Đã nghiên cứu xong: ${tech.icon} ${tech.name}!`, 'success');
            manager.addLog('system', `🔬 Công nghệ mới: ${tech.icon} ${tech.name} — ${tech.desc}`, 'success');
            refreshHUD();
            // Refresh modal if open
            if (document.getElementById('techTreeOverlay')?.classList.contains('active')) {
                renderTechTreeNodes();
            }
        };

        techTree.onResearchUpdate = (techId, progress) => {
            refreshHUD();
        };
    }

    function openTechTreeModal() {
        if (!techTree) return;
        const overlay = document.getElementById('techTreeOverlay');
        if (!overlay) return;
        overlay.classList.add('active');
        game?.sfx?.click?.();
        renderTechTreeNodes();
    }

    function renderTechTreeNodes() {
        if (!techTree) return;

        // Update header
        const countEl = document.getElementById('techUnlockedCount');
        if (countEl) countEl.textContent = `(${techTree.unlocked.length}/${techTree.techs.length})`;

        const statusEl = document.getElementById('techResearchStatus');
        if (statusEl) statusEl.textContent = techTree.getProgressText();

        const speedEl = document.getElementById('techResearchSpeed');
        if (speedEl) {
            techTree._updateResearchSpeed();
            speedEl.textContent = `⚡ ${techTree.researchSpeed.toFixed(1)}x`;
        }

        // Render each branch
        ['engineering', 'ai_research', 'management'].forEach(branchName => {
            const container = document.getElementById(`techBranch-${branchName}`);
            if (!container) return;
            container.innerHTML = '';

            const techs = techTree.getBranch(branchName);
            techs.forEach((tech, idx) => {
                // Connector between nodes
                if (idx > 0) {
                    const connector = document.createElement('div');
                    connector.className = 'tech-node-connector';
                    if (techTree.isUnlocked(techs[idx - 1].id)) connector.classList.add('active');
                    connector.textContent = '→';
                    container.appendChild(connector);
                }

                const node = document.createElement('div');
                node.className = 'tech-node';

                // Determine state
                const isUnlocked = techTree.isUnlocked(tech.id);
                const isResearching = techTree.currentResearch === tech.id;
                const canResearch = techTree.canResearch(tech.id);
                const prereqsMet = tech.requires.every(r => techTree.isUnlocked(r));

                if (isUnlocked) node.classList.add('unlocked');
                else if (isResearching) node.classList.add('researching');
                else if (canResearch) node.classList.add('available');
                else node.classList.add('locked');

                node.innerHTML = `
                    <div class="tech-node-icon">${tech.icon}</div>
                    <div class="tech-node-name">${tech.name}</div>
                    <div class="tech-node-desc">${tech.desc}</div>
                    <div class="tech-node-cost">${isUnlocked ? '✅ Đã mở' : isResearching ? `⏳ ${Math.floor(techTree.researchProgress)}%` : `💰 ${tech.cost}Ⓒ · ${tech.researchDays}d`}</div>
                    ${isResearching ? `<div class="tech-node-progress"><div class="tech-node-progress-fill" style="width:${Math.floor(techTree.researchProgress)}%"></div></div>` : ''}
                    ${!isUnlocked && !isResearching && prereqsMet ? `<button class="tech-node-btn" data-tech="${tech.id}" ${canResearch ? '' : 'disabled'}>🔬 Nghiên cứu</button>` : ''}
                    ${isResearching ? `<button class="tech-node-btn" data-cancel="${tech.id}" style="border-color:var(--accent-tertiary);color:var(--accent-tertiary)">✕ Hủy</button>` : ''}
                `;

                container.appendChild(node);
            });
        });

        // Bind research buttons
        document.querySelectorAll('.tech-node-btn[data-tech]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const techId = btn.dataset.tech;
                if (techTree.startResearch(techId)) {
                    showToast(`🔬 Bắt đầu nghiên cứu: ${techTree.getTech(techId).name}`, 'info');
                    manager.addLog('system', `🔬 Bắt đầu R&D: ${techTree.getTech(techId).icon} ${techTree.getTech(techId).name}`, 'info');
                    renderTechTreeNodes();
                    refreshHUD();
                } else {
                    const tech = techTree.getTech(techId);
                    if (tech && !game.canAfford(tech.cost)) {
                        showToast(`💸 Không đủ tiền! Cần ${tech.cost}Ⓒ`, 'error');
                    }
                }
            });
        });

        // Bind cancel buttons
        document.querySelectorAll('.tech-node-btn[data-cancel]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                techTree.cancelResearch();
                showToast('🔬 Đã hủy nghiên cứu (hoàn 50% chi phí)', 'warning');
                renderTechTreeNodes();
                refreshHUD();
            });
        });
    }

    // ============ KEYBOARD SHORTCUTS ============
    function initKeyboardShortcuts() {
        const shortcutOverlay = document.getElementById('shortcutOverlay');
        const btnShortcuts = document.getElementById('btnShortcuts');

        if (btnShortcuts) btnShortcuts.addEventListener('click', () => {
            if (shortcutOverlay) shortcutOverlay.style.display = 'flex';
        });

        document.addEventListener('keydown', (e) => {
            // Don't fire if typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!game || !game.started) return;

            const key = e.key.toLowerCase();

            // Shortcut overlay — close on any key
            if (shortcutOverlay && shortcutOverlay.style.display !== 'none') {
                shortcutOverlay.style.display = 'none';
                return;
            }

            switch (key) {
                case ' ': // Space = pause/resume
                    e.preventDefault();
                    document.getElementById('btnPauseGame')?.click();
                    break;
                case '1':
                    game.gameSpeed = 1;
                    updateSpeedDisplay();
                    break;
                case '2':
                    game.gameSpeed = 2;
                    updateSpeedDisplay();
                    break;
                case '3':
                    game.gameSpeed = 3;
                    updateSpeedDisplay();
                    break;
                case 'c':
                    document.getElementById('btnContracts')?.click();
                    break;
                case 'h':
                    document.getElementById('btnAddAgent')?.click();
                    break;
                case 's':
                    document.querySelector('[data-tab="stats"]')?.click();
                    break;
                case 'a':
                    openAchievements();
                    break;
                case 'n':
                    document.getElementById('btnNotifCenter')?.click();
                    break;
                case 'l':
                    document.querySelector('[data-tab="layout"]')?.click();
                    break;
                case 'm':
                    document.getElementById('settingBgmToggle')?.click();
                    break;
                case 'r':
                    openTechTreeModal();
                    break;
                case 'f':
                    toggleFarmOverlay();
                    break;
                case 'escape':
                    // Close all modals (with null safety)
                    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
                    document.getElementById('notifCenter')?.style.setProperty('display', 'none');
                    document.getElementById('farmOverlay')?.style.setProperty('display', 'none');
                    break;
                case '?':
                case '/':
                    if (shortcutOverlay) shortcutOverlay.style.display = 'flex';
                    break;
            }
        });
    }

    // ============ ENHANCED STATS ============

    function refreshStats() {
        const grid = document.getElementById('statsGrid');
        if (!grid) return;
        const agents = Array.from(manager.agents.values());

        // Calculate net profit
        const netProfit = game.totalEarned - game.totalSpent;
        const profitColor = netProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-tertiary)';
        const profitSign = netProfit >= 0 ? '+' : '';

        grid.innerHTML = `
            <div class="stat-card"><div class="stat-value">${game.formatCoins(game.totalEarned)}</div><div class="stat-label">Tổng Thu</div></div>
            <div class="stat-card"><div class="stat-value">${game.formatCoins(game.totalSpent)}</div><div class="stat-label">Tổng Chi</div></div>
            <div class="stat-card"><div class="stat-value" style="color:${profitColor}">${profitSign}${game.formatCoins(Math.abs(netProfit))}</div><div class="stat-label">Lợi Nhuận</div></div>
            <div class="stat-card"><div class="stat-value">${game.completedContracts}</div><div class="stat-label">Hợp Đồng ✅</div></div>
            <div class="stat-card"><div class="stat-value">${game.failedContracts}</div><div class="stat-label">Thất Bại ❌</div></div>
            <div class="stat-card"><div class="stat-value">${agents.length}</div><div class="stat-label">Agents</div></div>
            <div class="stat-card"><div class="stat-value">${manager.tasks.filter(t=>t.status==='completed').length}</div><div class="stat-label">Tasks Done</div></div>
            <div class="stat-card"><div class="stat-value">${_achievements ? _achievements.getUnlockedCount() + '/' + _achievements.getTotalCount() : '-'}</div><div class="stat-label">Thành Tựu 🏆</div></div>
            <div class="stat-card"><div class="stat-value">${game.day}</div><div class="stat-label">Ngày</div></div>
        `;

        // Mini productivity chart
        if (manager.performanceHistory.length > 2) {
            const chartHtml = '<div class="mini-chart">' +
                manager.performanceHistory.slice(-20).map(p =>
                    `<div class="mini-bar" style="height:${Math.max(2, p.productivity)}%" data-tooltip="${Math.round(p.productivity)}%"></div>`
                ).join('') +
            '</div>';
            grid.insertAdjacentHTML('beforeend',
                `<div class="stat-card" style="grid-column:span 2"><div class="stat-label">📊 Năng Suất</div>${chartHtml}</div>`
            );
        }

        // Agent Leaderboard
        if (agents.length > 0) {
            const sorted = [...agents].sort((a, b) => b.tasksCompleted - a.tasksCompleted).slice(0, 5);
            const rankEmojis = ['🥇', '🥈', '🥉', '4', '5'];
            const rows = sorted.map((a, i) =>
                `<div class="leader-row">
                    <span class="leader-rank">${rankEmojis[i] || i+1}</span>
                    <span class="leader-name">${a.name}</span>
                    <span class="leader-stat">Lv.${a.level} • ${a.tasksCompleted} tasks</span>
                </div>`
            ).join('');
            grid.insertAdjacentHTML('beforeend',
                `<div class="stat-card" style="grid-column:span 2">
                    <div class="stats-leaderboard-title">🏆 Bảng Xếp Hạng</div>
                    ${rows}
                </div>`
            );
        }
    }

    // ============ FARM UI SYSTEM ============

    let _selectedSeedId = null;

    function toggleFarmOverlay() {
        const el = document.getElementById('farmOverlay');
        if (!el) return;
        const visible = el.style.display !== 'none';
        el.style.display = visible ? 'none' : 'flex';
        if (!visible) refreshFarmUI();
    }

    function initFarmUI() {
        // Close button
        document.getElementById('closeFarm')?.addEventListener('click', () => {
            document.getElementById('farmOverlay').style.display = 'none';
        });
        // Click overlay backdrop to close
        document.getElementById('farmOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'farmOverlay') e.target.style.display = 'none';
        });

        // Tab switching
        document.querySelectorAll('.farm-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.farm-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.farm-tab-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const paneId = 'farm' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1) + 'Pane';
                document.getElementById(paneId)?.classList.add('active');
                refreshFarmUI();
            });
        });

        // Water All
        document.getElementById('btnWaterAll')?.addEventListener('click', () => {
            if (!farmManager) return;
            let count = 0;
            farmManager.plots.forEach(p => {
                if ((p.state === 'planted' || p.state === 'growing') && !p.watered) { farmManager.waterPlot(p.id); count++; }
            });
            if (count > 0) showToast(`💧 Đã tưới ${count} luống!`, 'info');
            refreshFarmUI();
        });

        // Harvest All
        document.getElementById('btnHarvestAll')?.addEventListener('click', () => {
            if (!farmManager) return;
            let count = 0;
            farmManager.plots.forEach(p => {
                if (p.state === 'ready') { farmManager.harvestPlot(p.id); count++; }
            });
            if (count > 0) showToast(`🌾 Thu hoạch ${count} luống!`, 'success');
            refreshFarmUI();
        });

        // Sell All
        document.getElementById('btnSellAll')?.addEventListener('click', () => {
            if (!farmManager) return;
            const total = farmManager.sellAllProduce();
            if (total > 0) {
                game.earn(total, 'Farm produce sold');
                showToast(`💰 Bán sản phẩm: +${total}Ⓒ`, 'success');
                manager.addLog('system', `💰 Bán toàn bộ nông sản: +${total}Ⓒ`, 'success');
            } else {
                showToast('📦 Kho trống!', 'warning');
            }
            refreshFarmUI();
        });
    }

    function updateFarmWeatherDisplay() {
        if (!farmManager) return;
        const weatherEmojis = { sunny: '☀️', rainy: '🌧️', cloudy: '☁️', stormy: '⛈️', hot: '🔥' };
        const weatherNames = { sunny: 'Nắng đẹp', rainy: 'Mưa', cloudy: 'Nhiều mây', stormy: 'Bão', hot: 'Nóng' };
        const w = farmManager.weather;
        const el = document.getElementById('farmWeather');
        if (el) el.textContent = `${weatherEmojis[w] || '☀️'} ${weatherNames[w] || w}`;
    }

    function refreshFarmUI() {
        if (!farmManager) return;
        updateFarmWeatherDisplay();

        // Stats bar
        const totalProduce = Object.values(farmManager.inventory).reduce((s, v) => s + v, 0);
        const plantedCount = farmManager.plots.filter(p => p.state !== 'empty').length;
        const readyCount = farmManager.plots.filter(p => p.state === 'ready').length;
        setText('farmProduceCount', totalProduce);
        setText('farmPlantedCount', plantedCount);
        setText('farmReadyCount', readyCount);

        renderFarmPlots();
        renderSeedShop();
        renderRecipes();
        renderFarmInventory();
    }

    function renderFarmPlots() {
        const grid = document.getElementById('farmGrid');
        if (!grid || !farmManager) return;
        grid.innerHTML = farmManager.plots.map(plot => {
            const seed = farmManager.seedCatalog.find(s => s.id === plot.seedId);
            const stateClass = plot.state === 'empty' ? 'empty' : plot.state === 'ready' ? 'ready' : 'growing';
            const growPct = plot.growthStage >= 3 ? 100 : Math.round((plot.growthStage / 3) * 100);
            const stageIcons = ['🟤', '🌱', '🌿', '🌾'];
            return `<div class="farm-plot-card ${stateClass}" data-plot="${plot.id}">
                <div class="plot-header">
                    <span class="plot-id">#${plot.id + 1}</span>
                    <span class="plot-status">${plot.watered ? '💧' : ''}</span>
                </div>
                <div class="plot-crop-icon">${seed ? (stageIcons[plot.growthStage] || '🌱') : ''}</div>
                <div class="plot-crop-name">${seed ? seed.name : 'Trống'}</div>
                ${plot.state !== 'empty' ? `<div class="plot-growth-bar"><div class="plot-growth-fill ${plot.state === 'ready' ? 'ready' : ''}" style="width:${growPct}%"></div></div>` : ''}
                <div class="plot-actions">
                    ${plot.state === 'empty' && _selectedSeedId ? `<button class="plot-btn" onclick="window._farmPlant(${plot.id})">🌱 Trồng</button>` : ''}
                    ${plot.state === 'empty' && !_selectedSeedId ? `<button class="plot-btn" onclick="document.querySelector('.farm-tab[data-tab=seeds]')?.click()">🛒 Chọn giống</button>` : ''}
                    ${(plot.state === 'planted' || plot.state === 'growing') && !plot.watered ? `<button class="plot-btn" onclick="window._farmWater(${plot.id})">💧 Tưới</button>` : ''}
                    ${plot.state === 'ready' ? `<button class="plot-btn harvest" onclick="window._farmHarvest(${plot.id})">🌾 Hái</button>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    function renderSeedShop() {
        const grid = document.getElementById('seedGrid');
        if (!grid || !farmManager) return;
        grid.innerHTML = farmManager.seedCatalog.map(seed => {
            const selected = _selectedSeedId === seed.id;
            return `<div class="seed-card ${selected ? 'selected' : ''}" onclick="window._farmSelectSeed('${seed.id}')">
                <div class="seed-icon">${seed.icon}</div>
                <div class="seed-name"><span class="seed-color-dot" style="background:${seed.color}"></span>${seed.name}</div>
                <div class="seed-price">${seed.cost}Ⓒ</div>
                <div class="seed-time">⏱️ ${seed.growDays} ngày</div>
            </div>`;
        }).join('');
    }

    function renderRecipes() {
        const grid = document.getElementById('recipeGrid');
        if (!grid || !farmManager) return;
        grid.innerHTML = farmManager.recipesUI.map(recipe => {
            const canCook = farmManager.canCook(recipe.id);
            const ingText = recipe.ingredients.map(ing => {
                const seed = farmManager.seedCatalog.find(s => s.id === ing.id);
                const have = farmManager.inventory[ing.id] || 0;
                const enough = have >= ing.qty;
                return `<span style="color:${enough ? '#78e08f' : '#ff6b6b'}">${seed?.icon || '?'}x${ing.qty}</span>`;
            }).join(' ');
            return `<div class="recipe-card ${canCook ? 'can-cook' : ''}" onclick="window._farmCook('${recipe.id}')">
                <div class="recipe-header">
                    <span class="recipe-icon">${recipe.icon}</span>
                    <span class="recipe-name">${recipe.name}</span>
                </div>
                <div class="recipe-ingredients">${ingText}</div>
                <span class="recipe-effect">⚡+${recipe.energyBoost || 0} 😊+${recipe.moodBoost || 0}</span>
                <span class="recipe-price">💰 ${recipe.sellPrice}Ⓒ</span>
            </div>`;
        }).join('');
    }

    function renderFarmInventory() {
        const el = document.getElementById('farmInventory');
        if (!el || !farmManager) return;
        const items = Object.entries(farmManager.inventory).filter(([, v]) => v > 0);
        if (items.length === 0) {
            el.innerHTML = '<div class="farm-empty"><div class="farm-empty-icon">📦</div>Kho trống</div>';
            return;
        }
        el.innerHTML = items.map(([id, count]) => {
            const seed = farmManager.seedCatalog.find(s => s.id === id);
            const recipe = farmManager.recipes.find(r => r.id === id);
            const item = seed || recipe;
            return `<div class="inv-item">
                <div class="inv-icon">${item?.icon || '📦'}</div>
                <div class="inv-name">${item?.name || id}</div>
                <div class="inv-count">x${count}</div>
                <div class="inv-sell-price">${(item?.sellPrice || seed?.sellPrice || 0)}Ⓒ</div>
            </div>`;
        }).join('');
    }

    // Global farm action handlers (called from onclick in rendered HTML)
    window._farmSelectSeed = (seedId) => {
        _selectedSeedId = (_selectedSeedId === seedId) ? null : seedId;
        refreshFarmUI();
    };
    window._farmPlant = (plotId) => {
        if (!farmManager || !_selectedSeedId) return;
        const seed = farmManager.seedCatalog.find(s => s.id === _selectedSeedId);
        if (!seed) return;
        if (!game.canAfford(seed.cost)) { showToast('💰 Không đủ tiền mua hạt giống!', 'warning'); return; }
        if (farmManager.plantSeed(plotId, _selectedSeedId)) {
            game.spend(seed.cost, `Buy seed: ${seed.name}`);
            showToast(`🌱 Trồng ${seed.name} ở luống ${plotId + 1}!`, 'success');
        }
        refreshFarmUI();
    };
    window._farmWater = (plotId) => {
        if (!farmManager) return;
        farmManager.waterPlot(plotId);
        refreshFarmUI();
    };
    window._farmHarvest = (plotId) => {
        if (!farmManager) return;
        const result = farmManager.harvestPlot(plotId);
        if (result) showToast(`🌾 Thu hoạch ${result.name} x${result.qty}!`, 'success');
        refreshFarmUI();
    };
    window._farmCook = (recipeId) => {
        if (!farmManager) return;
        const result = farmManager.cook(recipeId);
        if (result.ok) {
            const r = result.recipe;
            showToast(`🍳 Nấu ${r.name} thành công!`, 'success');
            // Boost all agents based on recipe effect
            Array.from(manager.agents.values()).forEach(a => {
                if (r.effect === 'energy' || r.effect === 'all') a.energy = Math.min(100, a.energy + r.value);
                if (r.effect === 'mood' || r.effect === 'all') a.mood = Math.min(100, a.mood + r.value);
            });
            manager.addLog('system', `🍳 ${r.name} đã nấu! Tất cả agent +${r.value} ${r.effect}!`, 'success');
        } else {
            showToast(`❌ ${result.msg}`, 'warning');
        }
        refreshFarmUI();
    };

    // ============ BOOT ============
    document.addEventListener('DOMContentLoaded', initStartScreen);
})();
