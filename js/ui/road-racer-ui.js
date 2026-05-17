/**
 * Road Racer UI - PixelAgent City
 * Overlay with canvas game, bet controls, score, stats, history.
 * Pattern matches FlappyHeliUI for seamless integration.
 */
class RoadRacerUI {
    constructor(overlayEl) {
        this.overlay = overlayEl;
        this.game = null;
        this.onClose = null;
        this.onPlayRequest = null;
        this.onResultCallback = null;
        this._canvas = null;
        this._balanceEl = null;
        this._gameLoop = null;
        this._keyHandler = null;
    }

    show() {
        this.overlay.innerHTML = '';
        this.overlay.classList.add('show');
        this._build();
    }

    hide() {
        this.overlay.classList.remove('show');
        if (this._gameLoop) { cancelAnimationFrame(this._gameLoop); this._gameLoop = null; }
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
        var betHtml = '';
        for (var j = 0; j < bets.length; j++) {
            betHtml += '<button class="rr-bet-btn' + (j === 0 ? ' active' : '') + '" data-bet="' + bets[j] + '">' + bets[j] + '\u24b8</button>';
        }

        var html = '<div class="rr-container">' +
            '<div class="rr-header">' +
                '<div class="rr-title"><span class="rr-title-icon">\ud83c\udfce\ufe0f</span><span class="rr-title-text">ROAD RACER</span><span class="rr-title-icon">\ud83d\udea7</span></div>' +
                '<button class="rr-close-btn" id="rrCloseBtn">\u2715</button>' +
            '</div>' +
            '<div class="rr-body">' +
                '<div class="rr-canvas-wrap"><canvas id="rrCanvas" width="300" height="400"></canvas></div>' +
                '<div class="rr-score-bar">' +
                    '<div class="rr-score-item"><span class="rr-score-label">\ud83d\udcaf Score</span><span class="rr-score-val" id="rrScore">0</span></div>' +
                    '<div class="rr-score-item"><span class="rr-score-label">\ud83c\udfc6 Best</span><span class="rr-score-val rr-best" id="rrBest">0</span></div>' +
                    '<div class="rr-score-item"><span class="rr-score-label">\ud83d\udcb0 Bet</span><span class="rr-score-val" id="rrBetDisplay">10\u24b8</span></div>' +
                '</div>' +
                '<div class="rr-controls" id="rrControls">' +
                    '<div class="rr-bet-section"><span class="rr-bet-label">\u0110\u1eb7t c\u01b0\u1ee3c:</span><div class="rr-bet-btns" id="rrBetBtns">' + betHtml + '</div></div>' +
                    '<div class="rr-action-btns"><button class="rr-play-btn" id="rrPlayBtn"><span>\ud83c\udfce\ufe0f</span> L\u00c1I TH\u00d4I!</button></div>' +
                '</div>' +
                '<div class="rr-payout-table">' +
                    '<div class="rr-payout-title">\ud83c\udfaf B\u1ea3ng th\u01b0\u1edfng:</div>' +
                    '<div class="rr-payout-grid">' +
                        '<div class="rr-payout-row"><span>80+ \u0111i\u1ec3m</span><span class="rr-mul">x8</span></div>' +
                        '<div class="rr-payout-row"><span>50+ \u0111i\u1ec3m</span><span class="rr-mul">x5</span></div>' +
                        '<div class="rr-payout-row"><span>30+ \u0111i\u1ec3m</span><span class="rr-mul">x3</span></div>' +
                        '<div class="rr-payout-row"><span>20+ \u0111i\u1ec3m</span><span class="rr-mul">x2</span></div>' +
                        '<div class="rr-payout-row"><span>10+ \u0111i\u1ec3m</span><span class="rr-mul">x1.2</span></div>' +
                        '<div class="rr-payout-row rr-lose"><span>&lt;10 \u0111i\u1ec3m</span><span>M\u1ea5t c\u01b0\u1ee3c</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="rr-footer">' +
                    '<div class="rr-balance"><span>\ud83d\udcb0 S\u1ed1 d\u01b0:</span> <span class="rr-balance-val" id="rrBalance">0\u24b8</span></div>' +
                    '<div class="rr-stats"><span class="rr-stat">\u0110ua: <b id="rrGamesPlayed">0</b></span><span class="rr-stat">Th\u1eafng: <b id="rrWon" class="rr-win-val">0\u24b8</b></span><span class="rr-stat">Thua: <b id="rrLost" class="rr-lose-val">0\u24b8</b></span></div>' +
                '</div>' +
                '<div class="rr-history" id="rrHistory"></div>' +
            '</div>' +
        '</div>';

        this.overlay.innerHTML = html;
        this._canvas = document.getElementById('rrCanvas');
        this._balanceEl = document.getElementById('rrBalance');
        this.game = new RoadRacer(this._canvas);

        var self = this;
        document.getElementById('rrCloseBtn').onclick = function() { self.hide(); };
        document.getElementById('rrPlayBtn').onclick = function() { self._startGame(); };

        // Touch controls on canvas
        var touchStartX = 0;
        this._canvas.ontouchstart = function(e) { e.preventDefault(); touchStartX = e.touches[0].clientX; };
        this._canvas.ontouchend = function(e) {
            e.preventDefault();
            var dx = e.changedTouches[0].clientX - touchStartX;
            if (self.game && self.game.phase === 'dead' && self.game.deathTimer > 60) {
                self._resetToIdle(); return;
            }
            if (self.game && self.game.phase === 'idle') { self._startGame(); return; }
            if (Math.abs(dx) > 15) { if (dx < 0) self.game.moveLeft(); else self.game.moveRight(); }
        };

        // Canvas click
        this._canvas.onclick = function(e) {
            if (self.game && self.game.phase === 'dead' && self.game.deathTimer > 60) { self._resetToIdle(); return; }
            if (self.game && self.game.phase === 'idle') { self._startGame(); return; }
            var rect = self._canvas.getBoundingClientRect();
            var cx = e.clientX - rect.left;
            if (cx < rect.width / 2) self.game.moveLeft(); else self.game.moveRight();
        };

        // Keyboard
        this._keyHandler = function(e) {
            if (!self.game) return;
            if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); self.game.moveLeft(); }
            if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); self.game.moveRight(); }
            if (e.code === 'Space') {
                e.preventDefault();
                if (self.game.phase === 'idle') self._startGame();
                else if (self.game.phase === 'dead' && self.game.deathTimer > 60) self._resetToIdle();
            }
        };
        document.addEventListener('keydown', this._keyHandler);

        // Bet buttons
        var betBtns = document.querySelectorAll('.rr-bet-btn');
        for (var bi = 0; bi < betBtns.length; bi++) {
            (function(btn) {
                btn.onclick = function() {
                    if (self.game && self.game.phase === 'playing') return;
                    var all = document.querySelectorAll('.rr-bet-btn');
                    for (var x = 0; x < all.length; x++) all[x].classList.remove('active');
                    btn.classList.add('active');
                    var bet = parseInt(btn.getAttribute('data-bet'));
                    if (self.game) self.game.setBet(bet);
                    var bd = document.getElementById('rrBetDisplay');
                    if (bd) bd.textContent = bet + '\u24b8';
                };
            })(betBtns[bi]);
        }

        this.game.onScoreChange = function(score) {
            var el = document.getElementById('rrScore'); if (el) el.textContent = score;
        };
        this.game.onGameOver = function(result) { self._onGameOver(result); };

        var bestEl = document.getElementById('rrBest');
        if (bestEl) bestEl.textContent = this.game.highScore;

        this._startRenderLoop();
        this._updateStats();
    }

    _resetToIdle() {
        if (!this.game) return;
        this.game.phase = 'idle';
        this.game.car.lane = 1;
        this.game.car.x = this.game.lanes[1] - this.game.car.w / 2;
        this.game.car.targetX = this.game.car.x;
        this.game.obstacles = [];
        this.game.roadCoins = [];
        this.game.particles = [];
        var c = document.getElementById('rrControls');
        if (c) c.style.display = '';
    }

    _startGame() {
        if (!this.game || this.game.phase === 'playing') return;
        if (this.onPlayRequest) { if (!this.onPlayRequest(this.game.currentBet)) return; }
        this.game.start();
        var c = document.getElementById('rrControls');
        if (c) c.style.display = 'none';
        var s = document.getElementById('rrScore');
        if (s) s.textContent = '0';
    }

    _startRenderLoop() {
        var self = this;
        function loop() {
            if (!self.game || !self._canvas) return;
            self.game.tick();
            self.game.render();
            self._gameLoop = requestAnimationFrame(loop);
        }
        this._gameLoop = requestAnimationFrame(loop);
    }

    _onGameOver(result) {
        var self = this;
        setTimeout(function() {
            var c = document.getElementById('rrControls');
            if (c) c.style.display = '';
        }, 2000);
        var bestEl = document.getElementById('rrBest');
        if (bestEl) bestEl.textContent = result.highScore;
        this._updateStats();
        this._addHistory(result);
        if (this.onResultCallback) this.onResultCallback(result);
    }

    _updateStats() {
        if (!this.game) return;
        var s = this.game.getStats();
        var set = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
        set('rrGamesPlayed', s.totalGames);
        set('rrWon', s.totalWon + '\u24b8');
        set('rrLost', s.totalLost + '\u24b8');
    }

    _addHistory(result) {
        var el = document.getElementById('rrHistory');
        if (!el) return;
        var cls = result.win ? 'rr-hist-win' : 'rr-hist-lose';
        var item = document.createElement('div');
        item.className = 'rr-hist-item ' + cls;
        item.textContent = '\ud83c\udfce\ufe0f ' + result.score + 'pts ' + (result.win ? '+' + result.payout : '-' + result.bet) + '\u24b8';
        el.insertBefore(item, el.firstChild);
        while (el.children.length > 8) el.removeChild(el.lastChild);
    }

    destroy() {
        if (this._gameLoop) { cancelAnimationFrame(this._gameLoop); this._gameLoop = null; }
        if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
        if (this.game) { this.game.destroy(); this.game = null; }
    }
}

window.RoadRacerUI = RoadRacerUI;
