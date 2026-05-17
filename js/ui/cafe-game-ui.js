/**
 * Cafe Game UI - PixelAgent City
 * "Barista Challenge" overlay: 3-step timing minigame with coffee theme
 * Pattern matches SlotMachineUI for seamless integration
 */
class CafeGameUI {
    constructor(overlayEl, cafeGame) {
        this.overlay = overlayEl;
        this.game = cafeGame;
        this.players = [];
        this.onClose = null;
        this.onPlayRequest = null;   // (betAmount) => bool
        this.onResultCallback = null;

        this._barEl = null;
        this._indicatorEl = null;
        this._targetEl = null;
        this._stepLabelEl = null;
        this._resultEl = null;
        this._balanceEl = null;
        this._starsEl = null;
        this._cupVisualEl = null;
    }

    show() {
        this.overlay.innerHTML = '';
        this.overlay.classList.add('show');
        this._build();
    }

    hide() {
        this.overlay.classList.remove('show');
        this.game.destroy();
        var self = this;
        setTimeout(function() { self.overlay.innerHTML = ''; }, 300);
        if (this.onClose) this.onClose();
    }

    setBalance(coins) {
        if (this._balanceEl) this._balanceEl.textContent = coins + '\u24b8';
    }

    _build() {
        var recipes = this.game.recipes;
        var bets = this.game.betOptions;

        var recipeBtnsHtml = '';
        for (var i = 0; i < recipes.length; i++) {
            var r = recipes[i];
            var starCount = Math.ceil(r.difficulty * 5);
            var stars = '';
            for (var s = 0; s < starCount; s++) stars += '\u2605';
            recipeBtnsHtml += '<button class="cafe-recipe-btn' + (i === 0 ? ' active' : '') + '" data-recipe="' + r.id + '" title="' + r.name + ' \u2014 Kh\u00f3: ' + stars + '">' +
                r.emoji + ' <small>' + r.name + '</small></button>';
        }

        var betBtnsHtml = '';
        for (var j = 0; j < bets.length; j++) {
            betBtnsHtml += '<button class="cafe-bet-btn' + (j === 0 ? ' active' : '') + '" data-bet="' + bets[j] + '">' + bets[j] + '\u24b8</button>';
        }

        var html = '<div class="cafe-game-container">' +
            '<div class="cafe-game-header">' +
                '<div class="cafe-game-title">' +
                    '<span class="cafe-neon">\u2615</span>' +
                    '<span class="cafe-title-text">BARISTA CHALLENGE</span>' +
                    '<span class="cafe-neon">\u2615</span>' +
                '</div>' +
                '<button class="cafe-close-btn" id="cafeCloseBtn">\u2715</button>' +
            '</div>' +

            '<div class="cafe-game-body">' +
                '<div class="cafe-cup-display" id="cafeCupVisual">' +
                    '<div class="cafe-cup-steam" id="cafeSteam"><span></span><span></span><span></span></div>' +
                    '<div class="cafe-cup-icon" id="cafeCupIcon">\u2615</div>' +
                    '<div class="cafe-cup-label" id="cafeCupLabel">Ch\u1ecdn c\u00f4ng th\u1ee9c & b\u1eaft \u0111\u1ea7u!</div>' +
                '</div>' +

                '<div class="cafe-step-progress" id="cafeStepProgress">' +
                    '<div class="cafe-step-dot" data-step="0"><span>\u2699\ufe0f</span><small>Xay</small></div>' +
                    '<div class="cafe-step-line"></div>' +
                    '<div class="cafe-step-dot" data-step="1"><span>\ud83d\udca7</span><small>R\u00f3t</small></div>' +
                    '<div class="cafe-step-line"></div>' +
                    '<div class="cafe-step-dot" data-step="2"><span>\ud83c\udfa8</span><small>Art</small></div>' +
                '</div>' +

                '<div class="cafe-timing-section" id="cafeTimingSection" style="display:none">' +
                    '<div class="cafe-step-info" id="cafeStepInfo">' +
                        '<span class="cafe-step-emoji" id="cafeStepEmoji">\u2699\ufe0f</span>' +
                        '<span class="cafe-step-name" id="cafeStepName">Xay H\u1ea1t</span>' +
                    '</div>' +
                    '<div class="cafe-timing-bar" id="cafeTimingBar">' +
                        '<div class="cafe-target-zone" id="cafeTargetZone"></div>' +
                        '<div class="cafe-indicator" id="cafeIndicator"></div>' +
                        '<div class="cafe-bar-perfect" id="cafeBarPerfect"></div>' +
                    '</div>' +
                    '<div class="cafe-step-hint" id="cafeStepHint">Nh\u1ea5n STOP khi thanh tr\u1ecf v\u00e0o v\u00f9ng xanh!</div>' +
                '</div>' +

                '<div class="cafe-step-result" id="cafeStepResult" style="display:none">' +
                    '<div class="cafe-result-emoji" id="cafeResultEmoji">\u2b50</div>' +
                    '<div class="cafe-result-text" id="cafeResultText">PERFECT!</div>' +
                    '<div class="cafe-result-stars" id="cafeResultStars"></div>' +
                '</div>' +

                '<div class="cafe-final-result" id="cafeFinalResult" style="display:none">' +
                    '<div class="cafe-final-cup" id="cafeFinalCup">\u2615</div>' +
                    '<div class="cafe-final-name" id="cafeFinalName"></div>' +
                    '<div class="cafe-final-stars" id="cafeFinalStars"></div>' +
                    '<div class="cafe-final-payout" id="cafeFinalPayout"></div>' +
                '</div>' +

                '<div class="cafe-controls" id="cafeControls">' +
                    '<div class="cafe-recipe-section">' +
                        '<span class="cafe-recipe-label">C\u00f4ng th\u1ee9c:</span>' +
                        '<div class="cafe-recipe-btns" id="cafeRecipeBtns">' + recipeBtnsHtml + '</div>' +
                    '</div>' +
                    '<div class="cafe-bet-section">' +
                        '<span class="cafe-bet-label">\u0110\u1eb7t c\u01b0\u1ee3c:</span>' +
                        '<div class="cafe-bet-btns" id="cafeBetBtns">' + betBtnsHtml + '</div>' +
                    '</div>' +
                    '<div class="cafe-action-btns">' +
                        '<button class="cafe-start-btn" id="cafeStartBtn">' +
                            '<span class="cafe-start-icon">\u2615</span> <span>PHA CH\u1ebe!</span>' +
                        '</button>' +
                        '<button class="cafe-stop-btn" id="cafeStopBtn" style="display:none">' +
                            '<span class="cafe-stop-icon">\u270b</span> <span>STOP!</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                '<div class="cafe-footer">' +
                    '<div class="cafe-balance">' +
                        '<span>\ud83d\udcb0 S\u1ed1 d\u01b0:</span> ' +
                        '<span class="cafe-balance-val" id="cafeBalance">0\u24b8</span>' +
                    '</div>' +
                    '<div class="cafe-stats">' +
                        '<span class="cafe-stat">Pha: <b id="cafeGamesPlayed">0</b></span>' +
                        '<span class="cafe-stat">Th\u1eafng: <b id="cafeWon" class="cafe-win-val">0\u24b8</b></span>' +
                        '<span class="cafe-stat">Thua: <b id="cafeLost" class="cafe-lose-val">0\u24b8</b></span>' +
                        '<span class="cafe-stat">\u2b50 Perfect: <b id="cafePerfects">0</b></span>' +
                    '</div>' +
                '</div>' +

                '<div class="cafe-history" id="cafeHistory"></div>' +
                '<div class="cafe-players" id="cafePlayers"></div>' +
            '</div>' +
        '</div>';

        this.overlay.innerHTML = html;

        // Cache elements
        this._barEl = document.getElementById('cafeTimingBar');
        this._indicatorEl = document.getElementById('cafeIndicator');
        this._targetEl = document.getElementById('cafeTargetZone');
        this._stepLabelEl = document.getElementById('cafeStepInfo');
        this._resultEl = document.getElementById('cafeStepResult');
        this._balanceEl = document.getElementById('cafeBalance');
        this._cupVisualEl = document.getElementById('cafeCupVisual');

        // Wire events
        var self = this;
        document.getElementById('cafeCloseBtn').onclick = function() { self.hide(); };
        document.getElementById('cafeStartBtn').onclick = function() { self._doStart(); };
        document.getElementById('cafeStopBtn').onclick = function() { self._doStop(); };

        // Recipe buttons
        var recipeBtns = document.querySelectorAll('.cafe-recipe-btn');
        for (var ri = 0; ri < recipeBtns.length; ri++) {
            (function(btn) {
                btn.onclick = function() {
                    if (self.game.isPlaying) return;
                    var allBtns = document.querySelectorAll('.cafe-recipe-btn');
                    for (var x = 0; x < allBtns.length; x++) allBtns[x].classList.remove('active');
                    btn.classList.add('active');
                    self.game.setRecipe(btn.getAttribute('data-recipe'));
                    var rec = null;
                    for (var y = 0; y < self.game.recipes.length; y++) {
                        if (self.game.recipes[y].id === btn.getAttribute('data-recipe')) {
                            rec = self.game.recipes[y];
                            break;
                        }
                    }
                    if (rec) document.getElementById('cafeCupIcon').textContent = rec.emoji;
                };
            })(recipeBtns[ri]);
        }

        // Bet buttons
        var betBtns = document.querySelectorAll('.cafe-bet-btn');
        for (var bi = 0; bi < betBtns.length; bi++) {
            (function(btn) {
                btn.onclick = function() {
                    if (self.game.isPlaying) return;
                    var allBets = document.querySelectorAll('.cafe-bet-btn');
                    for (var x = 0; x < allBets.length; x++) allBets[x].classList.remove('active');
                    btn.classList.add('active');
                    self.game.setBet(parseInt(btn.getAttribute('data-bet')));
                };
            })(betBtns[bi]);
        }

        // Game callbacks
        this.game.onStepStart = function(idx, step) { self._onStepStart(idx, step); };
        this.game.onTick = function(pos) { self._onTick(pos); };
        this.game.onStepResult = function(idx, accuracy, rating) { self._onStepResult(idx, accuracy, rating); };
        this.game.onGameResult = function(result) { self._onGameResult(result); };

        // Render players
        this._renderPlayers();
        this._updateStats();
    }

    _doStart() {
        if (this.game.isPlaying) return;

        // Validate funds
        if (this.onPlayRequest) {
            if (!this.onPlayRequest(this.game.currentBet)) return;
        }

        // Hide idle state, show timing
        document.getElementById('cafeCupLabel').textContent = '\u0110ang pha ch\u1ebf...';
        document.getElementById('cafeSteam').classList.add('active');
        document.getElementById('cafeFinalResult').style.display = 'none';
        document.getElementById('cafeStartBtn').style.display = 'none';
        document.getElementById('cafeStopBtn').style.display = '';

        // Reset step progress
        var dots = document.querySelectorAll('.cafe-step-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.remove('active', 'done', 'perfect', 'great', 'ok', 'miss');
        }

        // Disable recipe/bet buttons
        var btns = document.querySelectorAll('.cafe-recipe-btn, .cafe-bet-btn');
        for (var j = 0; j < btns.length; j++) btns[j].disabled = true;

        this.game.startGame();
    }

    _doStop() {
        if (!this.game.isPlaying) return;
        this.game.stopIndicator();
    }

    _onStepStart(idx, step) {
        // Show timing section
        var timingSec = document.getElementById('cafeTimingSection');
        var stepResult = document.getElementById('cafeStepResult');
        timingSec.style.display = '';
        stepResult.style.display = 'none';

        // Update step info
        document.getElementById('cafeStepEmoji').textContent = step.emoji;
        document.getElementById('cafeStepName').textContent = step.name;
        document.getElementById('cafeStepHint').textContent = step.description;

        // Update target zone position
        var tStart = this.game.targetStart * 100;
        var tWidth = (this.game.targetEnd - this.game.targetStart) * 100;
        this._targetEl.style.left = tStart + '%';
        this._targetEl.style.width = tWidth + '%';

        // Perfect center marker
        var center = ((this.game.targetStart + this.game.targetEnd) / 2) * 100;
        var perfectEl = document.getElementById('cafeBarPerfect');
        if (perfectEl) {
            perfectEl.style.left = center + '%';
        }

        // Highlight active step
        var allDots = document.querySelectorAll('.cafe-step-dot');
        for (var i = 0; i < allDots.length; i++) {
            if (i === idx) allDots[i].classList.add('active');
            else allDots[i].classList.remove('active');
        }

        // Show stop button
        document.getElementById('cafeStopBtn').style.display = '';
    }

    _onTick(pos) {
        if (this._indicatorEl) {
            this._indicatorEl.style.left = (pos * 100) + '%';

            // Color feedback: green when in zone, red when not
            var inZone = pos >= this.game.targetStart && pos <= this.game.targetEnd;
            if (inZone) {
                this._indicatorEl.classList.add('in-zone');
            } else {
                this._indicatorEl.classList.remove('in-zone');
            }
        }
    }

    _onStepResult(idx, accuracy, rating) {
        // Hide timing, show step result
        document.getElementById('cafeTimingSection').style.display = 'none';
        var stepResult = document.getElementById('cafeStepResult');
        stepResult.style.display = '';

        document.getElementById('cafeResultEmoji').textContent = rating.emoji;
        document.getElementById('cafeResultText').textContent = rating.text;
        document.getElementById('cafeResultText').style.color = rating.color;

        // Stars
        var starsHtml = '';
        for (var i = 0; i < rating.stars; i++) starsHtml += '\u2b50';
        for (var j = rating.stars; j < 3; j++) starsHtml += '\u2606';
        document.getElementById('cafeResultStars').textContent = starsHtml;

        // Update step dot
        var dot = document.querySelector('.cafe-step-dot[data-step="' + idx + '"]');
        if (dot) {
            dot.classList.remove('active');
            dot.classList.add('done');
            if (rating.stars === 3) dot.classList.add('perfect');
            else if (rating.stars === 2) dot.classList.add('great');
            else if (rating.stars === 1) dot.classList.add('ok');
            else dot.classList.add('miss');
        }
    }

    _onGameResult(result) {
        // Hide timing/step result, show final
        document.getElementById('cafeTimingSection').style.display = 'none';
        document.getElementById('cafeStepResult').style.display = 'none';

        var finalEl = document.getElementById('cafeFinalResult');
        finalEl.style.display = '';

        document.getElementById('cafeFinalCup').textContent = result.recipe.emoji;
        document.getElementById('cafeFinalName').textContent = result.name;

        // Stars
        var fullStars = Math.floor(result.totalStars / 3);
        var halfStar = result.totalStars % 3 >= 2 ? 1 : 0;
        var starsText = '';
        for (var i = 0; i < fullStars; i++) starsText += '\u2b50';
        if (halfStar) starsText += '\u2728';
        for (var j = fullStars + halfStar; j < 3; j++) starsText += '\u2606';
        document.getElementById('cafeFinalStars').textContent = starsText;

        // Payout
        var payoutEl = document.getElementById('cafeFinalPayout');
        if (result.win) {
            payoutEl.textContent = '+' + result.payout + '\u24b8';
            payoutEl.className = 'cafe-final-payout cafe-win';
            finalEl.classList.add('cafe-win-anim');
            setTimeout(function() { finalEl.classList.remove('cafe-win-anim'); }, 2000);
        } else {
            payoutEl.textContent = '-' + result.bet + '\u24b8';
            payoutEl.className = 'cafe-final-payout cafe-lose';
        }

        // Perfect flash
        var self = this;
        if (result.isPerfect) {
            var container = this.overlay.querySelector('.cafe-game-container');
            if (container) container.classList.add('cafe-perfect-flash');
            setTimeout(function() {
                var c = self.overlay.querySelector('.cafe-game-container');
                if (c) c.classList.remove('cafe-perfect-flash');
            }, 3000);
        }

        // Reset UI for next round
        document.getElementById('cafeStartBtn').style.display = '';
        document.getElementById('cafeStopBtn').style.display = 'none';
        document.getElementById('cafeSteam').classList.remove('active');
        document.getElementById('cafeCupLabel').textContent = result.isPerfect
            ? '\u2b50 Tuy\u1ec7t ph\u1ea9m! Pha ti\u1ebfp n\u00e0o!' : 'Ch\u1ecdn c\u00f4ng th\u1ee9c & pha ti\u1ebfp!';

        // Re-enable recipe/bet buttons
        var btns = document.querySelectorAll('.cafe-recipe-btn, .cafe-bet-btn');
        for (var k = 0; k < btns.length; k++) btns[k].disabled = false;

        // Update stats & history
        this._updateStats();
        this._addHistory(result);

        // External callback
        if (this.onResultCallback) this.onResultCallback(result);
    }

    _updateStats() {
        var stats = this.game.getStats();
        var setEl = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
        setEl('cafeGamesPlayed', stats.totalGames);
        setEl('cafeWon', stats.totalWon + '\u24b8');
        setEl('cafeLost', stats.totalLost + '\u24b8');
        setEl('cafePerfects', stats.perfectDrinks);
    }

    _addHistory(result) {
        var el = document.getElementById('cafeHistory');
        if (!el) return;
        var cls = result.win ? 'cafe-hist-win' : 'cafe-hist-lose';
        var starCount = Math.floor(result.totalStars / 3);
        var stars = '';
        for (var i = 0; i < starCount; i++) stars += '\u2b50';
        var item = document.createElement('div');
        item.className = 'cafe-hist-item ' + cls;
        item.textContent = result.recipe.emoji + ' ' + stars + ' ' + (result.win ? '+' + result.payout : '-' + result.bet) + '\u24b8';
        el.insertBefore(item, el.firstChild);
        while (el.children.length > 8) el.removeChild(el.lastChild);
    }

    _renderPlayers() {
        var el = document.getElementById('cafePlayers');
        if (!el || !this.players.length) return;
        var html = '<div class="cafe-players-label">\u2615 \u0110ang ch\u01a1i:</div>';
        for (var i = 0; i < this.players.length; i++) {
            var p = this.players[i];
            html += '<span class="cafe-player-tag" style="border-color:' + (p.color || '#6c5ce7') + '">' + p.name + '</span>';
        }
        el.innerHTML = html;
    }
}

window.CafeGameUI = CafeGameUI;
