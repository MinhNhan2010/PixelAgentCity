/**
 * Road Racer - PixelAgent City
 * Dodge obstacles on the road! Pixel art canvas game.
 */
class RoadRacer {
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = canvas.width;
        this.H = canvas.height;

        // Car
        this.car = { x: this.W / 2 - 10, y: this.H - 50, w: 20, h: 30, lane: 1, targetX: 0 };
        this.lanes = [this.W * 0.22, this.W * 0.42, this.W * 0.62];
        this.car.lane = 1;
        this.car.x = this.lanes[1] - this.car.w / 2;
        this.car.targetX = this.car.x;

        // Road
        this.roadLeft = this.W * 0.12;
        this.roadRight = this.W * 0.88;
        this.roadScroll = 0;
        this.roadSpeed = 3;
        this.maxSpeed = 7;

        // Obstacles
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 70;
        this.minSpawnInterval = 28;

        // Coins on road
        this.roadCoins = [];
        this.coinTimer = 0;

        // State
        this.score = 0;
        this.highScore = 0;
        this.phase = 'idle'; // idle | playing | dead
        this.deathTimer = 0;
        this.frameCount = 0;
        this.particles = [];
        this.distance = 0;

        // Bet
        this.betOptions = [10, 25, 50, 100];
        this.currentBet = 10;

        // Stats
        this.totalGames = 0;
        this.totalWon = 0;
        this.totalLost = 0;
        this.history = [];
        this.coinsCollected = 0;

        // Callbacks
        this.onScoreChange = null;
        this.onGameOver = null;

        // Load high score
        try { this.highScore = parseInt(localStorage.getItem('roadRacerHigh') || '0'); } catch(e) {}
    }

    setBet(amount) {
        if (this.phase === 'playing') return;
        if (this.betOptions.indexOf(amount) !== -1) this.currentBet = amount;
    }

    start() {
        if (this.phase === 'playing') return;
        this.phase = 'playing';
        this.score = 0;
        this.distance = 0;
        this.frameCount = 0;
        this.obstacles = [];
        this.roadCoins = [];
        this.particles = [];
        this.spawnTimer = 40;
        this.coinTimer = 0;
        this.roadSpeed = 3;
        this.spawnInterval = 70;
        this.coinsCollected = 0;
        this.car.lane = 1;
        this.car.x = this.lanes[1] - this.car.w / 2;
        this.car.targetX = this.car.x;
        this.car.y = this.H - 50;
        this.deathTimer = 0;
        this.totalGames++;
    }

    moveLeft() {
        if (this.phase !== 'playing') return;
        if (this.car.lane > 0) {
            this.car.lane--;
            this.car.targetX = this.lanes[this.car.lane] - this.car.w / 2;
        }
    }

    moveRight() {
        if (this.phase !== 'playing') return;
        if (this.car.lane < 2) {
            this.car.lane++;
            this.car.targetX = this.lanes[this.car.lane] - this.car.w / 2;
        }
    }

    tick() {
        if (this.phase === 'dead') {
            this.deathTimer++;
            this._updateParticles();
            return;
        }
        if (this.phase !== 'playing') return;

        this.frameCount++;
        this.distance += this.roadSpeed;

        // Score every 60 frames
        if (this.frameCount % 30 === 0) {
            this.score++;
            if (this.onScoreChange) this.onScoreChange(this.score);
            this._adjustDifficulty();
        }

        // Smooth car movement
        var dx = this.car.targetX - this.car.x;
        this.car.x += dx * 0.25;

        // Road scroll
        this.roadScroll = (this.roadScroll + this.roadSpeed) % 16;

        // Spawn obstacles
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this._spawnObstacle();
            this.spawnTimer = this.spawnInterval + Math.floor(Math.random() * 20);
        }

        // Spawn coins
        this.coinTimer--;
        if (this.coinTimer <= 0) {
            this._spawnCoin();
            this.coinTimer = 90 + Math.floor(Math.random() * 60);
        }

        // Move obstacles
        for (var i = this.obstacles.length - 1; i >= 0; i--) {
            var o = this.obstacles[i];
            o.y += this.roadSpeed;
            if (o.y > this.H + 40) { this.obstacles.splice(i, 1); continue; }
            // Collision
            if (this._boxCollide(this.car, o)) { this._die(); return; }
        }

        // Move coins
        for (var ci = this.roadCoins.length - 1; ci >= 0; ci--) {
            var c = this.roadCoins[ci];
            c.y += this.roadSpeed;
            c.anim = (c.anim || 0) + 0.1;
            if (c.y > this.H + 20) { this.roadCoins.splice(ci, 1); continue; }
            if (this._boxCollide(this.car, { x: c.x, y: c.y, w: 10, h: 10 })) {
                this.coinsCollected++;
                this.score += 2;
                if (this.onScoreChange) this.onScoreChange(this.score);
                // Sparkle
                for (var sp = 0; sp < 5; sp++) {
                    this.particles.push({
                        x: c.x + 5, y: c.y + 5,
                        vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                        life: 15, maxLife: 15, size: 2, color: '#ffd93d'
                    });
                }
                this.roadCoins.splice(ci, 1);
            }
        }

        this._updateParticles();

        // Exhaust particles
        if (this.frameCount % 4 === 0) {
            this.particles.push({
                x: this.car.x + this.car.w / 2 - 1 + (Math.random() - 0.5) * 4,
                y: this.car.y + this.car.h + 2,
                vx: (Math.random() - 0.5) * 0.5, vy: 1 + Math.random(),
                life: 10, maxLife: 10, size: 2 + Math.random(), color: '#888'
            });
        }
    }

    _spawnObstacle() {
        var lane = Math.floor(Math.random() * 3);
        var types = ['car_red', 'car_blue', 'car_yellow', 'truck', 'cone', 'barrel'];
        var type = types[Math.floor(Math.random() * types.length)];
        var w = type === 'truck' ? 22 : type === 'cone' || type === 'barrel' ? 12 : 18;
        var h = type === 'truck' ? 38 : type === 'cone' || type === 'barrel' ? 12 : 28;
        this.obstacles.push({
            x: this.lanes[lane] - w / 2,
            y: -h - 10,
            w: w, h: h,
            type: type, lane: lane
        });
    }

    _spawnCoin() {
        var lane = Math.floor(Math.random() * 3);
        this.roadCoins.push({
            x: this.lanes[lane] - 5, y: -15, w: 10, h: 10, anim: 0
        });
    }

    _adjustDifficulty() {
        if (this.score % 8 === 0 && this.roadSpeed < this.maxSpeed) this.roadSpeed += 0.15;
        if (this.score % 10 === 0 && this.spawnInterval > this.minSpawnInterval) this.spawnInterval -= 3;
    }

    _boxCollide(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    _die() {
        this.phase = 'dead';
        this.deathTimer = 0;
        // Explosion
        for (var i = 0; i < 20; i++) {
            var ang = Math.random() * Math.PI * 2;
            var spd = 1 + Math.random() * 3;
            this.particles.push({
                x: this.car.x + this.car.w / 2, y: this.car.y + this.car.h / 2,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                life: 20 + Math.random() * 20, maxLife: 40,
                size: 2 + Math.random() * 4,
                color: ['#ff6b6b', '#ffd93d', '#ff9f43', '#fff'][Math.floor(Math.random() * 4)]
            });
        }

        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('roadRacerHigh', String(this.highScore)); } catch(e) {}
        }

        // Payout
        var payout = 0, winName = '', win = false;
        if (this.score >= 80) {
            payout = this.currentBet * 8; winName = '🏆 LEGEND! +' + payout + 'Ⓒ'; win = true;
        } else if (this.score >= 50) {
            payout = this.currentBet * 5; winName = '⭐ ACE DRIVER! +' + payout + 'Ⓒ'; win = true;
        } else if (this.score >= 30) {
            payout = this.currentBet * 3; winName = '🏎️ Pro Racer! +' + payout + 'Ⓒ'; win = true;
        } else if (this.score >= 20) {
            payout = this.currentBet * 2; winName = '🚗 Tốt lắm! +' + payout + 'Ⓒ'; win = true;
        } else if (this.score >= 10) {
            payout = Math.floor(this.currentBet * 1.2); winName = '👍 Khá ổn! +' + payout + 'Ⓒ'; win = payout > this.currentBet;
        } else {
            winName = '💥 Tai nạn! -' + this.currentBet + 'Ⓒ';
        }

        if (win) this.totalWon += payout; else this.totalLost += this.currentBet;

        var result = {
            score: this.score, highScore: this.highScore, bet: this.currentBet,
            payout: payout, win: win, name: winName,
            coinsCollected: this.coinsCollected
        };
        this.history.unshift(result);
        if (this.history.length > 10) this.history.pop();
        if (this.onGameOver) this.onGameOver(result);
    }

    _updateParticles() {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    // ===================== RENDERING =====================
    render() {
        var ctx = this.ctx, W = this.W, H = this.H;
        ctx.clearRect(0, 0, W, H);

        // Grass
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#234d1f';
        for (var gy = -16 + (this.roadScroll * 2 % 16); gy < H; gy += 16) {
            ctx.fillRect(0, gy, this.roadLeft - 4, 2);
            ctx.fillRect(this.roadRight + 4, gy, W, 2);
        }

        // Road
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(this.roadLeft, 0, this.roadRight - this.roadLeft, H);

        // Road edges
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.roadLeft, 0, 3, H);
        ctx.fillRect(this.roadRight - 3, 0, 3, H);

        // Lane dashes
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        var dashH = 20, dashGap = 16;
        for (var d = -dashH + (this.roadScroll * 2 % (dashH + dashGap)); d < H; d += dashH + dashGap) {
            ctx.fillRect(this.lanes[0] + (this.lanes[1] - this.lanes[0]) / 2 - 1, d, 2, dashH);
            ctx.fillRect(this.lanes[1] + (this.lanes[2] - this.lanes[1]) / 2 - 1, d, 2, dashH);
        }

        // Roadside trees
        this._drawTrees(ctx, W, H);

        // Road coins
        for (var ci = 0; ci < this.roadCoins.length; ci++) {
            var c = this.roadCoins[ci];
            var cs = Math.sin(c.anim) * 2;
            ctx.fillStyle = '#ffd93d';
            ctx.fillRect(c.x + 1 + cs * 0.3, c.y + 1, 8, 8);
            ctx.fillStyle = '#f0c420';
            ctx.fillRect(c.x + 3 + cs * 0.3, c.y + 3, 4, 4);
        }

        // Obstacles
        for (var oi = 0; oi < this.obstacles.length; oi++) {
            this._drawObstacle(ctx, this.obstacles[oi]);
        }

        // Particles
        for (var pi = 0; pi < this.particles.length; pi++) {
            var p = this.particles[pi];
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
        }
        ctx.globalAlpha = 1;

        // Player car
        if (this.phase !== 'dead' || this.deathTimer < 10) {
            this._drawPlayerCar(ctx);
        }

        // Score
        this._drawHUD(ctx, W);

        // Idle screen
        if (this.phase === 'idle') this._drawIdleScreen(ctx, W, H);
        // Dead screen
        if (this.phase === 'dead' && this.deathTimer > 30) this._drawDeadScreen(ctx, W, H);
    }

    _drawTrees(ctx, W, H) {
        ctx.fillStyle = '#1a4d14';
        var treeScroll = (this.roadScroll * 1.5) % 60;
        for (var ty = -30 + treeScroll; ty < H + 30; ty += 60) {
            // Left trees
            ctx.fillRect(4, ty, 8, 12);
            ctx.fillStyle = '#2d7a23';
            ctx.fillRect(2, ty - 6, 12, 8);
            ctx.fillStyle = '#1a4d14';
            // Right trees
            ctx.fillRect(W - 12, ty + 20, 8, 12);
            ctx.fillStyle = '#2d7a23';
            ctx.fillRect(W - 14, ty + 14, 12, 8);
            ctx.fillStyle = '#1a4d14';
        }
    }

    _drawObstacle(ctx, o) {
        var x = Math.floor(o.x), y = Math.floor(o.y);
        switch (o.type) {
            case 'car_red':
                ctx.fillStyle = '#e74c3c'; ctx.fillRect(x, y, o.w, o.h);
                ctx.fillStyle = '#c0392b'; ctx.fillRect(x + 2, y + 2, o.w - 4, 8);
                ctx.fillStyle = '#85c1e9'; ctx.fillRect(x + 3, y + 4, o.w - 6, 4);
                ctx.fillStyle = '#f5b041'; ctx.fillRect(x + 2, y + o.h - 4, 4, 3);
                ctx.fillRect(x + o.w - 6, y + o.h - 4, 4, 3);
                break;
            case 'car_blue':
                ctx.fillStyle = '#3498db'; ctx.fillRect(x, y, o.w, o.h);
                ctx.fillStyle = '#2980b9'; ctx.fillRect(x + 2, y + 2, o.w - 4, 8);
                ctx.fillStyle = '#aed6f1'; ctx.fillRect(x + 3, y + 4, o.w - 6, 4);
                ctx.fillStyle = '#f5b041'; ctx.fillRect(x + 2, y + o.h - 4, 4, 3);
                ctx.fillRect(x + o.w - 6, y + o.h - 4, 4, 3);
                break;
            case 'car_yellow':
                ctx.fillStyle = '#f1c40f'; ctx.fillRect(x, y, o.w, o.h);
                ctx.fillStyle = '#d4ac0d'; ctx.fillRect(x + 2, y + 2, o.w - 4, 8);
                ctx.fillStyle = '#fef9e7'; ctx.fillRect(x + 3, y + 4, o.w - 6, 4);
                break;
            case 'truck':
                ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x, y, o.w, o.h);
                ctx.fillStyle = '#95a5a6'; ctx.fillRect(x + 1, y + 1, o.w - 2, 10);
                ctx.fillStyle = '#e74c3c'; ctx.fillRect(x, y + o.h - 10, o.w, 10);
                ctx.fillStyle = '#c0392b'; ctx.fillRect(x + 2, y + o.h - 8, o.w - 4, 6);
                break;
            case 'cone':
                ctx.fillStyle = '#e67e22'; ctx.fillRect(x + 2, y, 8, 10);
                ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 3, 6, 2);
                ctx.fillStyle = '#d35400'; ctx.fillRect(x, y + 8, 12, 4);
                break;
            case 'barrel':
                ctx.fillStyle = '#8B4513'; ctx.fillRect(x, y, 12, 12);
                ctx.fillStyle = '#A0522D'; ctx.fillRect(x + 1, y + 1, 10, 10);
                ctx.fillStyle = '#DAA520'; ctx.fillRect(x + 2, y + 3, 8, 2);
                ctx.fillRect(x + 2, y + 7, 8, 2);
                break;
        }
    }

    _drawPlayerCar(ctx) {
        var x = Math.floor(this.car.x), y = Math.floor(this.car.y);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + 2, y + 2, this.car.w, this.car.h);
        // Body
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x, y, this.car.w, this.car.h);
        // Roof
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(x + 3, y + 6, this.car.w - 6, 12);
        // Windshield
        ctx.fillStyle = '#85c1e9';
        ctx.fillRect(x + 4, y + 3, this.car.w - 8, 5);
        // Rear window
        ctx.fillStyle = '#5dade2';
        ctx.fillRect(x + 5, y + 18, this.car.w - 10, 4);
        // Headlights
        ctx.fillStyle = '#ffd93d';
        ctx.fillRect(x + 2, y, 4, 3);
        ctx.fillRect(x + this.car.w - 6, y, 4, 3);
        // Taillights
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 1, y + this.car.h - 3, 4, 3);
        ctx.fillRect(x + this.car.w - 5, y + this.car.h - 3, 4, 3);
        // Racing stripe
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + this.car.w / 2 - 1, y, 2, this.car.h);
    }

    _drawHUD(ctx, W) {
        if (this.phase === 'playing' || this.phase === 'dead') {
            ctx.font = 'bold 18px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(String(this.score), W / 2 + 1, 26);
            ctx.fillStyle = '#fff';
            ctx.fillText(String(this.score), W / 2, 25);

            ctx.font = '7px "Press Start 2P", monospace';
            ctx.fillStyle = 'rgba(255,215,80,0.7)';
            ctx.fillText('BEST: ' + this.highScore, W / 2, 38);
        }
    }

    _drawIdleScreen(ctx, W, H) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';

        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('ROAD', W / 2, H / 2 - 30);
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('RACER', W / 2, H / 2 - 14);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#fff';
        var blink = Math.floor(Date.now() / 500) % 2;
        if (blink) ctx.fillText('< > TO DRIVE!', W / 2, H / 2 + 10);

        if (this.highScore > 0) {
            ctx.fillStyle = 'rgba(255,215,80,0.8)';
            ctx.fillText('BEST: ' + this.highScore, W / 2, H / 2 + 28);
        }
        ctx.font = '20px sans-serif';
        ctx.fillText('🏎️', W / 2, H / 2 + 52);
    }

    _drawDeadScreen(ctx, W, H) {
        var alpha = Math.min(1, (this.deathTimer - 30) / 20);
        ctx.fillStyle = 'rgba(0,0,0,' + (alpha * 0.5) + ')';
        ctx.fillRect(0, 0, W, H);
        if (alpha < 0.5) return;
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('CRASH!', W / 2, H / 2 - 20);
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffd93d';
        ctx.fillText('Score: ' + this.score, W / 2, H / 2 + 2);
        if (this.score === this.highScore && this.score > 0) {
            ctx.fillStyle = '#4ecdc4';
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillText('NEW BEST!', W / 2, H / 2 + 16);
        }
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        if (Math.floor(Date.now() / 600) % 2) ctx.fillText('TAP TO RETRY', W / 2, H / 2 + 34);
    }

    getStats() {
        var wc = 0;
        for (var i = 0; i < Math.min(this.history.length, 10); i++) { if (this.history[i].win) wc++; }
        return {
            totalGames: this.totalGames, totalWon: this.totalWon, totalLost: this.totalLost,
            netProfit: this.totalWon - this.totalLost, highScore: this.highScore,
            winRate: this.totalGames > 0 ? ((wc / Math.min(this.history.length || 1, 10)) * 100).toFixed(0) : 0
        };
    }

    destroy() {
        this.phase = 'idle';
    }
}

window.RoadRacer = RoadRacer;
