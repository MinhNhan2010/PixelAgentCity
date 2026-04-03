/**
 * PixelAgent City — Main App Controller (Game Mode)
 * Fixed: correct PixelEngine API, proper Start Screen flow, addAgentSprite
 */
(function () {
    'use strict';

    let engine, manager, editor, chatbox, game;

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
        // Clear all old data
        localStorage.removeItem('pixelAgentData');
        localStorage.removeItem('pixelAgentLayout');
        localStorage.removeItem('pixelAgentGameState');

        game = new GameState();
        game.startNewGame();
        hideStartScreen();
        initGameWorld(true);
    }

    function continueGame() {
        game = new GameState();
        game.loadGame();
        game.continueGame();
        hideStartScreen();
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

    // ============ WORLD INIT ============
    function initGameWorld(isNewGame) {
        drawLogoSmall();

        // PixelEngine takes string IDs (canvas ID, minimap ID)
        engine = new PixelEngine('officeCanvas', 'minimapCanvas');

        // AgentManager takes engine reference
        manager = new AgentManager(engine);

        // LayoutEditor takes engine reference
        editor = new LayoutEditor(engine);
        editor.loadSavedLayout(true);

        // Chatbox
        chatbox = new AgentChatbox(manager, engine);

        // Connect game callbacks
        connectGameCallbacks();

        // Load saved agent data OR create starter agents
        if (isNewGame) {
            createStarterAgents();
        } else {
            const loaded = manager.loadFromStorage();
            if (!loaded || manager.agents.size === 0) {
                createStarterAgents();
            }
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

        // Simulation tick (agent AI)
        setInterval(() => {
            if (!game.isPaused && !game.isGameOver && game.started) {
                for (let i = 0; i < game.gameSpeed; i++) {
                    manager.simulateTick();
                }
                // Sync engine sprites with agent statuses
                manager.agents.forEach(a => {
                    engine.updateAgentStatus(a.id, a.status);
                });
            }
        }, 500);

        // HUD refresh every second
        setInterval(() => {
            if (game.started && !game.isGameOver) {
                refreshHUD();
                refreshAgentList();
                refreshTaskList();
            }
        }, 1000);

        // Auto-save every 30s
        setInterval(() => {
            if (game.started && !game.isGameOver) {
                editor?.flushAutoSave?.();
                game.updateSalaryCache(Array.from(manager.agents.values()));
                game.saveGame(manager);
                manager.saveToStorage();
            }
        }, 30000);

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

        setInterval(updateClock, 1000);
        createParticles();
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
        const emoji = { coder:'💻', reviewer:'🔍', tester:'🧪', designer:'🎨', devops:'⚙️', researcher:'🔬', analyst:'📊', security:'🛡️', backend:'🗄️', mobile:'📱', writer:'✍️' };
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

        document.getElementById('btnContracts').onclick = openContractBoard;
        document.getElementById('closeContracts').onclick = () => document.getElementById('modalContracts').classList.remove('active');

        // Speed button cycle 1x→2x→3x→1x
        document.getElementById('btnSpeed').onclick = () => {
            const speeds = [1, 2, 3];
            game.gameSpeed = speeds[(speeds.indexOf(game.gameSpeed) + 1) % speeds.length];
            const btn = document.getElementById('btnSpeed');
            btn.textContent = `▶ ${game.gameSpeed}x`;
            btn.classList.toggle('active', game.gameSpeed > 1);
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

        document.getElementById('btnSettings').onclick = () => {
            if (confirm('⚠️ Reset toàn bộ game data?')) { localStorage.clear(); location.reload(); }
        };
        const clearLogs = () => { manager.logs = []; refreshLogs(); };
        document.getElementById('btnClearLogs')?.addEventListener('click', clearLogs);
        document.getElementById('btnClearLogsFooter')?.addEventListener('click', clearLogs);
        document.getElementById('btnFullscreen')?.addEventListener('click', () => {
            const vp = document.getElementById('officeViewport');
            if (document.fullscreenElement) document.exitFullscreen();
            else vp.requestFullscreen?.();
        });

        // Layout editor toolbar buttons
        document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool === 'layout') { editor.toggle(); return; }
                document.querySelectorAll('.toolbar-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                editor.setTool(tool);
                if (!editor.active) editor.toggle();
            });
        });
    }

    // ============ AGENT LIST ============
    function refreshAgentList() {
        const list = document.getElementById('agentList');
        if (!list) return;
        const agents = Array.from(manager.agents.values());

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
    function refreshStats() {
        const grid = document.getElementById('statsGrid');
        if (!grid) return;
        const agents = Array.from(manager.agents.values());
        grid.innerHTML = `
            <div class="stat-card"><div class="stat-value">${game.formatCoins(game.totalEarned)}</div><div class="stat-label">Total Earned</div></div>
            <div class="stat-card"><div class="stat-value">${game.formatCoins(game.totalSpent)}</div><div class="stat-label">Total Spent</div></div>
            <div class="stat-card"><div class="stat-value">${game.completedContracts}</div><div class="stat-label">Contracts ✅</div></div>
            <div class="stat-card"><div class="stat-value">${game.failedContracts}</div><div class="stat-label">Failed ❌</div></div>
            <div class="stat-card"><div class="stat-value">${agents.length}</div><div class="stat-label">Agents</div></div>
            <div class="stat-card"><div class="stat-value">${manager.tasks.filter(t=>t.status==='completed').length}</div><div class="stat-label">Tasks Done</div></div>`;
    }

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
    }

    // ============ BOOT ============
    document.addEventListener('DOMContentLoaded', initStartScreen);
})();
