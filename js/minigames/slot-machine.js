/**
 * Slot Machine — PixelAgent City Mini-Game
 * 3-reel slot with 7 symbols, bet system, payout table, sound FX
 */
class SlotMachine {
    constructor(opts = {}) {
        this.symbols = [
            { id: 'cherry',  emoji: '🍒', weight: 22, name: 'Cherry' },
            { id: 'lemon',   emoji: '🍋', weight: 20, name: 'Lemon' },
            { id: 'orange',  emoji: '🍊', weight: 18, name: 'Orange' },
            { id: 'star',    emoji: '⭐', weight: 16, name: 'Star' },
            { id: 'seven',   emoji: '7️⃣',  weight: 12, name: 'Seven' },
            { id: 'diamond', emoji: '💎', weight: 8,  name: 'Diamond' },
            { id: 'jackpot', emoji: '🎰', weight: 4,  name: 'Jackpot' },
        ];

        this.payouts = {
            'jackpot-jackpot-jackpot': { mul: 50, name: '🎰 MEGA JACKPOT!' },
            'diamond-diamond-diamond': { mul: 20, name: '💎 Triple Diamond!' },
            'seven-seven-seven':       { mul: 15, name: '7️⃣ Lucky Sevens!' },
            'star-star-star':          { mul: 10, name: '⭐ Triple Star!' },
            'orange-orange-orange':    { mul: 5,  name: '🍊 Triple Orange!' },
            'lemon-lemon-lemon':       { mul: 4,  name: '🍋 Triple Lemon!' },
            'cherry-cherry-cherry':    { mul: 3,  name: '🍒 Triple Cherry!' },
        };

        // Two-of-a-kind payouts (more generous to boost RTP)
        this.twoOfAKindMul = {
            'jackpot': 5,
            'diamond': 3,
            'seven':   2.5,
            'star':    2,
            'orange':  1.5,
            'lemon':   1.2,
            'cherry':  1.1,
        };

        this.betOptions = [10, 25, 50, 100];
        this.currentBet = 10;
        this.isSpinning = false;
        this.autoSpin = false;
        this.reels = [null, null, null];
        this.reelStrips = this._buildReelStrips();
        this.totalSpins = 0;
        this.totalWon = 0;
        this.totalLost = 0;
        this.history = []; // last 10 results
        this.stepDelay = opts.stepDelay || 600;

        // Callbacks
        this.onSpinStart = null;
        this.onReelStop = null;   // (reelIndex, symbol)
        this.onResult = null;     // (result: { reels, payout, win, name })
        this.onAutoSpinTick = null;
    }

    _buildReelStrips() {
        // Build weighted strips for each reel
        const strips = [];
        for (let r = 0; r < 3; r++) {
            const strip = [];
            this.symbols.forEach(sym => {
                for (let i = 0; i < sym.weight; i++) strip.push(sym);
            });
            // Shuffle
            for (let i = strip.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [strip[i], strip[j]] = [strip[j], strip[i]];
            }
            strips.push(strip);
        }
        return strips;
    }

    setBet(amount) {
        if (this.isSpinning) return;
        if (this.betOptions.includes(amount)) this.currentBet = amount;
    }

    spin() {
        if (this.isSpinning) return null;
        this.isSpinning = true;
        this.totalSpins++;

        if (this.onSpinStart) this.onSpinStart(this.currentBet);

        if (this._pythonCoreActive()) {
            this._spinWithPython();
            return null;
        }

        // Pick results immediately (but reveal staggered)
        const results = [];
        for (let r = 0; r < 3; r++) {
            const strip = this.reelStrips[r];
            const idx = Math.floor(Math.random() * strip.length);
            results.push(strip[idx]);
        }
        this.reels = results;

        // Staggered reveal
        const delays = [this.stepDelay, this.stepDelay * 2, this.stepDelay * 3];
        delays.forEach((d, i) => {
            setTimeout(() => {
                if (this.onReelStop) this.onReelStop(i, results[i]);
                if (i === 2) {
                    // All reels stopped — evaluate
                    setTimeout(() => this._evaluate(results), 300);
                }
            }, d);
        });

        return results;
    }

    _pythonCoreActive() {
        return !!(window.__pixelAgentUsePythonCore && window.PythonBridge?.isServerMode?.() && window.PythonBridge.playSlots);
    }

    async _spinWithPython() {
        const serverResult = await window.PythonBridge.playSlots(this.currentBet);
        if (!serverResult || serverResult.error) {
            this.isSpinning = false;
            if (this.onResult) {
                this.onResult({
                    reels: [this.symbols[0], this.symbols[1], this.symbols[2]],
                    bet: this.currentBet,
                    payout: 0,
                    netGain: -this.currentBet,
                    win: false,
                    name: serverResult?.error || 'Spin failed.',
                    isJackpot: false,
                });
            }
            return;
        }

        const result = this._normalizePythonResult(serverResult);
        this.reels = result.reels;

        const delays = [this.stepDelay, this.stepDelay * 2, this.stepDelay * 3];
        delays.forEach((d, i) => {
            setTimeout(() => {
                if (this.onReelStop) this.onReelStop(i, result.reels[i]);
                if (i === 2) {
                    setTimeout(() => this._completeResult(result), 300);
                }
            }, d);
        });
    }

    _normalizePythonResult(serverResult) {
        const reels = (serverResult.reels || []).map(entry => {
            const id = typeof entry === 'string' ? entry : entry?.id;
            return this.symbols.find(s => s.id === id) || {
                id: id || 'unknown',
                emoji: entry?.emoji || '?',
                name: entry?.name || id || 'Unknown',
            };
        });
        while (reels.length < 3) reels.push(this.symbols[0]);

        const bet = serverResult.bet ?? this.currentBet;
        const payout = serverResult.payout ?? 0;
        return {
            ...serverResult,
            reels,
            bet,
            payout,
            netGain: serverResult.netGain ?? serverResult.winnings ?? (payout - bet),
            win: !!serverResult.win,
            name: serverResult.name || 'No luck this time...',
            isJackpot: !!(serverResult.isJackpot || serverResult.jackpot),
        };
    }

    _evaluate(results) {
        const ids = results.map(r => r.id);
        const key = ids.join('-');
        let payout = 0;
        let winName = '';

        // Check triple match
        if (this.payouts[key]) {
            payout = this.currentBet * this.payouts[key].mul;
            winName = this.payouts[key].name;
        } else {
            // Check two-of-a-kind
            const counts = {};
            ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
            const pair = Object.entries(counts).find(([_, c]) => c >= 2);
            if (pair) {
                const [pairId] = pair;
                const mul = this.twoOfAKindMul[pairId] || 1;
                if (mul > 1) {
                    payout = Math.floor(this.currentBet * mul);
                    const sym = this.symbols.find(s => s.id === pairId);
                    winName = `${sym.emoji} Double ${sym.name}!`;
                }
            }
        }

        const win = payout > 0;
        const netGain = payout - this.currentBet;

        const result = {
            reels: results,
            bet: this.currentBet,
            payout,
            netGain,
            win,
            name: winName || 'No luck this time...',
            isJackpot: ids[0] === 'jackpot' && ids[1] === 'jackpot' && ids[2] === 'jackpot',
        };

        this._completeResult(result);
    }

    _completeResult(result) {
        this.history.unshift(result);
        if (this.history.length > 10) this.history.pop();

        if (result.win) {
            this.totalWon += result.payout;
        } else {
            this.totalLost += result.bet;
        }

        this.isSpinning = false;
        if (this.onResult) this.onResult(result);

        // Auto-spin
        if (this.autoSpin && this.onAutoSpinTick) {
            setTimeout(() => {
                if (this.autoSpin) this.onAutoSpinTick();
            }, 1500);
        }
    }

    getPayoutTable() {
        const table = [];
        // Triples
        Object.entries(this.payouts).forEach(([key, val]) => {
            const syms = key.split('-');
            const sym = this.symbols.find(s => s.id === syms[0]);
            table.push({ symbols: [sym, sym, sym], multiplier: val.mul, name: val.name });
        });
        // Two-of-a-kind
        Object.entries(this.twoOfAKindMul).forEach(([id, mul]) => {
            if (mul > 1) {
                const sym = this.symbols.find(s => s.id === id);
                table.push({ symbols: [sym, sym, null], multiplier: mul, name: `2x ${sym.name}` });
            }
        });
        return table;
    }

    getStats() {
        return {
            totalSpins: this.totalSpins,
            totalWon: this.totalWon,
            totalLost: this.totalLost,
            netProfit: this.totalWon - this.totalLost,
            winRate: this.totalSpins > 0 ? ((this.history.filter(r => r.win).length / Math.min(this.history.length, 10)) * 100).toFixed(0) : 0,
        };
    }
}

window.SlotMachine = SlotMachine;
