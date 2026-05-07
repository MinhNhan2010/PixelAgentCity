/**
 * Fighter Game UI - PixelAgent City
 * "Pixel Fighter" overlay with character select, fight arena, results
 */
class FighterGameUI {
    constructor(overlayEl) {
        this.overlay = overlayEl;
        this.game = null;
        this.onClose = null;
        this.onPlayRequest = null;
        this.onResultCallback = null;
        this._canvasEl = null;
        this.betAmount = 25;
        this.betOptions = [10, 25, 50, 100];
    }

    show() {
        this.overlay.innerHTML = '';
        this.overlay.classList.add('show');
        this._buildSelect();
    }

    hide() {
        this.overlay.classList.remove('show');
        if (this.game) { this.game.destroy(); this.game = null; }
        var self = this;
        setTimeout(function() { self.overlay.innerHTML = ''; }, 300);
        if (this.onClose) this.onClose();
    }

    _buildSelect() {
        var roster = [
            { id: 'pixel_ryu', name: 'PixelRyu', color: '#e74c3c', emoji: '\ud83e\udd4a', desc: 'C\u00e2n b\u1eb1ng, Hadouken m\u1ea1nh' },
            { id: 'cyber_ken', name: 'CyberKen', color: '#3498db', emoji: '\u26a1', desc: 'T\u1ed1c \u0111\u1ed9, Shoryuken ch\u00ed m\u1ea1ng' },
            { id: 'nano_chun', name: 'NanoChun', color: '#9b59b6', emoji: '\ud83d\udc62', desc: 'Nhanh nh\u1eb9n, combo d\u00e0i' },
            { id: 'robo_zang', name: 'RoboZang', color: '#27ae60', emoji: '\ud83e\uddbf', desc: 'Tank, s\u00e1t th\u01b0\u01a1ng cao' },
            { id: 'ghost_vega', name: 'GhostVega', color: '#f39c12', emoji: '\ud83d\udc7b', desc: 'Né gi\u1ecfi, \u0111\u00e1nh l\u00e9n' },
            { id: 'iron_sagat', name: 'IronSagat', color: '#e67e22', emoji: '\ud83d\udc2f', desc: 'HP cao, Tiger Shot' }
        ];

        var rosterHtml = '';
        for (var i = 0; i < roster.length; i++) {
            var r = roster[i];
            rosterHtml += '<button class="fighter-char-btn" data-fighter="' + r.id + '" style="--fc:' + r.color + '">' +
                '<span class="fighter-char-emoji">' + r.emoji + '</span>' +
                '<span class="fighter-char-name">' + r.name + '</span>' +
                '<span class="fighter-char-desc">' + r.desc + '</span>' +
            '</button>';
        }

        var betHtml = '';
        for (var j = 0; j < this.betOptions.length; j++) {
            var b = this.betOptions[j];
            betHtml += '<button class="fighter-bet-btn' + (b === this.betAmount ? ' active' : '') + '" data-bet="' + b + '">' + b + '\u24b8</button>';
        }

        var html = '<div class="fighter-game-container">' +
            '<div class="fighter-header">' +
                '<div class="fighter-title">' +
                    '<span class="fighter-neon">\ud83c\udfae</span>' +
                    '<span>PIXEL FIGHTER</span>' +
                    '<span class="fighter-neon">\ud83c\udfae</span>' +
                '</div>' +
                '<button class="fighter-close-btn" id="fighterCloseBtn">\u2715</button>' +
            '</div>' +
            '<div class="fighter-select-body">' +
                '<div class="fighter-select-title">CH\u1eccN V\u00d5 S\u0128</div>' +
                '<div class="fighter-roster">' + rosterHtml + '</div>' +
                '<div class="fighter-bet-section">' +
                    '<span>\u0110\u1eb7t c\u01b0\u1ee3c:</span>' +
                    '<div class="fighter-bet-btns">' + betHtml + '</div>' +
                '</div>' +
                '<div class="fighter-controls-hint">' +
                    '<div><kbd>A/D</kbd> Di chuy\u1ec3n &nbsp; <kbd>W</kbd> Nh\u1ea3y &nbsp; <kbd>Shift</kbd> Ch\u1eafn</div>' +
                    '<div><kbd>J</kbd> \u0110\u1ea5m &nbsp; <kbd>K</kbd> \u0110\u00e1 &nbsp; <kbd>L</kbd> Chi\u00eau \u0111\u1eb7c bi\u1ec7t</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        this.overlay.innerHTML = html;
        var self = this;

        document.getElementById('fighterCloseBtn').onclick = function() { self.hide(); };

        // Character select
        var charBtns = document.querySelectorAll('.fighter-char-btn');
        for (var ci = 0; ci < charBtns.length; ci++) {
            (function(btn) {
                btn.onclick = function() {
                    // Validate funds
                    if (self.onPlayRequest && !self.onPlayRequest(self.betAmount)) return;
                    self._startFight(btn.getAttribute('data-fighter'));
                };
            })(charBtns[ci]);
        }

        // Bet buttons
        var betBtns = document.querySelectorAll('.fighter-bet-btn');
        for (var bi = 0; bi < betBtns.length; bi++) {
            (function(btn) {
                btn.onclick = function() {
                    var all = document.querySelectorAll('.fighter-bet-btn');
                    for (var x = 0; x < all.length; x++) all[x].classList.remove('active');
                    btn.classList.add('active');
                    self.betAmount = parseInt(btn.getAttribute('data-bet'));
                };
            })(betBtns[bi]);
        }
    }

    _startFight(fighterId) {
        var self = this;
        this.overlay.innerHTML = '<div class="fighter-game-container fighter-arena">' +
            '<div class="fighter-arena-header">' +
                '<button class="fighter-close-btn" id="fighterCloseBtn2">\u2715</button>' +
            '</div>' +
            '<canvas id="fighterCanvas" class="fighter-canvas"></canvas>' +
            '<div class="fighter-touch-controls" id="fighterTouchControls">' +
                '<div class="fighter-touch-left">' +
                    '<button class="ft-btn ft-left" id="ftLeft">\u25c0</button>' +
                    '<button class="ft-btn ft-right" id="ftRight">\u25b6</button>' +
                    '<button class="ft-btn ft-up" id="ftUp">\u25b2</button>' +
                    '<button class="ft-btn ft-block" id="ftBlock">\ud83d\udee1</button>' +
                '</div>' +
                '<div class="fighter-touch-right">' +
                    '<button class="ft-btn ft-punch" id="ftPunch">\ud83e\udd4a</button>' +
                    '<button class="ft-btn ft-kick" id="ftKick">\ud83e\udd3c</button>' +
                    '<button class="ft-btn ft-special" id="ftSpecial">\u26a1</button>' +
                '</div>' +
            '</div>' +
            '<div class="fighter-result" id="fighterResult" style="display:none"></div>' +
        '</div>';

        document.getElementById('fighterCloseBtn2').onclick = function() { self.hide(); };

        var canvas = document.getElementById('fighterCanvas');
        this.game = new FighterGame(canvas);
        this.game.betAmount = this.betAmount;
        this.game.selectFighter(fighterId);

        // Touch controls for mobile
        this._bindTouchControls();

        // Hit feedback
        this.game.onHit = function(attacker, defender, dmg, type, combo) {
            self._showHitFx(defender, dmg, combo);
        };

        // Game end
        this.game.onGameEnd = function(result) {
            self._showResult(result);
        };

        // VS screen then start
        this._showVS(function() {
            self.game.startFight();
        });
    }

    _showVS(cb) {
        var ctx = this.game.ctx;
        var W = this.game.W, H = this.game.H;
        ctx.fillStyle = '#0a0a2e';
        ctx.fillRect(0, 0, W, H);
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = this.game.player.color;
        ctx.textAlign = 'right';
        ctx.fillText(this.game.player.name, W/2 - 20, H/2);
        ctx.fillStyle = '#ffd93d';
        ctx.textAlign = 'center';
        ctx.fillText('VS', W/2, H/2);
        ctx.fillStyle = this.game.enemy.color;
        ctx.textAlign = 'left';
        ctx.fillText(this.game.enemy.name, W/2 + 20, H/2);
        ctx.textAlign = 'left';
        ctx.font = '12px monospace';
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('ROUND 1 - FIGHT!', W/2, H/2 + 30);
        ctx.textAlign = 'left';
        setTimeout(cb, 1500);
    }

    _showHitFx(defender, dmg, combo) {
        // Flash canvas briefly
        var canvas = document.getElementById('fighterCanvas');
        if (canvas) {
            canvas.classList.add('fighter-hit-flash');
            setTimeout(function() { canvas.classList.remove('fighter-hit-flash'); }, 100);
        }
    }

    _showResult(result) {
        var el = document.getElementById('fighterResult');
        if (!el) return;
        el.style.display = '';

        var title = result.win
            ? (result.perfect ? '\u2b50 PERFECT VICTORY! \u2b50' : '\ud83c\udfc6 YOU WIN!')
            : '\ud83d\udca5 YOU LOSE!';
        var payoutText = result.win
            ? '<div class="fighter-result-payout fighter-win">+' + result.payout + '\u24b8</div>'
            : '<div class="fighter-result-payout fighter-lose">-' + result.bet + '\u24b8</div>';

        el.innerHTML = '<div class="fighter-result-box">' +
            '<div class="fighter-result-title" style="color:' + (result.win ? '#ffd93d' : '#ff4757') + '">' + title + '</div>' +
            '<div class="fighter-result-score">' + result.playerName + ' ' + result.playerWins + ' - ' + result.enemyWins + ' ' + result.enemyName + '</div>' +
            payoutText +
            '<button class="fighter-play-again" id="fighterPlayAgain">Ch\u01a1i l\u1ea1i</button>' +
            '<button class="fighter-back-select" id="fighterBackSelect">Ch\u1ecdn l\u1ea1i</button>' +
        '</div>';

        var self = this;
        document.getElementById('fighterPlayAgain').onclick = function() {
            if (self.game) self.game.destroy();
            if (self.onPlayRequest && !self.onPlayRequest(self.betAmount)) return;
            self._startFight(self.game.player.id);
        };
        document.getElementById('fighterBackSelect').onclick = function() {
            if (self.game) { self.game.destroy(); self.game = null; }
            self._buildSelect();
        };

        if (this.onResultCallback) this.onResultCallback(result);
    }

    _bindTouchControls() {
        var game = this.game;
        if (!game) return;
        var bind = function(id, keyDown, keyUp) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', function(e) { e.preventDefault(); game.keys[keyDown] = true; }, {passive:false});
            el.addEventListener('touchend', function(e) { e.preventDefault(); game.keys[keyDown] = false; if(keyUp) keyUp(); }, {passive:false});
            el.addEventListener('mousedown', function() { game.keys[keyDown] = true; });
            el.addEventListener('mouseup', function() { game.keys[keyDown] = false; if(keyUp) keyUp(); });
        };
        bind('ftLeft', 'a');
        bind('ftRight', 'd');
        bind('ftUp', 'w');
        bind('ftBlock', 'shift');
        // Attack buttons trigger key then release
        var punchEl = document.getElementById('ftPunch');
        var kickEl = document.getElementById('ftKick');
        var specialEl = document.getElementById('ftSpecial');
        if (punchEl) {
            punchEl.addEventListener('touchstart', function(e) { e.preventDefault(); game._playerAttack('punch'); }, {passive:false});
            punchEl.addEventListener('mousedown', function() { game._playerAttack('punch'); });
        }
        if (kickEl) {
            kickEl.addEventListener('touchstart', function(e) { e.preventDefault(); game._playerAttack('kick'); }, {passive:false});
            kickEl.addEventListener('mousedown', function() { game._playerAttack('kick'); });
        }
        if (specialEl) {
            specialEl.addEventListener('touchstart', function(e) { e.preventDefault(); game._playerSpecial(); }, {passive:false});
            specialEl.addEventListener('mousedown', function() { game._playerSpecial(); });
        }
    }

    setBalance(coins) {
        // Could add balance display if needed
    }
}

window.FighterGameUI = FighterGameUI;
