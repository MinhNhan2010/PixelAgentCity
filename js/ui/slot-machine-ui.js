/**
 * Slot Machine UI — PixelAgent City
 * Retro pixel-art casino overlay with spinning reels animation
 */
class SlotMachineUI {
    constructor(overlayEl, slotGame) {
        this.overlay = overlayEl;
        this.game = slotGame;
        this.players = [];
        this.onClose = null;
        this._reelEls = [];
        this._resultEl = null;
        this._balanceEl = null;
        this._spinning = [false, false, false];
        this._spinTimers = [];
    }

    show() {
        this.overlay.innerHTML = '';
        this.overlay.classList.add('show');
        this._build();
    }

    hide() {
        this.overlay.classList.remove('show');
        this._spinTimers.forEach(t => clearInterval(t));
        this._spinTimers = [];
        setTimeout(() => { this.overlay.innerHTML = ''; }, 300);
        if (this.onClose) this.onClose();
    }

    _build() {
        const html = `
        <div class="slot-machine-container">
            <div class="slot-machine-header">
                <div class="slot-machine-title">
                    <span class="slot-neon">🎰</span>
                    <span class="slot-title-text">LUCKY PIXEL SLOTS</span>
                    <span class="slot-neon">🎰</span>
                </div>
                <button class="slot-close-btn" id="slotCloseBtn">✕</button>
            </div>

            <div class="slot-machine-body">
                <!-- Jackpot Display -->
                <div class="slot-jackpot-bar">
                    <div class="slot-jackpot-label">JACKPOT</div>
                    <div class="slot-jackpot-amount" id="slotJackpot">x50</div>
                </div>

                <!-- Reels -->
                <div class="slot-reels-frame">
                    <div class="slot-reel-container">
                        <div class="slot-reel" id="slotReel0">
                            <div class="slot-reel-symbol">❓</div>
                        </div>
                        <div class="slot-reel" id="slotReel1">
                            <div class="slot-reel-symbol">❓</div>
                        </div>
                        <div class="slot-reel" id="slotReel2">
                            <div class="slot-reel-symbol">❓</div>
                        </div>
                    </div>
                    <div class="slot-payline"></div>
                </div>

                <!-- Result display -->
                <div class="slot-result" id="slotResult">
                    <span class="slot-result-text">Chọn mức cược và SPIN!</span>
                </div>

                <!-- Controls -->
                <div class="slot-controls">
                    <div class="slot-bet-section">
                        <span class="slot-bet-label">BET:</span>
                        <div class="slot-bet-btns" id="slotBetBtns">
                            <button class="slot-bet-btn active" data-bet="10">10Ⓒ</button>
                            <button class="slot-bet-btn" data-bet="25">25Ⓒ</button>
                            <button class="slot-bet-btn" data-bet="50">50Ⓒ</button>
                            <button class="slot-bet-btn" data-bet="100">100Ⓒ</button>
                        </div>
                    </div>

                    <button class="slot-spin-btn" id="slotSpinBtn">
                        <span class="slot-spin-icon">🎰</span>
                        <span>SPIN</span>
                    </button>

                    <div class="slot-auto-section">
                        <label class="slot-auto-label">
                            <input type="checkbox" id="slotAutoSpin">
                            <span>AUTO</span>
                        </label>
                    </div>
                </div>

                <!-- Balance & Stats -->
                <div class="slot-footer">
                    <div class="slot-balance">
                        <span>💰 Balance:</span>
                        <span class="slot-balance-val" id="slotBalance">0Ⓒ</span>
                    </div>
                    <div class="slot-stats">
                        <span class="slot-stat">Spins: <b id="slotSpins">0</b></span>
                        <span class="slot-stat">Won: <b id="slotWon" class="slot-win-val">0Ⓒ</b></span>
                        <span class="slot-stat">Lost: <b id="slotLost" class="slot-lose-val">0Ⓒ</b></span>
                    </div>
                </div>

                <!-- Payout Table (collapsible) -->
                <details class="slot-payout-details">
                    <summary class="slot-payout-toggle">📋 Bảng Thưởng</summary>
                    <div class="slot-payout-table" id="slotPayoutTable"></div>
                </details>

                <!-- History -->
                <div class="slot-history" id="slotHistory"></div>

                <!-- Players -->
                <div class="slot-players" id="slotPlayers"></div>
            </div>
        </div>`;

        this.overlay.innerHTML = html;

        // Cache elements
        this._reelEls = [
            document.getElementById('slotReel0'),
            document.getElementById('slotReel1'),
            document.getElementById('slotReel2'),
        ];
        this._resultEl = document.getElementById('slotResult');
        this._balanceEl = document.getElementById('slotBalance');

        // Event listeners
        document.getElementById('slotCloseBtn').onclick = () => this.hide();
        document.getElementById('slotSpinBtn').onclick = () => this._doSpin();

        document.getElementById('slotAutoSpin').onchange = (e) => {
            this.game.autoSpin = e.target.checked;
        };

        document.querySelectorAll('.slot-bet-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.slot-bet-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.game.setBet(parseInt(btn.dataset.bet));
            };
        });

        // Connect game callbacks
        this.game.onReelStop = (idx, sym) => this._stopReel(idx, sym);
        this.game.onResult = (result) => this._showResult(result);
        this.game.onAutoSpinTick = () => this._doSpin();

        // Build payout table
        this._buildPayoutTable();
        this._renderPlayers();
        this._updateStats();
    }

    setBalance(coins) {
        if (this._balanceEl) this._balanceEl.textContent = coins + 'Ⓒ';
    }

    _doSpin() {
        if (this.game.isSpinning) return;
        if (this.onSpinRequest) {
            // Let app.js validate coins
            if (!this.onSpinRequest(this.game.currentBet)) return;
        }
        this._startSpinAnimation();
        this.game.spin();
    }

    _startSpinAnimation() {
        const allSymbols = this.game.symbols;
        this._spinTimers.forEach(t => clearInterval(t));
        this._spinTimers = [];

        this._reelEls.forEach((el, i) => {
            el.classList.add('spinning');
            this._spinning[i] = true;
            const timer = setInterval(() => {
                if (!this._spinning[i]) { clearInterval(timer); return; }
                const sym = allSymbols[Math.floor(Math.random() * allSymbols.length)];
                el.querySelector('.slot-reel-symbol').textContent = sym.emoji;
            }, 80);
            this._spinTimers.push(timer);
        });

        this._resultEl.querySelector('.slot-result-text').textContent = '🎰 Spinning...';
        this._resultEl.className = 'slot-result spinning';

        const spinBtn = document.getElementById('slotSpinBtn');
        if (spinBtn) { spinBtn.disabled = true; spinBtn.classList.add('disabled'); }
    }

    _stopReel(idx, sym) {
        this._spinning[idx] = false;
        const el = this._reelEls[idx];
        if (el) {
            el.classList.remove('spinning');
            el.classList.add('stopping');
            el.querySelector('.slot-reel-symbol').textContent = sym.emoji;
            setTimeout(() => el.classList.remove('stopping'), 300);
        }
    }

    _showResult(result) {
        const spinBtn = document.getElementById('slotSpinBtn');
        if (spinBtn) { spinBtn.disabled = false; spinBtn.classList.remove('disabled'); }

        const textEl = this._resultEl.querySelector('.slot-result-text');

        if (result.isJackpot) {
            textEl.textContent = `🎰🎰🎰 MEGA JACKPOT! +${result.payout}Ⓒ 🎰🎰🎰`;
            this._resultEl.className = 'slot-result jackpot';
            this.overlay.querySelector('.slot-machine-container')?.classList.add('jackpot-flash');
            setTimeout(() => {
                this.overlay.querySelector('.slot-machine-container')?.classList.remove('jackpot-flash');
            }, 3000);
        } else if (result.win) {
            textEl.textContent = `${result.name} +${result.payout}Ⓒ`;
            this._resultEl.className = 'slot-result win';
            this._reelEls.forEach(el => {
                el.classList.add('win-glow');
                setTimeout(() => el.classList.remove('win-glow'), 1500);
            });
        } else {
            textEl.textContent = `😔 ${result.name} -${result.bet}Ⓒ`;
            this._resultEl.className = 'slot-result lose';
        }

        this._updateStats();
        this._updateHistory(result);

        if (this.onResultCallback) this.onResultCallback(result);
    }

    _updateStats() {
        const stats = this.game.getStats();
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('slotSpins', stats.totalSpins);
        el('slotWon', stats.totalWon + 'Ⓒ');
        el('slotLost', stats.totalLost + 'Ⓒ');
    }

    _updateHistory(result) {
        const el = document.getElementById('slotHistory');
        if (!el) return;
        const emojis = result.reels.map(r => r.emoji).join(' ');
        const cls = result.win ? 'slot-hist-win' : 'slot-hist-lose';
        const item = document.createElement('div');
        item.className = `slot-hist-item ${cls}`;
        item.textContent = `${emojis} ${result.win ? '+' + result.payout : '-' + result.bet}Ⓒ`;
        el.prepend(item);
        while (el.children.length > 8) el.removeChild(el.lastChild);
    }

    _buildPayoutTable() {
        const el = document.getElementById('slotPayoutTable');
        if (!el) return;
        const table = this.game.getPayoutTable();
        el.innerHTML = table.map(row => {
            const syms = row.symbols.map(s => s ? s.emoji : '?').join(' ');
            return `<div class="slot-payout-row">
                <span class="slot-payout-syms">${syms}</span>
                <span class="slot-payout-mul">×${row.multiplier}</span>
            </div>`;
        }).join('');
    }

    _renderPlayers() {
        const el = document.getElementById('slotPlayers');
        if (!el || !this.players.length) return;
        el.innerHTML = '<div class="slot-players-label">🎰 Đang chơi:</div>' +
            this.players.map(p =>
                `<span class="slot-player-tag" style="border-color:${p.color || '#4ecdc4'}">${p.name}</span>`
            ).join('');
    }
}

window.SlotMachineUI = SlotMachineUI;
