/**
 * Billiards Engine v1.0 — 8-Ball Pool for PixelAgent City
 * 2D physics simulation with AI auto-play
 */

// ============ BALL PHYSICS ============
const BILLIARD_CONFIG = {
    tableW: 560,
    tableH: 300,
    ballRadius: 7,
    pocketRadius: 14,
    friction: 0.984,
    minSpeed: 0.15,
    maxPower: 12,
    cushionBounce: 0.75,
    ballBounce: 0.95,
    stepDelay: 2200,
};

const BILLIARD_COLORS = {
    1: '#f1c40f',  // Yellow
    2: '#2980b9',  // Blue
    3: '#e74c3c',  // Red
    4: '#8e44ad',  // Purple
    5: '#e67e22',  // Orange
    6: '#27ae60',  // Green
    7: '#922b21',  // Maroon
    8: '#1a1a1a',  // Black (8-ball)
    9: '#f1c40f',  // Yellow stripe
    10: '#2980b9', // Blue stripe
    11: '#e74c3c', // Red stripe
    12: '#8e44ad', // Purple stripe
    13: '#e67e22', // Orange stripe
    14: '#27ae60', // Green stripe
    15: '#922b21', // Maroon stripe
};

const BILLIARD_PERSONALITIES = {
    coder:      { accuracy: 0.75, power: 0.70, style: 'precise' },
    tester:     { accuracy: 0.85, power: 0.60, style: 'careful' },
    reviewer:   { accuracy: 0.70, power: 0.65, style: 'analytical' },
    designer:   { accuracy: 0.60, power: 0.80, style: 'creative' },
    devops:     { accuracy: 0.80, power: 0.75, style: 'stable' },
    researcher: { accuracy: 0.72, power: 0.65, style: 'thinking' },
    analyst:    { accuracy: 0.78, power: 0.68, style: 'calculated' },
    security:   { accuracy: 0.82, power: 0.70, style: 'defensive' },
    backend:    { accuracy: 0.76, power: 0.72, style: 'systematic' },
    mobile:     { accuracy: 0.68, power: 0.74, style: 'adaptive' },
    writer:     { accuracy: 0.62, power: 0.60, style: 'dramatic' },
};

function getBilliardPersonality(role) {
    return BILLIARD_PERSONALITIES[role] || BILLIARD_PERSONALITIES.coder;
}

// ============ BILLIARD GAME ============
class BilliardGame {
    constructor(options = {}) {
        this.stepDelay = options.stepDelay || BILLIARD_CONFIG.stepDelay;
        this.players = [];
        this.balls = [];
        this.pockets = [];
        this.phase = 'waiting'; // waiting, playing, shooting, settling, finished
        this.currentPlayerIndex = 0;
        this.isRunning = false;
        this.winner = null;
        this.history = [];
        this.turnNumber = 0;
        this.lastPocketed = [];
        this.foul = false;

        // Callbacks
        this.onUpdate = null;
        this.onPhaseChange = null;
        this.onBallPocketed = null;
        this.onTurnEnd = null;
        this.onGameComplete = null;
        this.onGameLog = null;

        this._animFrame = null;
        this._turnTimer = null;
        this._settled = true;
        this.aimData = null; // { angle, power, cueBall, targetBall, targetPocket }

        this.setupTable();
    }

    addPlayer(id, name, role, emoji, group = null) {
        this.players.push({
            id, name, role, emoji,
            group: group,  // 'solids' or 'stripes', assigned after first pocket
            pocketed: [],
            personality: getBilliardPersonality(role),
            fouls: 0,
            shotsTaken: 0,
        });
    }

    setupTable() {
        const W = BILLIARD_CONFIG.tableW;
        const H = BILLIARD_CONFIG.tableH;
        const pr = BILLIARD_CONFIG.pocketRadius;

        // 6 pockets
        this.pockets = [
            { x: pr / 2, y: pr / 2 },       // top-left
            { x: W / 2, y: -2 },             // top-center
            { x: W - pr / 2, y: pr / 2 },    // top-right
            { x: pr / 2, y: H - pr / 2 },    // bottom-left
            { x: W / 2, y: H + 2 },          // bottom-center
            { x: W - pr / 2, y: H - pr / 2 },// bottom-right
        ];

        this.setupBalls();
    }

    setupBalls() {
        const W = BILLIARD_CONFIG.tableW;
        const H = BILLIARD_CONFIG.tableH;
        const r = BILLIARD_CONFIG.ballRadius;

        this.balls = [];

        // Cue ball
        this.balls.push({
            id: 0, x: W * 0.25, y: H / 2,
            vx: 0, vy: 0,
            radius: r, color: '#ffffff',
            number: 0, type: 'cue',
            pocketed: false,
        });

        // Rack arrangement (triangle at 3/4 of table)
        const rackX = W * 0.72;
        const rackY = H / 2;
        const spacing = r * 2.15;

        // Standard 8-ball rack order (8 in center)
        const rackOrder = [1, 9, 2, 10, 8, 11, 3, 12, 6, 14, 4, 13, 7, 15, 5];
        let idx = 0;

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                if (idx >= rackOrder.length) break;
                const num = rackOrder[idx];
                const bx = rackX + row * spacing * 0.866;
                const by = rackY + (col - row / 2) * spacing;

                this.balls.push({
                    id: num, x: bx, y: by,
                    vx: 0, vy: 0,
                    radius: r,
                    color: BILLIARD_COLORS[num],
                    number: num,
                    type: num === 8 ? 'eight' : (num <= 7 ? 'solid' : 'stripe'),
                    pocketed: false,
                    stripe: num > 8,
                });
                idx++;
            }
        }
    }

    start() {
        if (this.players.length < 2) return;
        this.phase = 'playing';
        this.isRunning = true;
        this.currentPlayerIndex = 0;
        this._setPhase('playing');
        this._log(`🎱 Trận billiard bắt đầu! ${this.players[0].name} vs ${this.players[1].name}`);

        // Start animation loop
        this._startPhysics();

        // Auto-play first shot after delay
        this._scheduleTurn();
    }

    stop() {
        this.isRunning = false;
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
        clearTimeout(this._turnTimer);
    }

    _setPhase(phase) {
        this.phase = phase;
        if (this.onPhaseChange) this.onPhaseChange(phase);
    }

    _log(msg) {
        if (this.onGameLog) this.onGameLog(msg);
    }

    getState() {
        return {
            players: this.players,
            balls: this.balls.filter(b => !b.pocketed),
            allBalls: this.balls,
            pockets: this.pockets,
            phase: this.phase,
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayer: this.players[this.currentPlayerIndex],
            winner: this.winner,
            turnNumber: this.turnNumber,
            lastPocketed: this.lastPocketed,
            foul: this.foul,
            tableW: BILLIARD_CONFIG.tableW,
            tableH: BILLIARD_CONFIG.tableH,
            aimData: this.aimData,
        };
    }

    // ============ PHYSICS LOOP ============
    _startPhysics() {
        const step = () => {
            if (!this.isRunning) return;
            this._physicsStep();
            if (this.onUpdate) this.onUpdate();
            this._animFrame = requestAnimationFrame(step);
        };
        this._animFrame = requestAnimationFrame(step);
    }

    _physicsStep() {
        const cfg = BILLIARD_CONFIG;
        let anyMoving = false;

        for (const ball of this.balls) {
            if (ball.pocketed) continue;

            // Apply velocity
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Friction
            ball.vx *= cfg.friction;
            ball.vy *= cfg.friction;

            // Stop very slow balls
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed < cfg.minSpeed) {
                ball.vx = 0;
                ball.vy = 0;
            } else {
                anyMoving = true;
            }

            // Wall collisions (cushion bounce)
            const margin = cfg.pocketRadius * 1.2;
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
                ball.vx = Math.abs(ball.vx) * cfg.cushionBounce;
            }
            if (ball.x + ball.radius > cfg.tableW) {
                ball.x = cfg.tableW - ball.radius;
                ball.vx = -Math.abs(ball.vx) * cfg.cushionBounce;
            }
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius;
                ball.vy = Math.abs(ball.vy) * cfg.cushionBounce;
            }
            if (ball.y + ball.radius > cfg.tableH) {
                ball.y = cfg.tableH - ball.radius;
                ball.vy = -Math.abs(ball.vy) * cfg.cushionBounce;
            }

            // Pocket detection
            for (const pocket of this.pockets) {
                const dx = ball.x - pocket.x;
                const dy = ball.y - pocket.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < cfg.pocketRadius) {
                    ball.pocketed = true;
                    ball.vx = 0;
                    ball.vy = 0;
                    this._onBallPocketed(ball);
                    break;
                }
            }
        }

        // Ball-ball collisions
        const activeBalls = this.balls.filter(b => !b.pocketed);
        for (let i = 0; i < activeBalls.length; i++) {
            for (let j = i + 1; j < activeBalls.length; j++) {
                this._resolveCollision(activeBalls[i], activeBalls[j]);
            }
        }

        // Check if all balls settled
        if (this.phase === 'shooting' && !anyMoving && this._settled === false) {
            this._settled = true;
            this._onShotSettled();
        }
    }

    _resolveCollision(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;

        if (dist < minDist && dist > 0) {
            // Normalize
            const nx = dx / dist;
            const ny = dy / dist;

            // Relative velocity
            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvn = dvx * nx + dvy * ny;

            // Don't resolve if separating
            if (dvn <= 0) return;

            const bounce = BILLIARD_CONFIG.ballBounce;

            // Update velocities (equal mass)
            a.vx -= dvn * nx * bounce;
            a.vy -= dvn * ny * bounce;
            b.vx += dvn * nx * bounce;
            b.vy += dvn * ny * bounce;

            // Separate overlapping balls
            const overlap = minDist - dist;
            a.x -= overlap * nx * 0.5;
            a.y -= overlap * ny * 0.5;
            b.x += overlap * nx * 0.5;
            b.y += overlap * ny * 0.5;
        }
    }

    _onBallPocketed(ball) {
        const player = this.players[this.currentPlayerIndex];

        if (ball.type === 'cue') {
            // Foul: cue ball pocketed
            this.foul = true;
            this._log(`❌ ${player.name}: Phạm lỗi! Bỏ bi trắng!`);
            // Respawn cue ball
            setTimeout(() => {
                ball.pocketed = false;
                ball.x = BILLIARD_CONFIG.tableW * 0.25;
                ball.y = BILLIARD_CONFIG.tableH / 2;
                ball.vx = 0;
                ball.vy = 0;
            }, 600);
            return;
        }

        this.lastPocketed.push(ball);

        if (ball.type === 'eight') {
            // 8-ball pocketed — check win/lose
            const playerBalls = player.group === 'solids'
                ? this.balls.filter(b => b.type === 'solid' && b.pocketed)
                : this.balls.filter(b => b.type === 'stripe' && b.pocketed);

            const neededCount = 7;
            if (playerBalls.length >= neededCount) {
                // Win!
                this.winner = player;
                this._log(`🏆 ${player.name} bỏ 8-ball → THẮNG!`);
            } else {
                // Lose — pocketed 8-ball too early
                const otherIdx = this.currentPlayerIndex === 0 ? 1 : 0;
                this.winner = this.players[otherIdx];
                this._log(`💀 ${player.name} bỏ 8-ball quá sớm → THUA!`);
            }
            return;
        }

        // Assign groups if not assigned yet
        if (!this.players[0].group) {
            if (ball.type === 'solid') {
                this.players[this.currentPlayerIndex].group = 'solids';
                this.players[this.currentPlayerIndex === 0 ? 1 : 0].group = 'stripes';
            } else {
                this.players[this.currentPlayerIndex].group = 'stripes';
                this.players[this.currentPlayerIndex === 0 ? 1 : 0].group = 'solids';
            }
            this._log(`🎱 ${this.players[0].name}: ${this.players[0].group === 'solids' ? 'Bi Trơn (1-7)' : 'Bi Sọc (9-15)'}`);
            this._log(`🎱 ${this.players[1].name}: ${this.players[1].group === 'solids' ? 'Bi Trơn (1-7)' : 'Bi Sọc (9-15)'}`);
        }

        player.pocketed.push(ball.number);
        const ballLabel = ball.stripe ? `Sọc #${ball.number}` : `Trơn #${ball.number}`;
        this._log(`🎱 ${player.name}: Bỏ bi ${ballLabel}!`);

        if (this.onBallPocketed) this.onBallPocketed(ball, player);
    }

    _onShotSettled() {
        if (!this.isRunning) return;

        // Check for game over
        if (this.winner) {
            this._endGame();
            return;
        }

        const player = this.players[this.currentPlayerIndex];
        const pocketedThisTurn = this.lastPocketed;

        // Check if player pocketed their own ball (gets another turn)
        let ownBallPocketed = false;
        if (player.group) {
            const targetType = player.group === 'solids' ? 'solid' : 'stripe';
            ownBallPocketed = pocketedThisTurn.some(b => b.type === targetType);
        } else {
            ownBallPocketed = pocketedThisTurn.length > 0 && pocketedThisTurn.every(b => b.type !== 'cue');
        }

        if (this.foul || !ownBallPocketed) {
            // Switch player
            this.currentPlayerIndex = this.currentPlayerIndex === 0 ? 1 : 0;
        } else if (ownBallPocketed) {
            this._log(`🔄 ${player.name} bỏ bi đúng → Được đánh tiếp!`);
        }

        this.foul = false;
        this.lastPocketed = [];

        if (this.onTurnEnd) this.onTurnEnd();

        // Schedule next turn
        this._scheduleTurn();
    }

    _scheduleTurn() {
        clearTimeout(this._turnTimer);
        if (!this.isRunning || this.phase === 'finished') return;

        const player = this.players[this.currentPlayerIndex];
        this._setPhase('playing');
        this._log(`🎯 Lượt ${player.name} (${player.emoji})`);

        // Compute aim first, then show aiming arrow, then shoot
        this._turnTimer = setTimeout(() => {
            if (!this.isRunning) return;
            this._aiAim(player);
        }, this.stepDelay * 0.5);
    }

    // ============ AI AIMING (show arrow) ============
    _aiAim(player) {
        const cueBall = this.balls.find(b => b.type === 'cue' && !b.pocketed);
        if (!cueBall) return;

        const personality = player.personality;
        const targetBall = this._findBestTarget(player, cueBall);

        let angle, power;

        if (targetBall) {
            const bestPocket = this._findBestPocket(targetBall);
            const dx_tp = bestPocket.x - targetBall.x;
            const dy_tp = bestPocket.y - targetBall.y;
            const dist_tp = Math.sqrt(dx_tp * dx_tp + dy_tp * dy_tp);
            const contactX = targetBall.x - (dx_tp / dist_tp) * (BILLIARD_CONFIG.ballRadius * 2);
            const contactY = targetBall.y - (dy_tp / dist_tp) * (BILLIARD_CONFIG.ballRadius * 2);
            angle = Math.atan2(contactY - cueBall.y, contactX - cueBall.x);
            const errorRange = (1 - personality.accuracy) * 0.5;
            angle += (Math.random() - 0.5) * errorRange;
            const dist = Math.sqrt((contactX - cueBall.x) ** 2 + (contactY - cueBall.y) ** 2);
            power = Math.min(BILLIARD_CONFIG.maxPower, (dist / 80) * personality.power * BILLIARD_CONFIG.maxPower * (0.6 + Math.random() * 0.4));
            power = Math.max(3, power);

            this.aimData = { angle, power, cueBallX: cueBall.x, cueBallY: cueBall.y, targetBall, targetPocket: bestPocket };
        } else {
            angle = Math.random() * Math.PI * 2;
            power = 3 + Math.random() * 4;
            this.aimData = { angle, power, cueBallX: cueBall.x, cueBallY: cueBall.y, targetBall: null, targetPocket: null };
        }

        this._setPhase('aiming');
        if (this.onUpdate) this.onUpdate();

        // After showing aim for a moment, execute the shot
        this._turnTimer = setTimeout(() => {
            if (!this.isRunning) return;
            this._executeShot(player, cueBall, angle, power);
        }, this.stepDelay * 0.5);
    }

    // ============ AI SHOOTING ============
    _executeShot(player, cueBall, angle, power) {
        player.shotsTaken++;
        this.turnNumber++;

        // Execute shot
        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
        this._settled = false;
        this.aimData = null;
        this._setPhase('shooting');

        const shotNames = ['nhẹ nhàng', 'chính xác', 'mạnh mẽ', 'tinh tế', 'táo bạo'];
        this._log(`🏌️ ${player.name} đánh ${shotNames[Math.floor(Math.random() * shotNames.length)]}!`);
    }

    _findBestTarget(player, cueBall) {
        let targetType = null;

        if (player.group === 'solids') targetType = 'solid';
        else if (player.group === 'stripes') targetType = 'stripe';

        // Check if all own balls pocketed → target 8-ball
        if (player.group) {
            const ownRemaining = this.balls.filter(b =>
                !b.pocketed && b.type === targetType
            );
            if (ownRemaining.length === 0) {
                const eightBall = this.balls.find(b => b.type === 'eight' && !b.pocketed);
                return eightBall || null;
            }
        }

        // Find closest valid target
        const validBalls = this.balls.filter(b => {
            if (b.pocketed || b.type === 'cue') return false;
            if (!targetType) return b.type !== 'eight'; // before assignment, any non-8
            return b.type === targetType;
        });

        if (validBalls.length === 0) {
            // Fallback: any ball
            return this.balls.find(b => !b.pocketed && b.type !== 'cue') || null;
        }

        // Sort by distance to cue ball
        validBalls.sort((a, b) => {
            const da = (a.x - cueBall.x) ** 2 + (a.y - cueBall.y) ** 2;
            const db = (b.x - cueBall.x) ** 2 + (b.y - cueBall.y) ** 2;
            return da - db;
        });

        // Pick one of the closest (some randomness for variety)
        const pickIdx = Math.floor(Math.random() * Math.min(3, validBalls.length));
        return validBalls[pickIdx];
    }

    _findBestPocket(ball) {
        let best = null;
        let bestDist = Infinity;

        for (const pocket of this.pockets) {
            const dx = pocket.x - ball.x;
            const dy = pocket.y - ball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                bestDist = dist;
                best = pocket;
            }
        }
        return best;
    }

    _endGame() {
        this._setPhase('finished');
        this.isRunning = false;
        clearTimeout(this._turnTimer);

        const winner = this.winner;
        const loser = this.players.find(p => p.id !== winner.id);

        this.history.push({
            winner: winner.name,
            winnerId: winner.id,
            winnerEmoji: winner.emoji,
            loser: loser.name,
            loserId: loser.id,
            turns: this.turnNumber,
            winnerPocketed: winner.pocketed.length,
        });

        this._log(`🏆 ${winner.name} THẮNG trận billiard! (${this.turnNumber} lượt)`);

        if (this.onGameComplete) this.onGameComplete(this);
    }

    reset() {
        this.balls = [];
        this.phase = 'waiting';
        this.currentPlayerIndex = 0;
        this.winner = null;
        this.turnNumber = 0;
        this.lastPocketed = [];
        this.foul = false;
        this._settled = true;
        this.aimData = null;
        this.players.forEach(p => {
            p.pocketed = [];
            p.group = null;
            p.fouls = 0;
            p.shotsTaken = 0;
        });
        this.setupBalls();
    }
}

// ============ GLOBAL EXPORT ============
window.BilliardGame = BilliardGame;
window.BILLIARD_CONFIG = BILLIARD_CONFIG;
window.BILLIARD_COLORS = BILLIARD_COLORS;
