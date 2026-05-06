/**
 * Cafe Minigame - PixelAgent City
 * "Barista Challenge": 3-step timing game (Grind - Pour - Latte Art)
 * Stop the indicator in the target zone for each step to craft a perfect drink!
 */
class CafeGame {
    constructor(opts = {}) {
        // Drink recipes with difficulty & rewards
        this.recipes = [
            { id: 'espresso',   emoji: '\u2615', name: 'Espresso',      difficulty: 0.35, baseMul: 2,   targetSize: 0.30 },
            { id: 'latte',      emoji: '\ud83e\udd5b', name: 'Latte',         difficulty: 0.40, baseMul: 2.5, targetSize: 0.26 },
            { id: 'cappuccino', emoji: '\u2615', name: 'Cappuccino',    difficulty: 0.45, baseMul: 3,   targetSize: 0.22 },
            { id: 'mocha',      emoji: '\ud83c\udf6b', name: 'Mocha',         difficulty: 0.50, baseMul: 3.5, targetSize: 0.20 },
            { id: 'matcha',     emoji: '\ud83c\udf75', name: 'Matcha Latte',  difficulty: 0.55, baseMul: 4,   targetSize: 0.18 },
            { id: 'boba',       emoji: '\ud83e\uddcb', name: 'Tr\u00e0 S\u1eefa Tr\u00e2n Ch\u00e2u', difficulty: 0.60, baseMul: 5, targetSize: 0.15 },
        ];

        this.steps = [
            { name: 'Xay H\u1ea1t', emoji: '\u2699\ufe0f', description: 'Xay h\u1ea1t c\u00e0 ph\u00ea v\u1eeba \u0111\u1ee7 m\u1ecbn' },
            { name: 'R\u00f3t N\u01b0\u1edbc', emoji: '\ud83d\udca7', description: 'R\u00f3t n\u01b0\u1edbc \u0111\u00fang l\u01b0\u1ee3ng' },
            { name: 'Latte Art', emoji: '\ud83c\udfa8', description: 'V\u1ebd hoa v\u0103n ho\u00e0n h\u1ea3o' },
        ];

        this.betOptions = [10, 25, 50, 100];
        this.currentBet = 10;
        this.currentRecipe = this.recipes[0];
        this.currentStep = 0;
        this.stepResults = []; // accuracy for each step (0-1)
        this.isPlaying = false;

        // Indicator state
        this.indicatorPos = 0;       // 0..1 cycling position
        this.indicatorSpeed = 1.5;   // cycles per second
        this.indicatorDir = 1;       // 1 or -1 (bounce mode)
        this.targetStart = 0;        // target zone start (0..1)
        this.targetEnd = 0;          // target zone end

        // Stats
        this.totalGames = 0;
        this.totalWon = 0;
        this.totalLost = 0;
        this.perfectDrinks = 0;
        this.history = [];

        // Animation frame
        this._animFrame = null;
        this._lastTime = 0;

        // Callbacks
        this.onStepStart = null;     // (stepIndex, stepInfo)
        this.onIndicatorUpdate = null; // (pos, targetStart, targetEnd)
        this.onStepResult = null;    // (stepIndex, accuracy, rating)
        this.onGameResult = null;    // (result)
        this.onTick = null;          // (indicatorPos)
    }

    setRecipe(recipeId) {
        if (this.isPlaying) return;
        var r = this.recipes.find(function(x) { return x.id === recipeId; });
        if (r) this.currentRecipe = r;
    }

    setBet(amount) {
        if (this.isPlaying) return;
        if (this.betOptions.indexOf(amount) !== -1) this.currentBet = amount;
    }

    startGame() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.currentStep = 0;
        this.stepResults = [];
        this.totalGames++;
        this._startStep(0);
    }

    _startStep(stepIdx) {
        this.currentStep = stepIdx;
        var recipe = this.currentRecipe;

        // Calculate target zone - smaller = harder
        var targetSize = recipe.targetSize * (1 - stepIdx * 0.05); // each step slightly harder
        this.targetStart = 0.15 + Math.random() * (0.7 - targetSize);
        this.targetEnd = this.targetStart + targetSize;

        // Speed increases each step
        this.indicatorSpeed = 1.2 + recipe.difficulty * 2 + stepIdx * 0.4;
        this.indicatorPos = 0;
        this.indicatorDir = 1;

        if (this.onStepStart) {
            this.onStepStart(stepIdx, this.steps[stepIdx]);
        }

        // Start animation
        this._lastTime = performance.now();
        this._animate();
    }

    _animate() {
        var self = this;
        var now = performance.now();
        var dt = (now - this._lastTime) / 1000;
        this._lastTime = now;

        // Move indicator (bounce mode)
        this.indicatorPos += this.indicatorDir * this.indicatorSpeed * dt;
        if (this.indicatorPos >= 1) {
            this.indicatorPos = 1;
            this.indicatorDir = -1;
        } else if (this.indicatorPos <= 0) {
            this.indicatorPos = 0;
            this.indicatorDir = 1;
        }

        if (this.onTick) this.onTick(this.indicatorPos);

        if (this.isPlaying) {
            this._animFrame = requestAnimationFrame(function() { self._animate(); });
        }
    }

    // Player presses STOP
    stopIndicator() {
        if (!this.isPlaying) return;

        // Cancel animation
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }

        // Calculate accuracy
        var pos = this.indicatorPos;
        var center = (this.targetStart + this.targetEnd) / 2;
        var halfSize = (this.targetEnd - this.targetStart) / 2;
        var accuracy = 0;

        if (pos >= this.targetStart && pos <= this.targetEnd) {
            // Inside target zone
            var distFromCenter = Math.abs(pos - center);
            accuracy = 1 - (distFromCenter / halfSize); // 1.0 = perfect center
        } else {
            // Outside - partial credit based on distance
            var distFromEdge = pos < this.targetStart
                ? this.targetStart - pos
                : pos - this.targetEnd;
            accuracy = Math.max(0, -distFromEdge * 3); // 0 if too far
        }

        var rating = this._getRating(accuracy);
        this.stepResults.push(accuracy);

        if (this.onStepResult) {
            this.onStepResult(this.currentStep, accuracy, rating);
        }

        // Next step or finish
        var self = this;
        setTimeout(function() {
            if (self.currentStep < 2) {
                self._startStep(self.currentStep + 1);
            } else {
                self._finishGame();
            }
        }, 1200);
    }

    _getRating(accuracy) {
        if (accuracy >= 0.90) return { text: 'PERFECT!', emoji: '\u2b50', stars: 3, color: '#ffd93d' };
        if (accuracy >= 0.60) return { text: 'GREAT!', emoji: '\u2728', stars: 2, color: '#4ecdc4' };
        if (accuracy >= 0.30) return { text: 'OK', emoji: '\ud83d\udc4d', stars: 1, color: '#78e08f' };
        return { text: 'MISS...', emoji: '\ud83d\udca8', stars: 0, color: '#ff6b6b' };
    }

    _finishGame() {
        this.isPlaying = false;

        var avgAccuracy = this.stepResults.reduce(function(a, b) { return a + b; }, 0) / this.stepResults.length;
        var self = this;
        var totalStars = this.stepResults.reduce(function(sum, acc) { return sum + self._getRating(acc).stars; }, 0);
        var maxStars = 9; // 3 steps x 3 stars max
        var isPerfect = totalStars === maxStars;

        // Calculate payout
        var payout = 0;
        var winName = '';

        if (totalStars >= 7) {
            // Excellent drink
            payout = Math.floor(this.currentBet * this.currentRecipe.baseMul * (1 + avgAccuracy));
            winName = isPerfect
                ? '\u2b50 PERFECT ' + this.currentRecipe.name + '!'
                : '\u2728 Tuy\u1ec7t v\u1eddi! ' + this.currentRecipe.name;
            if (isPerfect) this.perfectDrinks++;
        } else if (totalStars >= 4) {
            // Decent drink
            payout = Math.floor(this.currentBet * 1.5);
            winName = '\ud83d\udc4d ' + this.currentRecipe.name + ' t\u1ea1m \u1ed5n';
        } else if (totalStars >= 2) {
            // Poor drink - return some
            payout = Math.floor(this.currentBet * 0.5);
            winName = '\ud83d\ude05 ' + this.currentRecipe.name + ' h\u01a1i t\u1ec7...';
        } else {
            // Failed
            payout = 0;
            winName = '\ud83d\udc94 H\u1ecfng r\u1ed3i! Kh\u00e1ch tr\u1ea3 l\u1ea1i...';
        }

        var win = payout > this.currentBet;
        if (win) {
            this.totalWon += payout;
        } else {
            this.totalLost += this.currentBet;
        }

        var result = {
            recipe: this.currentRecipe,
            bet: this.currentBet,
            payout: payout,
            netGain: payout - this.currentBet,
            win: win,
            name: winName,
            isPerfect: isPerfect,
            totalStars: totalStars,
            maxStars: maxStars,
            avgAccuracy: avgAccuracy,
            stepResults: this.stepResults.slice()
        };

        this.history.unshift(result);
        if (this.history.length > 10) this.history.pop();

        if (this.onGameResult) this.onGameResult(result);
    }

    getStats() {
        var hist = this.history;
        var winCount = 0;
        for (var i = 0; i < Math.min(hist.length, 10); i++) {
            if (hist[i].win) winCount++;
        }
        return {
            totalGames: this.totalGames,
            totalWon: this.totalWon,
            totalLost: this.totalLost,
            netProfit: this.totalWon - this.totalLost,
            perfectDrinks: this.perfectDrinks,
            winRate: this.totalGames > 0
                ? ((winCount / Math.min(hist.length, 10)) * 100).toFixed(0)
                : 0
        };
    }

    destroy() {
        this.isPlaying = false;
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
    }
}

window.CafeGame = CafeGame;
