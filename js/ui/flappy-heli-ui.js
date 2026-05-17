/**
 * Flappy Helicopter UI - PixelAgent City
 * Overlay with canvas game, bet controls, score, stats, history.
 * Pattern matches CafeGameUI / SlotMachineUI for seamless integration.
 */
class FlappyHeliUI {
    constructor(overlayEl) {
        this.overlay = overlayEl;
        this.game = null;
        this.players = [];
        this.onClose = null;
        this.onPlayRequest = null;   // (betAmount) => bool
        this.onResultCallback = null;

        this._canvas = null;
        this._balanceEl = null;
        this._animFrame = null;
        this._gameLoop = null;
    }

    show() {
        this.overlay.innerHTML = '';
        this.overlay.classList.add('show');
        this._build();
    }

    hide() {
        this.overlay.classList.remove('show');
        if (this._gameLoop) {
            cancelAnimationFrame(this._gameLoop);
            this._gameLoop = null;
        }
        if (this.game) this.game.destroy();
        var self = this;
        setTimeout(function() { self.overlay.innerHTML = ''; }, 300);
        if (this.onClose) this.onClose();
    }

    setBalance(coins) {
        if (this._balanceEl) this._balanceEl.textContent = coins + '\u24b8';
    }

    _build() {
        var bets = [10, 25, 50, 100];
        var betBtnsHtml = '';
        for (var j = 0; j < bets.length; j++) {
            betBtnsHtml += '<button class="fh-bet-btn' + (j === 0 ? ' active' : '') + '" data-bet="' + bets[j] + '">' + bets[j] + '\u24b8</button>';
        }

        var html = '<div class="fh-container">' +
            '<div class="fh-header">' +
                '<div class="fh-title">' +
                    '<span class="fh-title-icon">\ud83d\ude81</span>' +
                    '<span class="fh-title-text">FLAPPY HELI</span>' +
                    '<span class="fh-title-icon">\ud83c\udfd9\ufe0f</span>' +
                '</div>' +
                '<button class="fh-close-btn" id="fhCloseBtn">\u2715</button>' +
            '</div>' +

            '<div class="fh-body">' +
                '<div class="fh-canvas-wrap" id="fhCanvasWrap">' +
                    '<canvas id="fhCanvas" width="400" height="280"></canvas>' +
                    '<div class="fh-canvas-overlay" id="fhCanvasOverlay"></div>' +
                '</div>' +

                '<div class="fh-score-bar">' +
                    '<div class="fh-score-item"><span class="fh-score-label">\ud83d\udcaf Score</span><span class="fh-score-val" id="fhScore">0</span></div>' +
                    '<div class="fh-score-item"><span class="fh-score-label">\ud83c\udfc6 Best</span><span class="fh-score-val fh-best" id="fhBest">0</span></div>' +
                    '<div class="fh-score-item"><span class="fh-score-label">\ud83d\udcb0 Bet</span><span class="fh-score-val" id="fhBetDisplay">10\u24b8</span></div>' +
                '</div>' +

                '<div class="fh-controls" id="fhControls">' +
                    '<div class="fh-bet-section">' +
                        '<span class="fh-bet-label">\u0110\u1eb7t c\u01b0\u1ee3c:</span>' +
                        '<div class="fh-bet-btns" id="fhBetBtns">' + betBtnsHtml + '</div>' +
                    '</div>' +
                    '<div class="fh-action-btns">' +
                        '<button class="fh-play-btn" id="fhPlayBtn">' +
                            '<span>\ud83d\ude81</span> BAY TH\u00d4I!' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                '<div class="fh-payout-table">' +
                    '<div class="fh-payout-title">\ud83c\udfaf B\u1ea3ng th\u01b0\u1edfng:</div>' +
                    '<div class="fh-payout-grid">' +
                        '<div class="fh-payout-row"><span>30+ \u0111i\u1ec3m</span><span class="fh-mul">x8</span></div>' +
                        '<div class="fh-payout-row"><span>20+ \u0111i\u1ec3m</span><span class="fh-mul">x5</span></div>' +
                        '<div class="fh-payout-row"><span>15+ \u0111i\u1ec3m</span><span class="fh-mul">x3</span></div>' +
                        '<div class="fh-payout-row"><span>10+ \u0111i\u1ec3m</span><span class="fh-mul">x2</span></div>' +
                        '<div class="fh-payout-row"><span>5+ \u0111i\u1ec3m</span><span class="fh-mul">x1.2</span></div>' +
                        '<div class="fh-payout-row fh-lose"><span>&lt;5 \u0111i\u1ec3m</span><span>M\u1ea5t c\u01b0\u1ee3c</span></div>' +
                    '</div>' +
                '</div>' +

                '<div class="fh-footer">' +
                    '<div class="fh-balance">' +
                        '<span>\ud83d\udcb0 S\u1ed1 d\u01b0:</span> ' +
                        '<span class="fh-balance-val" id="fhBalance">0\u24b8</span>' +
                    '</div>' +
                    '<div class="fh-stats">' +
                        '<span class="fh-stat">Bay: <b id="fhGamesPlayed">0</b></span>' +
                        '<span class="fh-stat">Th\u1eafng: <b id="fhWon" class="fh-win-val">0\u24b8</b></span>' +
                        '<span class="fh-stat">Thua: <b id="fhLost" class="fh-lose-val">0\u24b8</b></span>' +
                    '</div>' +
                '</div>' +

                '<div class="fh-history" id="fhHistory"></div>' +
            '</div>' +
        '</div>';

        this.overlay.innerHTML = html;

        // Cache elements
        this._canvas = document.getElementById('fhCanvas');
        this._balanceEl = document.getElementById('fhBalance');

        // Create game instance
        this.game = new FlappyHeli(this._canvas);

        // Wire events
        var self = this;
        document.getElementById('fhCloseBtn').onclick = function() { self.hide(); };
        document.getElementById('fhPlayBtn').onclick = function() { self._startGame(); };

        // Canvas click/touch = flap
        this._canvas.onclick = function() { self._handleFlap(); };
        this._canvas.ontouchstart = function(e) {
            e.preventDefault();
            self._handleFlap();
        };

        // Keyboard
        this._keyHandler = function(e) {
            if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault();
                self._handleFlap();
            }
        };
        document.addEventListener('keydown', this._keyHandler);

        // Bet buttons
        var betBtns = document.querySelectorAll('.fh-bet-btn');
        for (var bi = 0; bi < betBtns.length; bi++) {
            (function(btn) {
                btn.onclick = function() {
                    if (self.game && self.game.phase === 'playing') return;
                    var allBets = document.querySelectorAll('.fh-bet-btn');
                    for (var x = 0; x < allBets.length; x++) allBets[x].classList.remove('active');
                    btn.classList.add('active');
                    var bet = parseInt(btn.getAttribute('data-bet'));
                    if (self.game) self.game.setBet(bet);
                    var betDisp = document.getElementById('fhBetDisplay');
                    if (betDisp) betDisp.textContent = bet + '\u24b8';
                };
            })(betBtns[bi]);
        }

        // Game callbacks
        this.game.onScoreChange = function(score) {
            var el = document.getElementById('fhScore');
            if (el) el.textContent = score;
        };
        this.game.onGameOver = function(result) {
            self._onGameOver(result);
        };

        // Update best score display
        var bestEl = document.getElementById('fhBest');
        if (bestEl) bestEl.textContent = this.game.highScore;

        // Start render loop
        this._startRenderLoop();
        this._updateStats();
    }

    _handleFlap() {
        if (!this.game) return;
        if (this.game.phase === 'idle') {
            this._startGame();
            return;
        }
        if (this.game.phase === 'dead' && this.game.deathTimer > 60) {
            // Reset to idle for next round
            this.game.phase = 'idle';
            this.game.heli.y = this.game.H / 2;
            this.game.heli.vy = 0;
            this.game.heli.rotation = 0;
            this.game.pipes = [];
            this.game.particles = [];
            // Re-enable controls
            var controls = document.getElementById('fhControls');
            if (controls) controls.style.display = '';
            return;
        }
        this.game.flap();
    }

    _startGame() {
        if (!this.game || this.game.phase === 'playing') return;

        // Validate funds
        if (this.onPlayRequest) {
            if (!this.onPlayRequest(this.game.currentBet)) return;
        }

        this.game.start();

        // Hide controls while playing
        var controls = document.getElementById('fhControls');
        if (controls) controls.style.display = 'none';

        // Update score display
        var scoreEl = document.getElementById('fhScore');
        if (scoreEl) scoreEl.textContent = '0';
    }

    _startRenderLoop() {
        var self = this;
        var lastTime = performance.now();

        function loop(now) {
            if (!self.game || !self._canvas) return;

            var dt = (now - lastTime) / 1000;
            lastTime = now;

            // Tick game logic (~60fps physics)
            self.game.tick(dt);
            self.game.render();

            self._gameLoop = requestAnimationFrame(loop);
        }
        this._gameLoop = requestAnimationFrame(loop);
    }

    _onGameOver(result) {
        // Show controls again
        setTimeout(function() {
            var controls = document.getElementById('fhControls');
            if (controls) controls.style.display = '';
        }, 2000);

        // Update best
        var bestEl = document.getElementById('fhBest');
        if (bestEl) bestEl.textContent = result.highScore;

        // Update stats & history
        this._updateStats();
        this._addHistory(result);

        // External callback
        if (this.onResultCallback) this.onResultCallback(result);
    }

    _updateStats() {
        if (!this.game) return;
        var stats = this.game.getStats();
        var setEl = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        setEl('fhGamesPlayed', stats.totalGames);
        setEl('fhWon', stats.totalWon + '\u24b8');
        setEl('fhLost', stats.totalLost + '\u24b8');
    }

    _addHistory(result) {
        var el = document.getElementById('fhHistory');
        if (!el) return;
        var cls = result.win ? 'fh-hist-win' : 'fh-hist-lose';
        var item = document.createElement('div');
        item.className = 'fh-hist-item ' + cls;
        item.textContent = '\ud83d\ude81 ' + result.score + 'pts ' + (result.win ? '+' + result.payout : '-' + result.bet) + '\u24b8';
        el.insertBefore(item, el.firstChild);
        while (el.children.length > 8) el.removeChild(el.lastChild);
    }

    destroy() {
        if (this._gameLoop) {
            cancelAnimationFrame(this._gameLoop);
            this._gameLoop = null;
        }
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        if (this.game) {
            this.game.destroy();
            this.game = null;
        }
    }
}

window.FlappyHeliUI = FlappyHeliUI;
