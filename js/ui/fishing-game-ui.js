/**
 * Fishing & Life UI — PixelAgent City
 * Overlay with canvas, bet controls, catch log, inventory.
 * Pattern matches RoadRacerUI.
 */
class FishingGameUI {
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
        if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
        if (this.game) this.game.destroy();
        var self = this;
        setTimeout(function () { self.overlay.innerHTML = ''; }, 300);
        if (this.onClose) this.onClose();
    }

    setBalance(coins) {
        if (this._balanceEl) this._balanceEl.textContent = coins + '\u24b8';
    }

    _build() {
        var bets = [10, 25, 50, 100];
        var betHtml = '';
        for (var j = 0; j < bets.length; j++) {
            betHtml += '<button class="fg-bet-btn' + (j === 0 ? ' active' : '') + '" data-bet="' + bets[j] + '">' + bets[j] + '\u24b8</button>';
        }

        var html = '<div class="fg-container">' +
            '<div class="fg-header">' +
                '<div class="fg-title"><span class="fg-title-icon">\ud83c\udfa3</span><span class="fg-title-text">FISHING & LIFE</span><span class="fg-title-icon">\ud83d\udc1f</span></div>' +
                '<button class="fg-close-btn" id="fgCloseBtn">\u2715</button>' +
            '</div>' +
            '<div class="fg-body">' +
                '<div class="fg-canvas-wrap"><canvas id="fgCanvas" width="300" height="400"></canvas></div>' +
                '<div class="fg-score-bar">' +
                    '<div class="fg-score-item"><span class="fg-score-label">\ud83d\udc1f C\u00e1</span><span class="fg-score-val" id="fgCaught">0</span></div>' +
                    '<div class="fg-score-item"><span class="fg-score-label">\ud83c\udfc6 Best</span><span class="fg-score-val fg-best" id="fgBest">-</span></div>' +
                    '<div class="fg-score-item"><span class="fg-score-label">\ud83d\udcb0 Bet</span><span class="fg-score-val" id="fgBetDisplay">10\u24b8</span></div>' +
                '</div>' +
                '<div class="fg-controls" id="fgControls">' +
                    '<div class="fg-bet-section"><span class="fg-bet-label">\u0110\u1eb7t c\u01b0\u1ee3c:</span><div class="fg-bet-btns" id="fgBetBtns">' + betHtml + '</div></div>' +
                    '<div class="fg-action-btns"><button class="fg-play-btn" id="fgPlayBtn"><span>\ud83c\udfa3</span> TH\u1ea2 C\u1ea6N!</button></div>' +
                '</div>' +
                '<div class="fg-payout-table">' +
                    '<div class="fg-payout-title">\ud83d\udc1f B\u1ea3ng c\u00e1:</div>' +
                    '<div class="fg-payout-grid">' +
                        '<div class="fg-payout-row"><span>\ud83d\udc09 C\u00e1 R\u1ed3ng</span><span class="fg-mul">x20</span></div>' +
                        '<div class="fg-payout-row"><span>\ud83d\udc22 R\u00f9a V\u00e0ng</span><span class="fg-mul">x10</span></div>' +
                        '<div class="fg-payout-row"><span>\u2728 C\u00e1 V\u00e0ng</span><span class="fg-mul">x6</span></div>' +
                        '<div class="fg-payout-row"><span>\ud83c\udfcf C\u00e1 Koi</span><span class="fg-mul">x4</span></div>' +
                        '<div class="fg-payout-row"><span>\ud83d\udc20 C\u00e1 Ch\u00e9p</span><span class="fg-mul">x1.8</span></div>' +
                        '<div class="fg-payout-row fg-common"><span>\ud83d\udc1f C\u00e1 R\u00f4</span><span class="fg-mul">x1.2</span></div>' +
                    '</div>' +
                '</div>' +
                '<div class="fg-footer">' +
                    '<div class="fg-balance"><span>\ud83d\udcb0 S\u1ed1 d\u01b0:</span> <span class="fg-balance-val" id="fgBalance">0\u24b8</span></div>' +
                    '<div class="fg-stats"><span class="fg-stat">C\u00e2u: <b id="fgGamesPlayed">0</b></span><span class="fg-stat">Th\u1eafng: <b id="fgWon" class="fg-win-val">0\u24b8</b></span><span class="fg-stat">Thua: <b id="fgLost" class="fg-lose-val">0\u24b8</b></span></div>' +
                '</div>' +
                '<div class="fg-history" id="fgHistory"></div>' +
            '</div>' +
        '</div>';

        this.overlay.innerHTML = html;
        this._canvas = document.getElementById('fgCanvas');
        this._balanceEl = document.getElementById('fgBalance');
        this.game = new FishingGame(this._canvas);

        var self = this;
        document.getElementById('fgCloseBtn').onclick = function () { self.hide(); };
        document.getElementById('fgPlayBtn').onclick = function () { self._startGame(); };

        // Canvas interactions
        var mouseDown = false;
        this._canvas.onmousedown = function (e) {
            e.preventDefault();
            if (self.game.phase === 'casting') return; // handle release
            if (self.game.phase === 'idle') { self._startGame(); return; }
            if (self.game.phase === 'hooked') { self.game.startReel(); return; }
            if ((self.game.phase === 'caught' || self.game.phase === 'lost')) { self._resetToIdle(); return; }
        };

        this._canvas.onmousedown = function (e) {
            e.preventDefault();
            mouseDown = true;
            if (self.game.phase === 'idle') { self._startGame(); return; }
            if (self.game.phase === 'hooked') { self.game.startReel(); return; }
            if (self.game.phase === 'caught' || self.game.phase === 'lost') { self._resetToIdle(); return; }
        };
        this._canvas.onmouseup = function (e) {
            e.preventDefault();
            mouseDown = false;
            if (self.game.phase === 'casting') { self.game.castLine(); }
        };
        this._canvas.onmousemove = function (e) {
            if (self.game.phase === 'reeling') {
                var rect = self._canvas.getBoundingClientRect();
                var cx = e.clientX - rect.left;
                var pct = (cx / rect.width) * 100;
                self.game.reelBar.pos = Math.max(0, Math.min(100, pct));
            }
        };

        // Touch support
        this._canvas.ontouchstart = function (e) {
            e.preventDefault();
            mouseDown = true;
            if (self.game.phase === 'idle') { self._startGame(); return; }
            if (self.game.phase === 'hooked') { self.game.startReel(); return; }
            if (self.game.phase === 'caught' || self.game.phase === 'lost') { self._resetToIdle(); return; }
        };
        this._canvas.ontouchend = function (e) {
            e.preventDefault();
            mouseDown = false;
            if (self.game.phase === 'casting') { self.game.castLine(); }
        };
        this._canvas.ontouchmove = function (e) {
            if (self.game.phase === 'reeling') {
                var rect = self._canvas.getBoundingClientRect();
                var cx = e.touches[0].clientX - rect.left;
                var pct = (cx / rect.width) * 100;
                self.game.reelBar.pos = Math.max(0, Math.min(100, pct));
            }
        };

        // Keyboard
        this._keyHandler = function (e) {
            if (!self.game) return;
            if (e.code === 'Space') {
                e.preventDefault();
                if (self.game.phase === 'idle') { self._startGame(); return; }
                if (self.game.phase === 'casting') { self.game.castLine(); return; }
                if (self.game.phase === 'hooked') { self.game.startReel(); return; }
                if (self.game.phase === 'caught' || self.game.phase === 'lost') { self._resetToIdle(); return; }
            }
            if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); self.game.reelMove(-1); }
            if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); self.game.reelMove(1); }
            if (e.key === 'Escape') { self.hide(); }
        };
        document.addEventListener('keydown', this._keyHandler);

        // Bet buttons
        var betBtns = document.querySelectorAll('.fg-bet-btn');
        for (var bi = 0; bi < betBtns.length; bi++) {
            (function (btn) {
                btn.onclick = function () {
                    if (self.game && self.game.running) return;
                    var all = document.querySelectorAll('.fg-bet-btn');
                    for (var x = 0; x < all.length; x++) all[x].classList.remove('active');
                    btn.classList.add('active');
                    var bet = parseInt(btn.getAttribute('data-bet'));
                    if (self.game) self.game.setBet(bet);
                    var bd = document.getElementById('fgBetDisplay');
                    if (bd) bd.textContent = bet + '\u24b8';
                };
            })(betBtns[bi]);
        }

        this.game.onGameOver = function (result) { self._onGameOver(result); };

        this._startRenderLoop();
        this._updateStats();
    }

    _resetToIdle() {
        if (!this.game) return;
        this.game.phase = 'idle';
        this.game.hookedFish = null;
        this.game.catchResult = null;
        this.game.rod.castPower = 0;
        this.game.bobber = { x: 0, y: 0, sinkDepth: 0 };
        var c = document.getElementById('fgControls');
        if (c) c.style.display = '';
    }

    _startGame() {
        if (!this.game || this.game.running) return;
        if (this.onPlayRequest) { if (!this.onPlayRequest(this.game.currentBet)) return; }
        this.game.start();
        var c = document.getElementById('fgControls');
        if (c) c.style.display = 'none';
    }

    _doStart() {
        this._startGame();
        // Auto-cast after 1.5s
        var self = this;
        setTimeout(function () {
            if (self.game && self.game.phase === 'casting') {
                self.game.rod.castPower = 40 + Math.random() * 40;
                self.game.castLine();
            }
        }, 1500);
    }

    _startRenderLoop() {
        var self = this;
        function loop() {
            if (!self.game || !self._canvas) return;
            self.game.update();
            self.game.render();
            // Update caught counter
            var el = document.getElementById('fgCaught');
            if (el) el.textContent = self.game.totalCaught;
            self._gameLoop = requestAnimationFrame(loop);
        }
        this._gameLoop = requestAnimationFrame(loop);
    }

    _onGameOver(result) {
        var self = this;
        setTimeout(function () {
            var c = document.getElementById('fgControls');
            if (c) c.style.display = '';
        }, 2000);
        // Update best
        var bestEl = document.getElementById('fgBest');
        if (bestEl && self.game.bestCatch) {
            bestEl.textContent = self.game.bestCatch.name;
        }
        this._updateStats();
        this._addHistory(result);
        if (this.onResultCallback) this.onResultCallback(result);
    }

    _updateStats() {
        if (!this.game) return;
        var s = this.game.getStats();
        var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
        set('fgGamesPlayed', s.totalGames);
        set('fgWon', s.totalWon + '\u24b8');
        set('fgLost', s.totalLost + '\u24b8');
    }

    _addHistory(result) {
        var el = document.getElementById('fgHistory');
        if (!el) return;
        var cls = result.win ? 'fg-hist-win' : 'fg-hist-lose';
        var item = document.createElement('div');
        item.className = 'fg-hist-item ' + cls;
        if (result.win && result.fish) {
            item.textContent = result.fish.emoji + ' ' + result.fish.name + ' ' + result.fish.weight + 'kg +' + result.payout + '\u24b8';
        } else {
            item.textContent = '\ud83d\udca8 Tho\u00e1t! -' + result.bet + '\u24b8';
        }
        el.insertBefore(item, el.firstChild);
        while (el.children.length > 8) el.removeChild(el.lastChild);
    }

    destroy() {
        if (this._gameLoop) { cancelAnimationFrame(this._gameLoop); this._gameLoop = null; }
        if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
        if (this.game) { this.game.destroy(); this.game = null; }
    }
}

window.FishingGameUI = FishingGameUI;
