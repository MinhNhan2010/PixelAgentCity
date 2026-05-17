/**
 * Poker Engine v1.0 — Texas Hold'em for PixelAgent City
 * Handles deck, hand evaluation, game flow, and AI decisions
 */

// ============ CARD & DECK ============
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_NAMES = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

const HAND_RANKINGS = {
    'Royal Flush': 10,
    'Straight Flush': 9,
    'Four of a Kind': 8,
    'Full House': 7,
    'Flush': 6,
    'Straight': 5,
    'Three of a Kind': 4,
    'Two Pair': 3,
    'One Pair': 2,
    'High Card': 1
};

class PokerDeck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push({ rank, suit, value: RANK_VALUES[rank] });
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(count = 1) {
        return this.cards.splice(0, count);
    }
}

// ============ HAND EVALUATOR ============
class PokerHandEvaluator {
    static evaluate(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        if (allCards.length < 5) return { rank: 0, name: 'Incomplete', kickers: [] };

        let bestHand = null;
        const combos = this._combinations(allCards, 5);

        for (const combo of combos) {
            const result = this._evaluateHand(combo);
            if (!bestHand || result.rank > bestHand.rank ||
                (result.rank === bestHand.rank && this._compareKickers(result.kickers, bestHand.kickers) > 0)) {
                bestHand = result;
            }
        }
        return bestHand;
    }

    static _evaluateHand(cards) {
        const sorted = [...cards].sort((a, b) => b.value - a.value);
        const isFlush = sorted.every(c => c.suit === sorted[0].suit);
        const values = sorted.map(c => c.value);

        // Check straight
        let isStraight = true;
        for (let i = 1; i < values.length; i++) {
            if (values[i - 1] - values[i] !== 1) {
                isStraight = false;
                break;
            }
        }
        // Ace-low straight (A-2-3-4-5)
        const isLowStraight = !isStraight &&
            values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2;

        if (isLowStraight) isStraight = true;

        // Count ranks
        const counts = {};
        for (const v of values) counts[v] = (counts[v] || 0) + 1;
        const groups = Object.entries(counts).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

        // Determine hand
        if (isFlush && isStraight && values[0] === 14 && values[1] === 13) {
            return { rank: 10, name: 'Royal Flush', kickers: values };
        }
        if (isFlush && isStraight) {
            return { rank: 9, name: 'Straight Flush', kickers: isLowStraight ? [5, 4, 3, 2, 1] : values };
        }
        if (groups[0][1] === 4) {
            return { rank: 8, name: 'Four of a Kind', kickers: values };
        }
        if (groups[0][1] === 3 && groups[1][1] === 2) {
            return { rank: 7, name: 'Full House', kickers: values };
        }
        if (isFlush) {
            return { rank: 6, name: 'Flush', kickers: values };
        }
        if (isStraight) {
            return { rank: 5, name: 'Straight', kickers: isLowStraight ? [5, 4, 3, 2, 1] : values };
        }
        if (groups[0][1] === 3) {
            return { rank: 4, name: 'Three of a Kind', kickers: values };
        }
        if (groups[0][1] === 2 && groups[1][1] === 2) {
            return { rank: 3, name: 'Two Pair', kickers: values };
        }
        if (groups[0][1] === 2) {
            return { rank: 2, name: 'One Pair', kickers: values };
        }
        return { rank: 1, name: 'High Card', kickers: values };
    }

    static _compareKickers(a, b) {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            if (a[i] !== b[i]) return a[i] - b[i];
        }
        return 0;
    }

    static _combinations(arr, k) {
        const result = [];
        const combo = [];
        function backtrack(start) {
            if (combo.length === k) {
                result.push([...combo]);
                return;
            }
            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]);
                backtrack(i + 1);
                combo.pop();
            }
        }
        backtrack(0);
        return result;
    }

    /**
     * Calculate rough hand strength (0-1) for AI decisions
     */
    static handStrength(holeCards, communityCards) {
        const hand = this.evaluate(holeCards, communityCards);
        // Base strength from hand rank
        let strength = (hand.rank - 1) / 9; // 0 to 1

        // Adjust for high cards
        const maxKicker = Math.max(...hand.kickers) / 14;
        strength = strength * 0.85 + maxKicker * 0.15;

        return Math.min(1, Math.max(0, strength));
    }
}

// ============ AI BETTING PERSONALITIES ============
const POKER_PERSONALITIES = {
    coder:      { aggression: 0.45, bluffRate: 0.15, tightness: 0.35, name: 'Logical' },
    tester:     { aggression: 0.30, bluffRate: 0.10, tightness: 0.50, name: 'Cautious' },
    reviewer:   { aggression: 0.35, bluffRate: 0.12, tightness: 0.40, name: 'Analytical' },
    designer:   { aggression: 0.65, bluffRate: 0.35, tightness: 0.18, name: 'Creative' },
    devops:     { aggression: 0.75, bluffRate: 0.25, tightness: 0.20, name: 'Aggressive' },
    researcher: { aggression: 0.40, bluffRate: 0.15, tightness: 0.38, name: 'Methodical' },
    analyst:    { aggression: 0.45, bluffRate: 0.12, tightness: 0.35, name: 'Calculated' },
    security:   { aggression: 0.50, bluffRate: 0.18, tightness: 0.30, name: 'Defensive' },
    backend:    { aggression: 0.55, bluffRate: 0.22, tightness: 0.25, name: 'Balanced' },
    mobile:     { aggression: 0.50, bluffRate: 0.20, tightness: 0.30, name: 'Adaptive' },
    writer:     { aggression: 0.45, bluffRate: 0.30, tightness: 0.28, name: 'Storyteller' },
};

function getPersonality(role) {
    return POKER_PERSONALITIES[role] || POKER_PERSONALITIES.coder;
}

// ============ POKER GAME ============
class PokerGame {
    constructor(options = {}) {
        this.players = [];       // { id, name, role, emoji, chips, holeCards, folded, currentBet, allIn }
        this.deck = new PokerDeck();
        this.communityCards = [];
        this.pot = 0;
        this.sidePots = [];
        this.currentBet = 0;
        this.dealerIndex = 0;
        this.currentPlayerIndex = 0;
        this.phase = 'waiting';  // waiting, preflop, flop, turn, river, showdown, finished
        this.blinds = { small: 1, big: 2 };
        this.handNumber = 0;
        this.history = [];       // { hand, winner, amount }
        this.lastAction = null;  // { playerId, action, amount }
        this.roundBets = new Map(); // track bets per round
        this.actedThisRound = new Set();

        // Callbacks
        this.onUpdate = options.onUpdate || (() => {});
        this.onPhaseChange = options.onPhaseChange || (() => {});
        this.onAction = options.onAction || (() => {});
        this.onHandComplete = options.onHandComplete || (() => {});
        this.onGameLog = options.onGameLog || (() => {});

        this.stepDelay = options.stepDelay || 1200;
        this._timer = null;
        this.isRunning = false;
        this.autoPlay = true;
    }

    addPlayer(id, name, role, emoji, startChips = 200) {
        if (this.players.length >= 6) return false;
        this.players.push({
            id, name, role, emoji,
            chips: startChips,
            holeCards: [],
            folded: false,
            currentBet: 0,
            allIn: false,
            personality: getPersonality(role),
            totalWon: 0,
            handsWon: 0,
        });
        return true;
    }

    get activePlayers() {
        return this.players.filter(p => !p.folded && p.chips > 0);
    }

    get allInOrFolded() {
        const active = this.activePlayers;
        return active.length <= 1 || active.every(p => p.allIn || p.folded);
    }

    // ======= START A NEW HAND =======
    startHand() {
        if (this.players.filter(p => p.chips > 0).length < 2) {
            this.phase = 'finished';
            this.onUpdate();
            return;
        }

        this.handNumber++;
        this.deck.reset();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.lastAction = null;
        this.roundBets.clear();
        this.actedThisRound.clear();

        // Reset player states
        this.players.forEach(p => {
            p.holeCards = [];
            p.folded = p.chips <= 0;
            p.currentBet = 0;
            p.allIn = false;
        });

        // Move dealer
        do {
            this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        } while (this.players[this.dealerIndex].chips <= 0);

        // Post blinds
        const sbIndex = this._nextActivePlayer(this.dealerIndex);
        const bbIndex = this._nextActivePlayer(sbIndex);

        this._postBlind(sbIndex, this.blinds.small);
        this._postBlind(bbIndex, this.blinds.big);
        this.currentBet = this.blinds.big;

        // Deal hole cards
        this.players.forEach(p => {
            if (!p.folded) {
                p.holeCards = this.deck.deal(2);
            }
        });

        this.currentPlayerIndex = this._nextActivePlayer(bbIndex);
        this.phase = 'preflop';

        this.onGameLog(`🃏 Hand #${this.handNumber} — Dealer: ${this.players[this.dealerIndex].name}`);
        this.onPhaseChange('preflop');
        this.onUpdate();

        if (this.autoPlay) this._scheduleNextStep();
    }

    _postBlind(index, amount) {
        const p = this.players[index];
        const actual = Math.min(amount, p.chips);
        p.chips -= actual;
        p.currentBet = actual;
        this.pot += actual;
        if (p.chips === 0) p.allIn = true;
        this.onGameLog(`  ${p.emoji} ${p.name} posts ${actual === this.blinds.small ? 'SB' : 'BB'}: ${actual}`);
    }

    _nextActivePlayer(fromIndex) {
        let idx = (fromIndex + 1) % this.players.length;
        let safety = 0;
        while ((this.players[idx].folded || this.players[idx].chips <= 0) && safety < this.players.length) {
            idx = (idx + 1) % this.players.length;
            safety++;
        }
        return idx;
    }

    // ======= AI DECISION =======
    makeAIDecision(player) {
        const p = player.personality;
        const strength = PokerHandEvaluator.handStrength(player.holeCards, this.communityCards);
        const callAmount = this.currentBet - player.currentBet;
        const potOdds = callAmount > 0 ? callAmount / (this.pot + callAmount) : 0;

        // Phase-based adjustments (play looser in early phases)
        const phaseBonus = { preflop: 0.08, flop: 0.05, turn: 0.03, river: 0 }[this.phase] || 0;

        // Position awareness: late position plays wider
        const totalActive = this.activePlayers.length;
        const positionInRound = this.actedThisRound.size / Math.max(1, totalActive);
        const positionBonus = positionInRound * 0.06; // Late position gets up to 6% bonus

        // Effective threshold (lower = play more hands)
        const playThreshold = p.tightness * 0.25 - phaseBonus - positionBonus;

        // Bluff chance (increases with aggression and phase)
        const bluffChance = p.bluffRate + (this.phase === 'preflop' ? 0.05 : 0);
        const isBluffing = Math.random() < bluffChance;

        // Pot-committed: if already invested >40% of starting chips, don't fold
        const invested = 200 - player.chips - (player.chips <= 0 ? 0 : 0);
        const potCommitted = player.currentBet > 0 && callAmount < player.chips * 0.3;

        // Adjusted strength with bluff
        const effectiveStrength = isBluffing ? Math.max(strength, 0.3 + Math.random() * 0.3) : strength;

        if (effectiveStrength < playThreshold && !potCommitted) {
            // Weak hand, fold (unless free check)
            if (callAmount === 0) return { action: 'check' };
            // Still give a chance to call with marginal hands
            if (callAmount <= this.blinds.big && Math.random() < 0.4) {
                return { action: 'call' };
            }
            return { action: 'fold' };
        }

        if (callAmount === 0) {
            // Free check/raise — be more aggressive
            if (effectiveStrength > 0.4 || (isBluffing && Math.random() < p.aggression)) {
                const raiseAmount = Math.min(
                    Math.floor(this.pot * (0.4 + p.aggression * 0.8)),
                    player.chips
                );
                if (raiseAmount >= this.blinds.big) {
                    return { action: 'raise', amount: raiseAmount };
                }
            }
            // Medium hands — occasional small raise
            if (effectiveStrength > 0.25 && Math.random() < p.aggression * 0.5) {
                return { action: 'raise', amount: Math.min(this.blinds.big * 2, player.chips) };
            }
            return { action: 'check' };
        }

        // Must call or raise
        // Strong hand — raise
        if (effectiveStrength > 0.45 + (1 - p.aggression) * 0.2) {
            const raiseMultiplier = 0.4 + p.aggression * 0.6;
            const raiseAmount = Math.min(
                Math.floor(callAmount + this.pot * raiseMultiplier),
                player.chips
            );
            return { action: 'raise', amount: raiseAmount };
        }

        // Medium-strength or pot committed — call
        if (effectiveStrength > playThreshold || potOdds < effectiveStrength || potCommitted) {
            return { action: 'call' };
        }

        // Cheap call — likely call anyway
        if (callAmount <= this.blinds.big * 2 && Math.random() < 0.6) {
            return { action: 'call' };
        }

        if (callAmount === 0) return { action: 'check' };
        return { action: 'fold' };
    }

    // ======= EXECUTE ACTION =======
    executeAction(playerIndex, decision) {
        const player = this.players[playerIndex];
        if (player.folded || player.allIn) return;

        switch (decision.action) {
            case 'fold':
                player.folded = true;
                this.lastAction = { playerId: player.id, action: 'fold', amount: 0 };
                this.onGameLog(`  ${player.emoji} ${player.name}: FOLD`);
                this.onAction(player, 'fold', 0);
                break;

            case 'check':
                this.lastAction = { playerId: player.id, action: 'check', amount: 0 };
                this.onGameLog(`  ${player.emoji} ${player.name}: CHECK`);
                this.onAction(player, 'check', 0);
                break;

            case 'call': {
                const callAmount = Math.min(this.currentBet - player.currentBet, player.chips);
                player.chips -= callAmount;
                player.currentBet += callAmount;
                this.pot += callAmount;
                if (player.chips === 0) player.allIn = true;
                this.lastAction = { playerId: player.id, action: 'call', amount: callAmount };
                this.onGameLog(`  ${player.emoji} ${player.name}: CALL ${callAmount}`);
                this.onAction(player, 'call', callAmount);
                break;
            }

            case 'raise': {
                const raiseTotal = Math.min(decision.amount, player.chips);
                const additional = raiseTotal;
                player.chips -= additional;
                player.currentBet += additional;
                this.pot += additional;
                this.currentBet = player.currentBet;
                if (player.chips === 0) player.allIn = true;
                // Reset acted set since there's a raise
                this.actedThisRound.clear();
                this.lastAction = { playerId: player.id, action: 'raise', amount: additional };
                this.onGameLog(`  ${player.emoji} ${player.name}: RAISE ${additional} (Total bet: ${player.currentBet})`);
                this.onAction(player, 'raise', additional);
                break;
            }
        }

        this.actedThisRound.add(player.id);
    }

    // ======= GAME STEP (called on timer or manual) =======
    step() {
        if (this.phase === 'waiting' || this.phase === 'finished') return;

        // Check if only 1 player left
        const active = this.activePlayers;
        if (active.length === 1) {
            this._awardPot(active[0]);
            this._endHand();
            return;
        }

        // Check if betting round is complete
        const needsAction = active.filter(p => !p.allIn && !this.actedThisRound.has(p.id));
        const allMatched = active.every(p => p.currentBet === this.currentBet || p.allIn);

        if (needsAction.length === 0 || (allMatched && this.actedThisRound.size >= active.filter(p => !p.allIn).length)) {
            // Move to next phase
            this._nextPhase();
            return;
        }

        // Current player acts
        const player = this.players[this.currentPlayerIndex];
        if (!player.folded && !player.allIn && player.chips > 0) {
            const decision = this.makeAIDecision(player);
            this.executeAction(this.currentPlayerIndex, decision);
        }

        // Move to next player
        this.currentPlayerIndex = this._nextActivePlayer(this.currentPlayerIndex);
        this.onUpdate();

        if (this.autoPlay) this._scheduleNextStep();
    }

    _nextPhase() {
        // Reset bets for new round
        this.players.forEach(p => p.currentBet = 0);
        this.currentBet = 0;
        this.actedThisRound.clear();

        switch (this.phase) {
            case 'preflop':
                this.communityCards.push(...this.deck.deal(3));
                this.phase = 'flop';
                this.onGameLog(`\n📋 FLOP: ${this.communityCards.map(c => c.rank + c.suit).join(' ')}`);
                break;
            case 'flop':
                this.communityCards.push(...this.deck.deal(1));
                this.phase = 'turn';
                this.onGameLog(`📋 TURN: ${this.communityCards[3].rank}${this.communityCards[3].suit}`);
                break;
            case 'turn':
                this.communityCards.push(...this.deck.deal(1));
                this.phase = 'river';
                this.onGameLog(`📋 RIVER: ${this.communityCards[4].rank}${this.communityCards[4].suit}`);
                break;
            case 'river':
                this._showdown();
                return;
        }

        // Evaluate hands for UI display (spectator mode)
        this._evaluateCurrentHands();

        // Set first player after dealer
        this.currentPlayerIndex = this._nextActivePlayer(this.dealerIndex);
        this.onPhaseChange(this.phase);
        this.onUpdate();

        // If all remaining players are all-in, just deal remaining cards
        if (this.allInOrFolded) {
            if (this.autoPlay) this._scheduleNextStep();
            return;
        }

        if (this.autoPlay) this._scheduleNextStep();
    }

    /** Evaluate all active players' hands for live display */
    _evaluateCurrentHands() {
        if (this.communityCards.length < 3) return;
        this.players.forEach(p => {
            if (!p.folded && p.holeCards.length === 2) {
                p._handResult = PokerHandEvaluator.evaluate(p.holeCards, this.communityCards);
            }
        });
    }

    // ======= SHOWDOWN =======
    _showdown() {
        this.phase = 'showdown';
        this.onGameLog('\n🏆 SHOWDOWN!');

        const contenders = this.activePlayers;
        let bestHand = null;
        let winner = null;

        contenders.forEach(p => {
            const result = PokerHandEvaluator.evaluate(p.holeCards, this.communityCards);
            p._handResult = result;
            this.onGameLog(`  ${p.emoji} ${p.name}: ${p.holeCards.map(c => c.rank + c.suit).join(' ')} → ${result.name}`);

            if (!bestHand || result.rank > bestHand.rank ||
                (result.rank === bestHand.rank && PokerHandEvaluator._compareKickers(result.kickers, bestHand.kickers) > 0)) {
                bestHand = result;
                winner = p;
            }
        });

        if (winner) {
            this._awardPot(winner);
        }

        this.onPhaseChange('showdown');
        this.onUpdate();

        // Auto deal next hand after delay
        if (this.autoPlay) {
            setTimeout(() => this._endHand(), this.stepDelay * 3);
        }
    }

    _awardPot(winner) {
        winner.chips += this.pot;
        winner.totalWon += this.pot;
        winner.handsWon++;
        this.onGameLog(`  🎉 ${winner.emoji} ${winner.name} WINS ${this.pot} chips!`);

        this.history.push({
            hand: this.handNumber,
            winner: winner.name,
            winnerId: winner.id,
            winnerEmoji: winner.emoji,
            amount: this.pot,
            handName: winner._handResult?.name || 'Win',
        });
    }

    _endHand() {
        // Remove busted players
        this.players.forEach(p => {
            if (p.chips <= 0) p.folded = true;
        });

        const alive = this.players.filter(p => p.chips > 0);
        if (alive.length < 2) {
            this.phase = 'finished';
            this.onGameLog(`\n🏆 GAME OVER! ${alive[0]?.name || 'Nobody'} wins the tournament!`);
            this.onHandComplete(this);
            this.onUpdate();
            return;
        }

        this.onHandComplete(this);
        this.onUpdate();

        if (this.autoPlay && this.isRunning) {
            setTimeout(() => this.startHand(), this.stepDelay * 2);
        }
    }

    // ======= CONTROL =======
    start() {
        if (this.players.length < 2) return;
        this.isRunning = true;
        this.startHand();
    }

    stop() {
        this.isRunning = false;
        clearTimeout(this._timer);
    }

    destroy() {
        this.stop();
        this.players = [];
        this.phase = 'finished';
    }

    _scheduleNextStep() {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            if (this.isRunning) this.step();
        }, this.stepDelay);
    }

    getState() {
        return {
            phase: this.phase,
            pot: this.pot,
            communityCards: [...this.communityCards],
            players: this.players.map(p => ({
                ...p,
                holeCards: [...p.holeCards],
            })),
            dealerIndex: this.dealerIndex,
            currentPlayerIndex: this.currentPlayerIndex,
            handNumber: this.handNumber,
            history: [...this.history],
            blinds: { ...this.blinds },
        };
    }
}

// ============ GLOBAL EXPORTS ============
window.PokerDeck = PokerDeck;
window.PokerHandEvaluator = PokerHandEvaluator;
window.PokerGame = PokerGame;
