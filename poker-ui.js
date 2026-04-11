/**
 * Poker UI v2.1 — Visual poker table overlay for PixelAgent City
 * Now with face-up cards, action animations, and enhanced UI
 */
class PokerUI {
    constructor(containerEl, game) {
        this.container = containerEl || document.getElementById('pokerOverlay');
        this.game = game;
        this.isOpen = false;
        this.onClose = () => {};
        this._logLines = [];
        this._lastAction = null;  // Track last action for animation
        this._actionTimeout = null;
    }

    show() {
        this.isOpen = true;
        this._logLines = [];
        this._lastAction = null;
        this.container.style.display = 'flex';

        // Hook into game's onAction for live action labels
        const origOnAction = this.game.onAction;
        this.game.onAction = (player, action, amount) => {
            this._lastAction = { playerId: player.id, action, amount, time: Date.now() };
            clearTimeout(this._actionTimeout);
            this._actionTimeout = setTimeout(() => { this._lastAction = null; }, 2000);
            if (origOnAction) origOnAction(player, action, amount);
        };

        this.render(this.game.getState());
        requestAnimationFrame(() => this.container.classList.add('open'));
    }

    close() {
        this.container.classList.remove('open');
        clearTimeout(this._actionTimeout);
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isOpen = false;
            if (this.game) {
                this.game.stop();
            }
            this.onClose();
        }, 300);
    }

    render(state) {
        if (!state || !this.isOpen) return;

        this.container.innerHTML = `
            <div class="poker-scene">
                <div class="poker-close-btn" id="pokerCloseBtn" title="Đóng">✕</div>

                <div class="poker-table-wrapper">
                    ${this._renderInfoPanel(state)}
                    <div class="poker-table">
                        <div class="poker-felt">
                            <div class="poker-community">
                                ${this._renderPhaseLabel(state)}
                                <div class="poker-pot">
                                    <span class="poker-pot-icon">💰</span>
                                    Pot: <strong>${state.pot}</strong>
                                </div>
                                <div class="poker-community-cards">
                                    ${this._renderCommunityCards(state)}
                                </div>
                            </div>
                        </div>
                        ${this._renderPlayerSeats(state)}
                    </div>
                    ${this._renderHistoryPanel(state)}
                </div>

                <div class="poker-controls">
                    ${state.phase === 'waiting' ? `<button class="poker-btn poker-btn-start" id="pokerStartBtn">🃏 Bắt đầu chơi</button>` : ''}
                    ${state.phase === 'finished' ? `<button class="poker-btn poker-btn-start" id="pokerNewGameBtn">🔄 Ván mới</button>` : ''}
                    <button class="poker-btn poker-btn-close" id="pokerCloseBtnAlt">🚪 Đóng bàn</button>
                </div>
            </div>
        `;

        this._bindEvents();
    }

    _bindEvents() {
        this.container.querySelector('#pokerCloseBtn')?.addEventListener('click', () => this.close());
        this.container.querySelector('#pokerCloseBtnAlt')?.addEventListener('click', () => this.close());
        this.container.querySelector('#pokerStartBtn')?.addEventListener('click', () => {
            if (this.game) this.game.start();
        });
        this.container.querySelector('#pokerNewGameBtn')?.addEventListener('click', () => {
            if (!this.game) return;
            this.game.players.forEach(p => { 
                p.chips = 200; 
                p.folded = false; 
                p.totalWon = 0; 
                p.handsWon = 0; 
            });
            this.game.handNumber = 0;
            this.game.history = [];
            this.game.phase = 'waiting';
            this._logLines = [];
            this.game.isRunning = true;
            this.game.start();
        });
    }

    _renderPhaseLabel(state) {
        const phaseLabels = {
            waiting: '⏳ Chờ bắt đầu...',
            preflop: '🂠 Pre-Flop',
            flop: '🃏 Flop',
            turn: '🃏 Turn',
            river: '🃏 River',
            showdown: '🏆 SHOWDOWN!',
            finished: '🎊 Kết thúc',
        };
        const cls = (state.phase === 'showdown') ? 'showdown' : 
                     (state.phase === 'finished') ? 'finished' : '';
        return `<div class="poker-phase-label ${cls}">${phaseLabels[state.phase] || state.phase}</div>`;
    }

    _renderCommunityCards(state) {
        const cards = state.communityCards;
        let html = '';
        for (let i = 0; i < 5; i++) {
            if (i < cards.length) {
                const card = cards[i];
                const isRed = card.suit === '♥' || card.suit === '♦';
                const delay = i * 0.1;
                html += `<div class="poker-card dealt ${isRed ? 'red' : 'black'}" style="animation-delay: ${delay}s">
                    <span class="poker-card-rank">${card.rank}</span>
                    <span class="poker-card-suit">${card.suit}</span>
                </div>`;
            } else {
                html += `<div class="poker-card empty"></div>`;
            }
        }
        return html;
    }

    _renderPlayerSeats(state) {
        const positions = this._getSeatPositions(state.players.length);
        let html = '';

        state.players.forEach((player, i) => {
            const pos = positions[i];
            const isDealer = i === state.dealerIndex;
            const isPlaying = state.phase !== 'showdown' && state.phase !== 'finished' && state.phase !== 'waiting';
            const isCurrent = i === state.currentPlayerIndex && isPlaying;
            const lastWin = state.history.length > 0 ? state.history[state.history.length - 1] : null;
            const isWinner = state.phase === 'showdown' && lastWin?.winnerId === player.id;

            let statusClass = '';
            if (player.folded) statusClass = 'folded';
            else if (player.allIn) statusClass = 'all-in';
            else if (isCurrent) statusClass = 'active';

            // Always show cards face-up (spectator mode!) unless waiting
            const showCards = state.phase !== 'waiting' && player.holeCards.length > 0;

            // Determine hand strength text during play
            let handStrengthHtml = '';
            if (showCards && !player.folded && state.communityCards.length >= 3) {
                // Show evaluated hand name if community cards exist
                if (player._handResult) {
                    handStrengthHtml = `<div class="poker-hand-name">${player._handResult.name}</div>`;
                }
            }

            // Action label animation
            let actionHtml = '';
            if (this._lastAction && this._lastAction.playerId === player.id) {
                const act = this._lastAction;
                const actionLabels = {
                    fold: { text: '❌ BỎ BÀI', cls: 'action-fold' },
                    check: { text: '✋ CHECK', cls: 'action-check' },
                    call: { text: `📞 CALL ${act.amount}`, cls: 'action-call' },
                    raise: { text: `🔥 RAISE ${act.amount}`, cls: 'action-raise' },
                };
                const label = actionLabels[act.action];
                if (label) {
                    actionHtml = `<div class="poker-action-label ${label.cls}">${label.text}</div>`;
                }
            }

            html += `
                <div class="poker-seat ${pos.position} ${statusClass} ${isWinner ? 'winner' : ''}" style="${pos.style}">
                    ${isWinner ? `<div class="poker-win-badge">🏆 THẮNG +${lastWin?.amount || 0}</div>` : ''}
                    ${actionHtml}
                    <div class="poker-player-cards">
                        ${this._renderHoleCards(player, showCards)}
                    </div>
                    <div class="poker-player-info">
                        <span class="poker-player-chips">
                            <span class="poker-chips-icon">🪙</span>
                            <strong>${player.chips}</strong>
                        </span>
                        ${handStrengthHtml}
                    </div>
                    <div class="poker-player-name">
                        <span class="poker-player-emoji">${player.emoji || '🤖'}</span>
                        ${player.name}
                    </div>
                    ${player.currentBet > 0 ? `<div class="poker-player-bet">💵 ${player.currentBet}</div>` : ''}
                    ${player.folded ? `<div class="poker-fold-label">BỎ BÀI</div>` : ''}
                    ${player.allIn ? `<div class="poker-allin-label">🔥 ALL IN!</div>` : ''}
                    ${isDealer ? `<div class="poker-dealer-badge">D</div>` : ''}
                </div>
            `;
        });

        return html;
    }

    _renderHoleCards(player, showFront) {
        if (!player.holeCards || player.holeCards.length === 0) {
            return '<div class="poker-card mini empty"></div><div class="poker-card mini empty"></div>';
        }

        return player.holeCards.map((card, idx) => {
            if (showFront && !player.folded) {
                const isRed = card.suit === '♥' || card.suit === '♦';
                const delay = idx * 0.08;
                return `<div class="poker-card mini dealt ${isRed ? 'red' : 'black'}" style="animation-delay: ${delay}s">
                    <span class="poker-card-rank">${card.rank}</span>
                    <span class="poker-card-suit">${card.suit}</span>
                </div>`;
            }
            if (player.folded) {
                return `<div class="poker-card mini facedown folded-card"></div>`;
            }
            return `<div class="poker-card mini facedown"></div>`;
        }).join('');
    }

    _renderInfoPanel(state) {
        // Build chip leaderboard
        const sorted = [...state.players].sort((a, b) => b.chips - a.chips);
        const leaderHtml = sorted.map((p, i) => {
            const crown = i === 0 ? '👑' : '';
            const busted = p.chips <= 0 ? ' style="opacity:0.4;text-decoration:line-through"' : '';
            return `<div class="poker-leader-row"${busted}>
                ${crown} ${p.emoji || '🤖'} ${p.name}: <strong>${p.chips}</strong>
            </div>`;
        }).join('');

        return `
            <div class="poker-info-panel">
                <div class="poker-info-header">
                    <div class="poker-blinds">🎰 Blinds: ${state.blinds.small}/${state.blinds.big}</div>
                </div>
                <div class="poker-info-body">
                    <div class="poker-hand-num">Ván #<strong>${state.handNumber}</strong></div>
                    <div class="poker-hand-num">Còn lại: <strong>${state.players.filter(p => p.chips > 0).length}/${state.players.length}</strong></div>
                    <div class="poker-info-divider"></div>
                    <div class="poker-leaderboard-title">📊 Bảng xếp hạng</div>
                    ${leaderHtml}
                </div>
            </div>
        `;
    }

    _renderHistoryPanel(state) {
        if (state.history.length === 0) return '';
        const recent = state.history.slice(-8).reverse();
        return `
            <div class="poker-history-panel">
                <table class="poker-history-table">
                    <thead>
                        <tr><th>#</th><th>Người thắng</th><th>Pot</th><th>Bài</th></tr>
                    </thead>
                    <tbody>
                        ${recent.map(h => `
                            <tr>
                                <td>${h.hand}</td>
                                <td>${h.winnerEmoji || '🤖'} ${h.winner}</td>
                                <td>+${h.amount}</td>
                                <td class="poker-history-hand">${h.handName || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    _getSeatPositions(count) {
        const layouts = {
            2: [
                { position: 'seat-top', style: 'top: -12%; left: 50%; transform: translateX(-50%);' },
                { position: 'seat-bottom', style: 'bottom: -12%; left: 50%; transform: translateX(-50%);' },
            ],
            3: [
                { position: 'seat-top', style: 'top: -12%; left: 50%; transform: translateX(-50%);' },
                { position: 'seat-bottom-left', style: 'bottom: -10%; left: 15%;' },
                { position: 'seat-bottom-right', style: 'bottom: -10%; right: 15%;' },
            ],
            4: [
                { position: 'seat-top-left', style: 'top: -12%; left: 20%;' },
                { position: 'seat-top-right', style: 'top: -12%; right: 20%;' },
                { position: 'seat-bottom-left', style: 'bottom: -12%; left: 20%;' },
                { position: 'seat-bottom-right', style: 'bottom: -12%; right: 20%;' },
            ],
            5: [
                { position: 'seat-top', style: 'top: -12%; left: 50%; transform: translateX(-50%);' },
                { position: 'seat-right', style: 'top: 30%; right: -8%;' },
                { position: 'seat-bottom-right', style: 'bottom: -10%; right: 18%;' },
                { position: 'seat-bottom-left', style: 'bottom: -10%; left: 18%;' },
                { position: 'seat-left', style: 'top: 30%; left: -8%;' },
            ],
            6: [
                { position: 'seat-top-left', style: 'top: -12%; left: 20%;' },
                { position: 'seat-top-right', style: 'top: -12%; right: 20%;' },
                { position: 'seat-right', style: 'top: 35%; right: -8%;' },
                { position: 'seat-bottom-right', style: 'bottom: -12%; right: 20%;' },
                { position: 'seat-bottom-left', style: 'bottom: -12%; left: 20%;' },
                { position: 'seat-left', style: 'top: 35%; left: -8%;' },
            ],
        };
        return layouts[count] || layouts[Math.min(count, 6)] || layouts[2];
    }

    /** Subscribe this UI to a PokerGame so it auto-rerenders on every update */
    attach(game) {
        this.game = game;
        const self = this;
        game.onUpdate = () => self.render(game.getState());
        game.onPhaseChange = () => self.render(game.getState());
        game.onGameLog = (msg) => {
            self._logLines.unshift(msg);
            if (self._logLines.length > 30) self._logLines.pop();
        };
    }
}

// ============ GLOBAL EXPORT ============
window.PokerUI = PokerUI;
